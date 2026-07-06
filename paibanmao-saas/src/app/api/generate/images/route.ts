import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { generateImagesWithRequesty } from "@/lib/ai/images";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { imageGenerationSchema } from "@/lib/generation/schemas";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { assertCanUseImageGeneration, recordImageGenerationUsage } from "@/lib/usage/service";

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function imageGenerationEnabled() {
  return process.env.IMAGE_GENERATION_ENABLED === "true" || process.env.IMAGE_GENERATION_ENABLED === "1";
}

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = imageGenerationSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Valid image generation parameters are required.");
    }

    if (!imageGenerationEnabled()) {
      return errorResponse("图片生成点数包即将上线，当前套餐暂不包含 Gemini 生图。你可以先使用图片提示词。", 403);
    }

    const imageCount = parsed.data.prompts.length;
    await assertCanUseImageGeneration(current.workspace.id, current.workspace.planCode, imageCount);

    const output = await generateImagesWithRequesty({
      ...parsed.data,
      quality: "low",
    });
    const job = await prisma.generationJob.create({
      data: {
        workspaceId: current.workspace.id,
        type: "image_generation",
        status: "succeeded",
        input: toJsonValue(parsed.data),
        output: toJsonValue(output),
        tokenInput: 0,
        tokenOutput: 0,
      },
    });
    await recordImageGenerationUsage(current.workspace.id, imageCount);

    return NextResponse.json({ output, job });
  } catch (error) {
    return mapApiError(error);
  }
}
