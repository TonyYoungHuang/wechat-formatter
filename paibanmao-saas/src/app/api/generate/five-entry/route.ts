import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { generateFiveEntryWithAi, isAiProviderConfigured } from "@/lib/ai/five-entry";
import { requireCurrentUser } from "@/lib/auth/session";
import { buildFallbackFiveEntry } from "@/lib/generation/fallback";
import { generateFiveEntrySchema } from "@/lib/generation/schemas";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { getActivePromptTemplate } from "@/lib/prompts/service";
import { assertCanUseGeneration } from "@/lib/usage/service";

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = generateFiveEntrySchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("A valid topic is required.");
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

    if (!accountProfile) {
      return errorResponse("Create an account profile first.");
    }

    if (parsed.data.topicId) {
      await prisma.topic.findFirstOrThrow({
        where: {
          id: parsed.data.topicId,
          workspaceId: current.workspace.id,
          accountProfileId: accountProfile.id,
        },
      });
    }

    let generationSource = "fallback";
    let aiError: string | null = null;
    let tokenInput = 0;
    let tokenOutput = 0;
    let variants = buildFallbackFiveEntry({
      topic: parsed.data.topic,
      goal: parsed.data.goal,
      accountProfile,
    });
    const promptTemplate = await getActivePromptTemplate("five_entry_generation", {
      topic: parsed.data.topic,
      goal: parsed.data.goal,
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
    });

    if (isAiProviderConfigured()) {
      try {
        const aiResult = await generateFiveEntryWithAi({
          topic: parsed.data.topic,
          goal: parsed.data.goal,
          accountProfile,
          prompt: promptTemplate.rendered,
        });
        variants = aiResult.variants;
        tokenInput = aiResult.tokenInput;
        tokenOutput = aiResult.tokenOutput;
        generationSource = `${aiResult.provider}:${aiResult.model}`;
      } catch (error) {
        aiError = error instanceof Error ? error.message : "AI generation failed.";
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const job = await tx.generationJob.create({
        data: {
          workspaceId: current.workspace.id,
          accountProfileId: accountProfile.id,
          promptTemplateId: promptTemplate.id ?? undefined,
          type: "five_entry_generation",
          status: "succeeded",
          input: {
            ...parsed.data,
            source: generationSource,
            promptTemplate: {
              key: promptTemplate.key,
              version: promptTemplate.version,
              source: promptTemplate.source,
            },
          } as Prisma.InputJsonValue,
          output: { variants, source: generationSource, aiError } as Prisma.InputJsonValue,
          error: aiError,
          tokenInput,
          tokenOutput,
        },
      });

      const project = await tx.contentProject.create({
        data: {
          workspaceId: current.workspace.id,
          accountProfileId: accountProfile.id,
          topicId: parsed.data.topicId,
          title: parsed.data.topic,
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

      await tx.usageLog.create({
        data: {
          workspaceId: current.workspace.id,
          key: "generation",
          quantity: 1,
        },
      });

      if (parsed.data.topicId) {
        await tx.topic.update({
          where: { id: parsed.data.topicId },
          data: { status: "generated" },
        });
      }

      return { job, project };
    });

    return NextResponse.json(result);
  } catch (error) {
    return mapApiError(error);
  }
}
