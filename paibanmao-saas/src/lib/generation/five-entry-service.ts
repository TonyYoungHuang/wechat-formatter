import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { appendKnowledgeContext, getAccountKnowledgeContext } from "@/lib/account-knowledge/context";
import { buildKnowledgeTags, recordGeneratedContentTags } from "@/lib/account-knowledge/tagging";
import { generateFiveEntryPlanWithAi, generateFiveEntryWithAi, isAiProviderConfigured, polishFiveEntryWithAi } from "@/lib/ai/five-entry";
import { buildKnowledgeTagsWithAi } from "@/lib/ai/knowledge-tags";
import { prisma } from "@/lib/db/prisma";
import { buildFallbackFiveEntry } from "@/lib/generation/fallback";
import { getContentGoalStrategy } from "@/lib/generation/goals";
import { generateFiveEntrySchema } from "@/lib/generation/schemas";
import {
  buildPersistedGenerationPayload,
  buildSourcePromptContext,
  resolveSourceMaterial,
  type ResolvedSourceMaterial,
} from "@/lib/generation/source-material";
import { getActivePromptTemplate } from "@/lib/prompts/service";
import { assertCanUseGeneration } from "@/lib/usage/service";

export type FiveEntryGenerationInput = z.infer<typeof generateFiveEntrySchema>;

const fiveEntryAiTimeoutMs = Number(process.env.FIVE_ENTRY_AI_TIMEOUT_MS || 90000);
const fiveEntryPolishTimeoutMs = Number(process.env.FIVE_ENTRY_POLISH_TIMEOUT_MS || 45000);
const knowledgeTagTimeoutMs = Number(process.env.KNOWLEDGE_TAG_TIMEOUT_MS || 20000);

function appendAiError(current: string | null, message: string) {
  return current ? `${current}; ${message}` : message;
}

