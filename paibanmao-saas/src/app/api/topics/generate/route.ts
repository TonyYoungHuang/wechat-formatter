import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { appendKnowledgeContext, getAccountKnowledgeContext } from "@/lib/account-knowledge/context";
import { generateTopicSuggestionsWithAi } from "@/lib/ai/topics";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { getActivePromptTemplate } from "@/lib/prompts/service";
import { topicGenerateSchema } from "@/lib/topics/schemas";
import { buildTopicSuggestions } from "@/lib/topics/suggestions";
import { assertCanUseGeneration, recordGenerationUsage } from "@/lib/usage/service";

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = topicGenerateSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Valid topic generation parameters are required.");
    }

    await assertCanUseGeneration(current.workspace.id, current.workspace.planCode);

    const profile = await prisma.accountProfile.findFirstOrThrow({
      where: { id: parsed.data.accountProfileId, workspaceId: current.workspace.id },
    });
    const knowledgeContext = await getAccountKnowledgeContext(profile.id);
    const promptTemplate = await getActivePromptTemplate("topic_generation", {
      accountName: profile.name,
      niche: profile.niche,
      persona: profile.persona,
      audience: profile.audience,
      audiencePainPoints: profile.audiencePainPoints,
      productOrService: profile.productOrService || "未填写",
      monetizationMethods: profile.monetizationMethods.join(", ") || "未填写",
      tone: profile.tone,
      commonCta: profile.commonCta || "未填写",
      forbiddenWords: profile.forbiddenWords.join(", ") || "无",
      sampleText: profile.sampleText || "无",
      knowledgeBase: knowledgeContext,
      theme: parsed.data.theme,
      monetizationGoal: parsed.data.monetizationGoal,
      avoid: parsed.data.avoid || "无",
      count: parsed.data.count,
    });
    const renderedPrompt = appendKnowledgeContext(promptTemplate.rendered, knowledgeContext);

    let source = "fallback";
    let aiError: string | null = null;
    let tokenInput = 0;
    let tokenOutput = 0;
    let suggestions = buildTopicSuggestions({
      profile,
      theme: parsed.data.theme,
      monetizationGoal: parsed.data.monetizationGoal,
      avoid: parsed.data.avoid,
      count: parsed.data.count,
    });

    try {
      const aiResult = await generateTopicSuggestionsWithAi({
        profile,
        theme: parsed.data.theme,
        monetizationGoal: parsed.data.monetizationGoal,
        avoid: parsed.data.avoid,
        count: parsed.data.count,
        prompt: renderedPrompt,
      });
      suggestions = aiResult.suggestions;
      source = `${aiResult.provider}:${aiResult.model}`;
      tokenInput = aiResult.tokenInput;
      tokenOutput = aiResult.tokenOutput;
    } catch (error) {
      aiError = error instanceof Error ? error.message : "AI topic generation failed.";
    }

    const job = await prisma.generationJob.create({
      data: {
        workspaceId: current.workspace.id,
        accountProfileId: profile.id,
        promptTemplateId: promptTemplate.id ?? undefined,
        type: "topic_generation",
        status: "succeeded",
        input: {
          ...parsed.data,
          source,
          promptTemplate: {
            key: promptTemplate.key,
            version: promptTemplate.version,
            source: promptTemplate.source,
          },
          knowledgeContext,
        } as Prisma.InputJsonValue,
        output: { suggestions, source, aiError } as Prisma.InputJsonValue,
        error: aiError,
        tokenInput,
        tokenOutput,
      },
    });

    await recordGenerationUsage(current.workspace.id, 1);

    return NextResponse.json({ suggestions, job });
  } catch (error) {
    return mapApiError(error);
  }
}
