import { NextResponse } from "next/server";

import { adminPlansPatchSchema } from "@/lib/entitlements/schemas";
import { getPlanConfigs, upsertPlanConfig } from "@/lib/entitlements/service";
import { errorResponse, mapApiError } from "@/lib/http/errors";

export async function GET() {
  const plans = await getPlanConfigs();

  return NextResponse.json({
    plans,
    configurable: true,
  });
}

export async function PATCH(request: Request) {
  try {
    const parsed = adminPlansPatchSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success || !parsed.data.plans) {
      return errorResponse("Pricing configuration payload is invalid.");
    }

    const updated = await Promise.all(
      Object.entries(parsed.data.plans).map(([code, patch]) => upsertPlanConfig(code as never, patch)),
    );

    return NextResponse.json({ plans: updated });
  } catch (error) {
    return mapApiError(error);
  }
}