function buildCompactFiveEntryDraftPrompt(input: {
  topic: string;
  goalLabel: string;
  goalStrategy: string;
  goalRequirements: string[];
  goalCta: string;
  accountProfile: {
    name: string;
    niche: string;
    persona: string;
    audience: string;
    audiencePainPoints: string;
    productOrService: string;
    monetizationMethods: string[];
    tone: string;
    commonCta: string;
    forbiddenWords: string[];
    sampleText?: string | null;
  };
  knowledgeContext: string;
  sourceSummary: ResolvedSourceMaterial["summary"];
  plan: NonNullable<Awaited<ReturnType<typeof generateFiveEntryPlanWithAi>>["plan"]>;
}) {
  const profile = input.accountProfile;

  return [
    `选题: ${input.topic}`,
    `内容目标: ${input.goalLabel}`,
    `目标策略: ${input.goalStrategy}`,
    "目标硬性要求:",
    input.goalRequirements.map((item) => `- ${item}`).join("\n"),
    `推荐 CTA: ${input.goalCta}`,
    "",
    "账号档案:",
    `- 名称: ${profile.name}`,
    `- 领域: ${profile.niche}`,
    `- 人设: ${profile.persona}`,
    `- 读者: ${profile.audience}`,
    `- 痛点: ${profile.audiencePainPoints}`,
    `- 产品/服务: ${profile.productOrService || "未填写"}`,
    `- 变现方式: ${profile.monetizationMethods.join(", ") || "未填写"}`,
    `- 语气: ${profile.tone}`,
    `- 常用 CTA: ${profile.commonCta || "未填写"}`,
    `- 禁用表达: ${profile.forbiddenWords.join(", ") || "无"}`,
    profile.sampleText ? `- 参考样文: ${profile.sampleText.slice(0, 1200)}` : "- 参考样文: 无",
    "",
    "账号知识库标签:",
    input.knowledgeContext || "无",
    "",
    "本次素材使用方式:",
    input.sourceSummary.inputMode === "topic"
      ? "无外部素材，从选题原创。"
      : [
          `- 模式: ${input.sourceSummary.inputModeLabel}`,
          `- 方式: ${input.sourceSummary.adaptationLabel}`,
          `- 策略: ${input.sourceSummary.adaptationStrategy}`,
          `- 来源: ${input.sourceSummary.sourceTitle || input.sourceSummary.sourceUrl || "用户粘贴素材"}`,
          `- 用户要求: ${input.sourceSummary.sourceInstructions || "无"}`,
        ].join("\n"),
    "",
    "已完成的五入口策划:",
    JSON.stringify(input.plan, null, 2),
    "",
    "请根据这份策划直接生成五入口内容，输出 exactly five variants。",
    "公众号要像可继续排版的长文草稿；小绿书要有封面标题、分页脚本和 metadata.imagePrompts；搜一搜要有关键词并放进 metadata.keywords；问一问要直接回答问题；朋友圈要像真人转发文案。",
    "写得像真实微信创作者，不要像 AI 模板、课程讲义或营销海报。不要编造经历、收益、截图、平台背书或排名。",
  ].join("\n");
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function resolveFiveEntryGenerationScope(workspaceId: string, payload: FiveEntryGenerationInput) {
  const accountProfile = payload.accountProfileId
    ? await prisma.accountProfile.findFirstOrThrow({
        where: { id: payload.accountProfileId, workspaceId },
      })
    : await prisma.accountProfile.findFirst({
        where: { workspaceId },
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      });

  if (!accountProfile) {
    throw new Error("Create an account profile first.");
  }

  if (payload.topicId) {
    await prisma.topic.findFirstOrThrow({
      where: {
        id: payload.topicId,
        workspaceId,
        accountProfileId: accountProfile.id,
      },
    });
  }

  const sourceMaterial = await resolveSourceMaterial(payload);

  return {
    accountProfile,
    payload: {
      ...sourceMaterial.payload,
      accountProfileId: accountProfile.id,
    },
    sourceSummary: sourceMaterial.summary,
  };
}

export async function runFiveEntryGeneration(input: {
  workspaceId: string;
  planCode: string;
  payload: FiveEntryGenerationInput;
  existingJobId?: string;
}) {
  const { workspaceId, planCode, payload, existingJobId } = input;

  await assertCanUseGeneration(workspaceId, planCode, {
    excludeGenerationJobId: existingJobId,
  });

  const scoped = await resolveFiveEntryGenerationScope(workspaceId, payload);
  const accountProfile = scoped.accountProfile;
  const scopedPayload = scoped.payload;
  const sourceSummary = scoped.sourceSummary;
  const sourcePromptContext = buildSourcePromptContext({ payload: scopedPayload, summary: sourceSummary });
  const knowledgeContext = await getAccountKnowledgeContext(accountProfile.id);
  const goalStrategy = getContentGoalStrategy(scopedPayload.goal);

  if (existingJobId) {
    await prisma.generationJob.updateMany({
      where: { id: existingJobId, workspaceId },
      data: { status: "running", error: null },
    });
  }

  const promptTemplate = await getActivePromptTemplate("five_entry_generation", {
    topic: scopedPayload.topic,
    goal: scopedPayload.goal,
    goalLabel: goalStrategy.label,
    goalStrategy: goalStrategy.strategy,
    goalRequirements: goalStrategy.requirements.join("\n"),
    goalCta: goalStrategy.cta,
    accountName: accountProfile.name,
    niche: accountProfile.niche,
    persona: accountProfile.persona,
    audience: accountProfile.audience,
    audiencePainPoints: accountProfile.audiencePainPoints,
    productOrService: accountProfile.productOrService || "未填写",
    monetizationMethods: accountProfile.monetizationMethods.join(", ") || "未填写",
    tone: accountProfile.tone,
    commonCta: accountProfile.commonCta || "未填写",
    forbiddenWords: accountProfile.forbiddenWords.join(", ") || "无",
    sampleText: accountProfile.sampleText || "无",
    knowledgeBase: knowledgeContext,
    inputMode: sourceSummary.inputModeLabel,
    adaptationMode: sourceSummary.adaptationLabel,
    adaptationStrategy: sourceSummary.adaptationStrategy,
    sourceTitle: sourceSummary.sourceTitle || "无",
    sourceUrl: sourceSummary.sourceUrl || "无",
    sourceInstructions: sourceSummary.sourceInstructions || "无",
    sourceMaterial: sourcePromptContext,
  });
  const renderedPrompt = appendKnowledgeContext(promptTemplate.rendered, knowledgeContext);

  let generationSource = "fallback";
  let aiError: string | null = null;
  let tokenInput = 0;
  let tokenOutput = 0;
  let multiStagePlan: Awaited<ReturnType<typeof generateFiveEntryPlanWithAi>>["plan"] | null = null;
  const generationStages: string[] = ["fallback_draft"];
  let variants = buildFallbackFiveEntry({
    topic: scopedPayload.topic,
    goal: scopedPayload.goal,
    accountProfile,
    sourceText: scopedPayload.sourceText,
    sourceTitle: sourceSummary.sourceTitle,
    inputMode: sourceSummary.inputMode,
    adaptationLabel: sourceSummary.adaptationLabel,
    sourceInstructions: sourceSummary.sourceInstructions,
  });

  if (await isAiProviderConfigured()) {
    try {
      const planResult = await withTimeout(
        generateFiveEntryPlanWithAi({
          topic: scopedPayload.topic,
          goal: scopedPayload.goal,
          goalStrategy: goalStrategy.strategy,
          accountProfile,
          knowledgeContext,
          sourceContext: sourcePromptContext,
        }),
        fiveEntryAiTimeoutMs,
        "AI planning timed out.",
      );
      multiStagePlan = planResult.plan;
      tokenInput += planResult.tokenInput;
      tokenOutput += planResult.tokenOutput;
      generationStages.push(`planning:${planResult.provider}:${planResult.model}`);
    } catch (error) {
      aiError = `Planning failed: ${error instanceof Error ? error.message : "AI planning failed."}`;
    }

    try {
      const planContext = multiStagePlan
        ? buildCompactFiveEntryDraftPrompt({
            topic: scopedPayload.topic,
            goalLabel: goalStrategy.label,
            goalStrategy: goalStrategy.strategy,
            goalRequirements: goalStrategy.requirements,
            goalCta: goalStrategy.cta,
            accountProfile,
            knowledgeContext,
            sourceSummary,
            plan: multiStagePlan,
          })
        : renderedPrompt;
      const aiResult = await withTimeout(
        generateFiveEntryWithAi({
          topic: scopedPayload.topic,
          goal: scopedPayload.goal,
          accountProfile,
          prompt: planContext,
        }),
        fiveEntryAiTimeoutMs,
        "AI draft generation timed out.",
      );
      variants = aiResult.variants;
      tokenInput += aiResult.tokenInput;
      tokenOutput += aiResult.tokenOutput;
      generationSource = `${aiResult.provider}:${aiResult.model}`;
      generationStages.push(`draft:${aiResult.provider}:${aiResult.model}`);

      try {
        const polishResult = await withTimeout(
          polishFiveEntryWithAi({
            topic: scopedPayload.topic,
            goal: scopedPayload.goal,
            accountProfile,
            variants,
            plan: multiStagePlan,
            sourceSummary,
          }),
          fiveEntryPolishTimeoutMs,
          "AI polish timed out.",
        );
        variants = polishResult.variants;
        tokenInput += polishResult.tokenInput;
        tokenOutput += polishResult.tokenOutput;
        generationSource = `${generationSource} -> polish:${polishResult.provider}:${polishResult.model}`;
        generationStages.push(`polish:${polishResult.provider}:${polishResult.model}`);
      } catch (error) {
        const polishError = error instanceof Error ? error.message : "AI polish failed.";
        aiError = appendAiError(aiError, `Polish failed: ${polishError}`);
      }
    } catch (error) {
      const draftError = error instanceof Error ? error.message : "AI generation failed.";
      aiError = appendAiError(aiError, `Draft failed: ${draftError}`);
    }
  }

  const generatedContentForTags = variants.map((variant) => `${variant.entry}\n${variant.title}\n${variant.body}`).join("\n\n");
  const generatedContentTagging = await withTimeout(
    buildKnowledgeTagsWithAi({
      title: `生成内容标签：${scopedPayload.topic}`,
      sourceType: "generated_content",
      content: generatedContentForTags,
      manualTags: ["系统生成", "自动标签", goalStrategy.label],
    }),
    knowledgeTagTimeoutMs,
    "Generated content tag extraction timed out.",
  ).catch((error) => {
    const tagError = error instanceof Error ? error.message : "Generated content tag extraction failed.";
    aiError = appendAiError(aiError, `Tagging failed: ${tagError}`);
    return buildKnowledgeTags({
      title: `生成内容标签：${scopedPayload.topic}`,
      sourceType: "generated_content",
      content: generatedContentForTags,
      manualTags: ["系统生成", "自动标签", goalStrategy.label],
    });
  });

  return prisma.$transaction(async (tx) => {
    const variantsWithSource = variants.map((variant) => ({
      ...variant,
      metadata: {
        ...(variant.metadata || {}),
        creation: {
          inputMode: sourceSummary.inputMode,
          adaptationMode: sourceSummary.adaptationMode,
          sourceTitle: sourceSummary.sourceTitle || undefined,
          sourceUrl: sourceSummary.sourceUrl || undefined,
          sourceCharCount: sourceSummary.sourceCharCount || undefined,
        },
      },
    }));
    const project = await tx.contentProject.create({
      data: {
        workspaceId,
        accountProfileId: accountProfile.id,
        topicId: scopedPayload.topicId,
        title: scopedPayload.topic,
        variants: {
          create: variantsWithSource.map((variant) => ({
            entry: variant.entry,
            title: variant.title,
            body: variant.body,
            metadata: variant.metadata as Prisma.InputJsonValue | undefined,
          })),
        },
      },
      include: { variants: true },
    });

    const jobInput = {
      ...buildPersistedGenerationPayload({ payload: scopedPayload, summary: sourceSummary }),
      source: generationSource,
      promptTemplate: {
        key: promptTemplate.key,
        version: promptTemplate.version,
        source: promptTemplate.source,
      },
      knowledgeContext,
      multiStagePlan,
    } as Prisma.InputJsonValue;
    const jobOutput = {
      variants: variantsWithSource,
      source: generationSource,
      stages: generationStages,
      multiStagePlan,
      aiError,
      projectId: project.id,
    } as Prisma.InputJsonValue;

    const job = existingJobId
      ? await tx.generationJob.update({
          where: { id: existingJobId },
          data: {
            accountProfileId: accountProfile.id,
            promptTemplateId: promptTemplate.id ?? undefined,
            status: "succeeded",
            input: jobInput,
            output: jobOutput,
            error: aiError,
            tokenInput,
            tokenOutput,
          },
        })
      : await tx.generationJob.create({
          data: {
            workspaceId,
            accountProfileId: accountProfile.id,
            promptTemplateId: promptTemplate.id ?? undefined,
            type: "five_entry_generation",
            status: "succeeded",
            input: jobInput,
            output: jobOutput,
            error: aiError,
            tokenInput,
            tokenOutput,
          },
        });

    await tx.usageLog.create({
      data: {
        workspaceId,
        key: "generation",
        quantity: 1,
      },
    });

    await recordGeneratedContentTags(tx, {
      workspaceId,
      accountProfileId: accountProfile.id,
      projectTitle: scopedPayload.topic,
      variants: variantsWithSource,
      precomputedTagging: generatedContentTagging,
    });

    if (scopedPayload.topicId) {
      await tx.topic.update({
        where: { id: scopedPayload.topicId },
        data: { status: "generated" },
      });
    }

    return { job, project };
  });
}
