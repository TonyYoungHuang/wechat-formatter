import type { PlanCode } from "@/lib/entitlements/plans";
import { prisma } from "@/lib/db/prisma";
import { getPlanConfig } from "@/lib/entitlements/service";

export async function getPlanPriceCents(planCode: PlanCode) {
  const plan = await getPlanConfig(planCode);
  return plan.priceCents ?? 0;
}

export async function expirePendingPaymentOrders(workspaceId?: string) {
  return prisma.paymentOrder.updateMany({
    where: {
      status: "pending",
      expiresAt: { lt: new Date() },
      ...(workspaceId ? { workspaceId } : {}),
    },
    data: { status: "expired" },
  });
}
