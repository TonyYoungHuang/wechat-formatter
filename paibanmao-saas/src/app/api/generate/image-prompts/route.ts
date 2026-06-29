import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { generateImagePromptsWithAi } from "@/lib/ai/image-prompts";
import { requireCurrentUser } from "@/lib/auth/session";
import { buildImagePrompts } from "@/lib/generation/fallback";
import { imagePromptSchema } from "@/lib/generation/schemas";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { prisma } from "@/lib/db/prisma";
import { getActivePromptTemplate } from "@/lib/prompts/service";
import { assertCanUseGeneration, recordGenerationUsage } from "@/lib/usage/service";

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

type ImagePromptRouteOutput = ReturnType<typeof buildImagePrompts> & {
  source: string;
  provider: string;
  model: string;
  aiError: string | null;
};

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = imagePromptSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Valid image prompt parameters are required.");
    }

    await assertCanUseGeneration(current.workspace.id, current.workspace.planCode);
    const promptTemplate = await getActivePromptTemplate("image_prompt_generation", {
      topic: parsed.data.topic,
      scene: parsed.data.scene,
      pageCount: String(parsed.data.pageCount),
      style: parsed.data.style,
    });

    const fallbackOutput = buildImagePrompts(parsed.data.topic, parsed.data.scene, parsed.data.style, parsed.data.pageCount);
    let aiError: string | null = null;
    let tokenInput = 0;
    let tokenOutput = 0;
    let output: ImagePromptRouteOutput = {
      ...fallbackOutput,
      source: "fallback",
      provider: "fallback",
      model: "local-rules",
      aiError,
    };

    try {
      const aiResult = await generateImagePromptsWithAi({
        topic: parsed.data.topic,
        scene: parsed.data.scene,
        pageCount: parsed.data.pageCount,
        style: parsed.data.style,
        prompt: promptTemplate.rendered,
      });
      tokenInput = aiResult.tokenInput;
      tokenOutput = aiResult.tokenOutput;
      output = {
        ...fallbackOutput,
        prompts: aiResult.prompts,
        source: `${aiResult.provider}:${aiResult.model}`,
        provider: aiResult.provider,
        model: aiResult.model,
        aiError,
      };
    } catch (error) {
      aiError = error instanceof Error ? error.message : "AI image prompt generation failed.";
      output = { ...output, aiError };
    }

    const job = await prisma.generationJob.create({
      data: {
        workspaceId: current.workspace.id,
        promptTemplateId: promptTemplate.id ?? undefined,
        type: "image_prompt_generation",
        status: "succeeded",
        input: toJsonValue({
          ...parsed.data,
          promptTemplate: {
            key: promptTemplate.key,
            version: promptTemplate.version,
            source: promptTemplate.source,
          },
        }),
        output: toJsonValue(output),
        error: aiError,
        tokenInput,
        tokenOutput,
      },
    });
    await recordGenerationUsage(current.workspace.id, 1);

    return NextResponse.json({ output, job });
  } catch (error) {
    return mapApiError(error);
  }
}
