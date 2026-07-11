import { NextResponse } from "next/server";
import { z } from "zod";

import { buildFallbackComplianceAiReview, reviewComplianceWithAi } from "@/lib/ai/compliance-review";
import { withTimeout } from "@/lib/async/timeout";
import { getCurrentUser, requireCurrentUser } from "@/lib/auth/session";
import { checkContentCompliance } from "@/lib/compliance/check";
import { prisma } from "@/lib/db/prisma";
import { getPlanConfig } from "@/lib/entitlements/service";
import { errorResponse, mapApiError } from "@/lib/http/errors";

const schema = z.object({
  projectId: z.string().min(1).optional(),
  entry: z.enum(["wechat_article", "green_note", "search", "question", "moments"]).optional(),
  title: z.string().max(160).optional(),
  content: z.string().min(1).max(50000),
  html: z.string().max(200000).optional(),
});

function aiIssuesToComplianceIssues(review: Awaited<ReturnType<typeof reviewComplianceWithAi>>["review"]) {
  return review.issues.map((issue) => ({
    category: `AI审稿：${issue.category}`,
    severity: issue.severity,
    excerpt: issue.excerpt,
    message: issue.problem,
    suggestion: issue.replacement ? `${issue.suggestion}\n可替换为：${issue.replacement}` : issue.suggestion,
  }));
}

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Content is required for compliance checking.");
    }

    const current = parsed.data.projectId ? await requireCurrentUser() : await getCurrentUser();
    const plan = current ? await getPlanConfig(current.workspace.planCode) : null;
    const result = checkContentCompliance(parsed.data, {
      advanced: Boolean(plan?.advancedChecks),
      entry: parsed.data.entry,
    });
    let aiReview: Awaited<ReturnType<typeof reviewComplianceWithAi>> | null = null;

    if (current) {
      try {
        aiReview = await withTimeout(
          reviewComplianceWithAi({
            title: parsed.data.title,
            content: parsed.data.content,
            entry: parsed.data.entry,
            ruleSummary: result.summary,
            ruleIssues: result.issues,
          }),
          Number(process.env.AI_REVIEW_TIMEOUT_MS || 18000),
          "AI 审稿响应超时，已先返回基础检查结果。",
        );
      } catch (error) {
        aiReview = {
          review: buildFallbackComplianceAiReview({
            title: parsed.data.title,
            content: parsed.data.content,
            entry: parsed.data.entry,
          }),
          provider: "fallback",
          model: "local-rules",
          fallback: true,
          aiError: error instanceof Error ? error.message : "AI 审稿响应超时，已先返回基础检查结果。",
        };
      }
      const aiIssues = aiReview.fallback ? [] : aiIssuesToComplianceIssues(aiReview.review);
      if (aiIssues.length) {
        result.issues.push(...aiIssues);
        const scorePenalty = aiIssues.reduce((sum, issue) => sum + (issue.severity === "high" ? 18 : issue.severity === "medium" ? 10 : 5), 0);
        result.score = Math.max(40, result.score - scorePenalty);
        result.level = result.score >= 85 ? "可发布" : result.score >= 65 ? "建议修改" : "高风险";
        result.summary = `${result.summary} AI 主编已补充审稿建议。`;
      }
    }

    if (!parsed.data.projectId) {
      return NextResponse.json({
        ...result,
        aiReview: aiReview?.review,
        aiReviewMeta: aiReview
          ? {
              provider: aiReview.provider,
              model: aiReview.model,
              fallback: aiReview.fallback,
              aiError: aiReview.aiError,
            }
          : null,
      });
    }

    if (!current) {
      return errorResponse("Please sign in before saving a compliance report.", 401);
    }

    await prisma.contentProject.findFirstOrThrow({
      where: { id: parsed.data.projectId, workspaceId: current.workspace.id },
    });

    const report = await prisma.complianceReport.create({
      data: {
        projectId: parsed.data.projectId,
        score: result.score,
        level: result.level,
        summary: result.summary,
        issues: {
          create: result.issues,
        },
      },
      include: { issues: true },
    });

    return NextResponse.json({
      ...result,
      report,
      aiReview: aiReview?.review,
      aiReviewMeta: aiReview
        ? {
            provider: aiReview.provider,
            model: aiReview.model,
            fallback: aiReview.fallback,
            aiError: aiReview.aiError,
          }
        : null,
    });
  } catch (error) {
    return mapApiError(error);
  }
}
