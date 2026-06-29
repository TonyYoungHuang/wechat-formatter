import type { PlanCode } from "@/lib/entitlements/plans";
import { getPlanConfig } from "@/lib/entitlements/service";

export async function getPlanPriceCents(planCode: PlanCode) {
  const plan = await getPlanConfig(planCode);
  return plan.priceCents ?? 0;
}
