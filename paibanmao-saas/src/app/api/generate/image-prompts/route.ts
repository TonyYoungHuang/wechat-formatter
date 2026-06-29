import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/session";
import { buildImagePrompts } from "@/lib/generation/fallback";
import { imagePromptSchema } from "@/lib/generation/schemas";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { assertCanUseGeneration, recordGenerationUsage } from "@/lib/usage/service";

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = imagePromptSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Valid image prompt parameters are required.");
    }

    await assertCanUseGeneration(current.workspace.id, current.workspace.planCode);
    const output = buildImagePrompts(parsed.data.topic, parsed.data.scene, parsed.data.style);
    await recordGenerationUsage(current.workspace.id, 1);

    return NextResponse.json({ output });
  } catch (error) {
    return mapApiError(error);
  }
}
