import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/session";
import { runFiveEntryGeneration } from "@/lib/generation/five-entry-service";
import { generateFiveEntrySchema } from "@/lib/generation/schemas";
import { errorResponse, mapApiError } from "@/lib/http/errors";

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = generateFiveEntrySchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("A valid topic is required.");
    }

    const result = await runFiveEntryGeneration({
      workspaceId: current.workspace.id,
      planCode: current.workspace.planCode,
      payload: parsed.data,
    });

    return NextResponse.json(result);
  } catch (error) {
    return mapApiError(error);
  }
}
