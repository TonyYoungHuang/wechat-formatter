import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { buildFallbackRewrite, rewriteWithAi } from "@/lib/ai/rewrite";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { rewriteContentSchema } from "@/lib/generation/schemas";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { getActivePromptTemplate } from "@/lib/prompts/service";
import { assertCanUseGeneration, recordGenerationUsage } from "@/lib/usage/service";

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = rewriteContentSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("A valid rewrite payload is required.");
    }

    await assertCanUseGeneration(current.workspace.id, current.workspace.planCode);

    const accountProfile = parsed.data.accountProfileId
      ? await prisma.accountProfile.findFirstOrThrow({
          where: { id: parsed.data.accountProfileId, workspaceId: current.workspace.id },
        })
      : await prisma.accountProfile.findFirst({
          where: { workspaceId: current.workspace.id },
          orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
        });

    const promptTemplate = await getActivePromptTemplate("ai_tone_rewrite", {
      title: parsed.data.title || "未填写",
      goal: parsed.data.goal,
      content: parsed.data.content,
      accountName: accountProfile?.name || "未填写",
      niche: accountProfile?.niche || "未填写",
      persona: accountProfile?.persona || "未填写",
      audience: accountProfile?.audience || "未填写",
      tone: accountProfile?.tone || "自然、具体、少一点模板感",
      commonCta: accountProfile?.commonCta || "未填写",
      forbiddenWords: accountProfile?.forbiddenWords.join(", ") || "无",
    });

    let output = buildFallbackRewrite({
      title: parsed.data.title,
      content: parsed.data.content,
      goal: parsed.data.goal,
      commonCta: accountProfile?.commonCta,
    });
    let aiError: string | null = null;

    try {
      output = await rewriteWithAi({
        prompt: promptTemplate.rendered,
        title: parsed.data.title,
        content: parsed.data.content,
      });
    } catch (error) {
      aiError = error instanceof Error ? error.message : "AI rewrite failed.";
    }

    const input = toJsonValue({
      ...parsed.data,
      promptTemplate: {
        key: promptTemplate.key,
        version: promptTemplate.version,
        source: promptTemplate.source,
      },
    });
    const result = toJsonValue({
      ...output,
      aiError,
    });

    const job = await prisma.generationJob.create({
      data: {
        workspaceId: current.workspace.id,
        accountProfileId: accountProfile?.id,
        promptTemplateId: promptTemplate.id ?? undefined,
        type: "ai_tone_rewrite",
        status: "succeeded",
        input,
        output: result,
        error: aiError,
        tokenInput: output.tokenInput,
        tokenOutput: output.tokenOutput,
      },
    });

    await recordGenerationUsage(current.workspace.id);

    return NextResponse.json({
      job,
      output,
      fallback: output.provider === "fallback",
      aiError,
    });
  } catch (error) {
    return mapApiError(error);
  }
}
