import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { appendKnowledgeContext, getAccountKnowledgeContext } from "@/lib/account-knowledge/context";
import { generateFiveEntryWithAi, isAiProviderConfigured } from "@/lib/ai/five-entry";
import { prisma } from "@/lib/db/prisma";
import { buildFallbackFiveEntry } from "@/lib/generation/fallback";
import { generateFiveEntrySchema } from "@/lib/generation/schemas";
import { getActivePromptTemplate } from "@/lib/prompts/service";
import { assertCanUseGeneration } from "@/lib/usage/service";

export type FiveEntryGenerationInput = z.infer<typeof generateFiveEntrySchema>;

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

  return {
    accountProfile,
    payload: {
      ...payload,
      accountProfileId: accountProfile.id,
    },
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
  const knowledgeContext = await getAccountKnowledgeContext(accountProfile.id);

  if (existingJobId) {
    await prisma.generationJob.updateMany({
      where: { id: existingJobId, workspaceId },
      data: { status: "running", error: null },
    });
  }

  const promptTemplate = await getActivePromptTemplate("five_entry_generation", {
    topic: scopedPayload.topic,
    goal: scopedPayload.goal,
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
  });
  const renderedPrompt = appendKnowledgeContext(promptTemplate.rendered, knowledgeContext);

  let generationSource = "fallback";
  let aiError: string | null = null;
  let tokenInput = 0;
  let tokenOutput = 0;
  let variants = buildFallbackFiveEntry({
    topic: scopedPayload.topic,
    goal: scopedPayload.goal,
    accountProfile,
  });

  if (await isAiProviderConfigured()) {
    try {
      const aiResult = await generateFiveEntryWithAi({
        topic: scopedPayload.topic,
        goal: scopedPayload.goal,
        accountProfile,
        prompt: renderedPrompt,
      });
      variants = aiResult.variants;
      tokenInput = aiResult.tokenInput;
      tokenOutput = aiResult.tokenOutput;
      generationSource = `${aiResult.provider}:${aiResult.model}`;
    } catch (error) {
      aiError = error instanceof Error ? error.message : "AI generation failed.";
    }
  }

  return prisma.$transaction(async (tx) => {
    const project = await tx.contentProject.create({
      data: {
        workspaceId,
        accountProfileId: accountProfile.id,
        topicId: scopedPayload.topicId,
        title: scopedPayload.topic,
        variants: {
          create: variants.map((variant) => ({
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
      ...scopedPayload,
      source: generationSource,
      promptTemplate: {
        key: promptTemplate.key,
        version: promptTemplate.version,
        source: promptTemplate.source,
      },
      knowledgeContext,
    } as Prisma.InputJsonValue;
    const jobOutput = {
      variants,
      source: generationSource,
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

    if (scopedPayload.topicId) {
      await tx.topic.update({
        where: { id: scopedPayload.topicId },
        data: { status: "generated" },
      });
    }

    return { job, project };
  });
}
