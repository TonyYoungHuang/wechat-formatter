import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/session";
import { mapApiError } from "@/lib/http/errors";
import { getGenerationUsageSummary } from "@/lib/usage/service";

export async function GET() {
  try {
    const current = await requireCurrentUser();
    const generation = await getGenerationUsageSummary(current.workspace.id, current.workspace.planCode);

    return NextResponse.json({
      workspace: {
        id: current.workspace.id,
        planCode: current.workspace.planCode,
      },
      generation,
    });
  } catch (error) {
    return mapApiError(error);
  }
}
