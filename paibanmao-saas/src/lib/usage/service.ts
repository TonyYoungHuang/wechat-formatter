import { prisma } from "@/lib/db/prisma";
import { getPlanConfig } from "@/lib/entitlements/service";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function assertCanUseGeneration(workspaceId: string, planCode: string) {
  const plan = await getPlanConfig(planCode === "starter" || planCode === "pro" ? planCode : "free");

  if (plan.dailyGenerationLimit === null) {
    return;
  }

  const used = await prisma.usageLog.aggregate({
    where: {
      workspaceId,
      key: "generation",
      createdAt: { gte: startOfToday() },
    },
    _sum: { quantity: true },
  });

  const usedCount = used._sum.quantity ?? 0;
  if (usedCount >= plan.dailyGenerationLimit) {
    throw new Error(`Current plan allows ${plan.dailyGenerationLimit} generations per day.`);
  }
}

export async function recordGenerationUsage(workspaceId: string, quantity = 1) {
  await prisma.usageLog.create({
    data: {
      workspaceId,
      key: "generation",
      quantity,
    },
  });
}
