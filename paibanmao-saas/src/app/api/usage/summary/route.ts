import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/session";
import { mapApiError } from "@/lib/http/errors";
import { getGenerationUsageSummary, getImageGenerationUsageSummary } from "@/lib/usage/service";

export async function GET() {
  try {
    const current = await requireCurrentUser();
    const [generation, imageGeneration] = await Promise.all([
      getGenerationUsageSummary(current.workspace.id, current.workspace.planCode),
      getImageGenerationUsageSummary(current.workspace.id, current.workspace.planCode),
    ]);

    return NextResponse.json({
      workspace: {
        id: current.workspace.id,
        planCode: current.workspace.planCode,
      },
      generation,
      imageGeneration,
    });
  } catch (error) {
    return mapApiError(error);
  }
}
