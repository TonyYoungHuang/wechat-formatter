import { NextResponse } from "next/server";
import type { ContentEntry } from "@prisma/client";

import { requireCurrentUser } from "@/lib/auth/session";
import { runFiveEntryGeneration } from "@/lib/generation/five-entry-service";
import { generateFiveEntrySchema } from "@/lib/generation/schemas";
import { errorResponse, mapApiError } from "@/lib/http/errors";

export function createSingleEntryGenerationRoute(entry: ContentEntry) {
  return async function POST(request: Request) {
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
      const variant = result.project.variants.find((item) => item.entry === entry);

      if (!variant) {
        return errorResponse("The requested entry was not generated.", 500);
      }

      return NextResponse.json({ ...result, variant });
    } catch (error) {
      return mapApiError(error);
    }
  };
}
