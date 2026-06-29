import type { PlanCode } from "@/lib/entitlements/plans";
import { prisma } from "@/lib/db/prisma";
import { getPlanConfig } from "@/lib/entitlements/service";

function normalizePlanCode(planCode: string): PlanCode {
  return planCode === "starter" || planCode === "pro" ? planCode : "free";
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfThisMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function sumUsage(workspaceId: string, since: Date) {
  const used = await prisma.usageLog.aggregate({
    where: {
      workspaceId,
      key: "generation",
      createdAt: { gte: since },
    },
    _sum: { quantity: true },
  });

  return used._sum.quantity ?? 0;
}

export async function getGenerationUsageSummary(workspaceId: string, planCode: string) {
  const plan = await getPlanConfig(normalizePlanCode(planCode));
  const [dailyUsed, monthlyUsed] = await Promise.all([
    sumUsage(workspaceId, startOfToday()),
    sumUsage(workspaceId, startOfThisMonth()),
  ]);

  return {
    plan,
    daily: {
      used: dailyUsed,
      limit: plan.dailyGenerationLimit,
      remaining: plan.dailyGenerationLimit === null ? null : Math.max(plan.dailyGenerationLimit - dailyUsed, 0),
    },
    monthly: {
      used: monthlyUsed,
      limit: plan.monthlyGenerationLimit,
      remaining: plan.monthlyGenerationLimit === null ? null : Math.max(plan.monthlyGenerationLimit - monthlyUsed, 0),
    },
  };
}

export async function assertCanUseGeneration(workspaceId: string, planCode: string) {
  const summary = await getGenerationUsageSummary(workspaceId, planCode);

  if (summary.daily.limit !== null && summary.daily.used >= summary.daily.limit) {
    throw new Error(`Current plan allows ${summary.daily.limit} generations per day.`);
  }

  if (summary.monthly.limit !== null && summary.monthly.used >= summary.monthly.limit) {
    throw new Error(`Current plan allows ${summary.monthly.limit} generations per month.`);
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
