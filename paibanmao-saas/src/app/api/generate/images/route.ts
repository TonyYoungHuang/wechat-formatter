import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { generateImagesWithRequesty } from "@/lib/ai/images";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { imageGenerationSchema } from "@/lib/generation/schemas";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { assertCanUseGeneration, recordGenerationUsage } from "@/lib/usage/service";

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = imageGenerationSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Valid image generation parameters are required.");
    }

    await assertCanUseGeneration(current.workspace.id, current.workspace.planCode);

    const output = await generateImagesWithRequesty(parsed.data);
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
    await recordGenerationUsage(current.workspace.id, 1);

    return NextResponse.json({ output, job });
  } catch (error) {
    return mapApiError(error);
  }
}
