import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/session";
import { buildImagePrompts } from "@/lib/generation/fallback";
import { imagePromptSchema } from "@/lib/generation/schemas";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { prisma } from "@/lib/db/prisma";
import { getActivePromptTemplate } from "@/lib/prompts/service";
import { assertCanUseGeneration, recordGenerationUsage } from "@/lib/usage/service";

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
      style: parsed.data.style,
    });
    const output = buildImagePrompts(parsed.data.topic, parsed.data.scene, parsed.data.style);
    const job = await prisma.generationJob.create({
      data: {
        workspaceId: current.workspace.id,
        promptTemplateId: promptTemplate.id ?? undefined,
        type: "image_prompt_generation",
        status: "succeeded",
        input: {
          ...parsed.data,
          promptTemplate: {
            key: promptTemplate.key,
            version: promptTemplate.version,
            source: promptTemplate.source,
          },
        },
        output,
      },
    });
    await recordGenerationUsage(current.workspace.id, 1);

    return NextResponse.json({ output, job });
  } catch (error) {
    return mapApiError(error);
  }
}
