import { NextResponse } from "next/server";

import { requireSiteAdmin } from "@/lib/auth/session";
import { adminPlansPatchSchema } from "@/lib/entitlements/schemas";
import { isPlanCode } from "@/lib/entitlements/plans";
import { getPlanConfigs, getPricingVersions, upsertPlanConfig } from "@/lib/entitlements/service";
import { errorResponse, mapApiError } from "@/lib/http/errors";

export async function GET() {
  try {
    await requireSiteAdmin();
    const [plans, versions] = await Promise.all([getPlanConfigs(), getPricingVersions()]);

    return NextResponse.json({
      plans,
      versions,
      configurable: true,
    });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireSiteAdmin();
    const parsed = adminPlansPatchSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success || !parsed.data.plans) {
      return errorResponse("Entitlement configuration payload is invalid.");
    }

    const updated = await Promise.all(
      Object.entries(parsed.data.plans).map(([code, patch]) => {
        if (!isPlanCode(code)) {
          throw new Error(`Unsupported plan code: ${code}`);
        }

        return upsertPlanConfig(code, patch, {
          recordVersion: true,
          note: "admin entitlement update",
        });
      }),
    );
    const versions = await getPricingVersions();

    return NextResponse.json({ plans: updated, versions });
  } catch (error) {
    return mapApiError(error);
  }
}
