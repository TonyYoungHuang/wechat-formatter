import { NextResponse } from "next/server";

import { adminPlansPatchSchema } from "@/lib/entitlements/schemas";
import { getPlanConfigs, getPricingVersions, upsertPlanConfig } from "@/lib/entitlements/service";
import { errorResponse, mapApiError } from "@/lib/http/errors";

export async function GET() {
  const [plans, versions] = await Promise.all([getPlanConfigs(), getPricingVersions()]);

  return NextResponse.json({
    plans,
    versions,
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
      Object.entries(parsed.data.plans).map(([code, patch]) =>
        upsertPlanConfig(code as never, patch, {
          recordVersion: true,
          note: "admin pricing update",
        }),
      ),
    );
    const versions = await getPricingVersions();

    return NextResponse.json({ plans: updated, versions });
  } catch (error) {
    return mapApiError(error);
  }
}
