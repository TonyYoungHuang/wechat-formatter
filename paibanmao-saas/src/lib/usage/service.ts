import type { PlanCode } from "@/lib/entitlements/plans";
import { prisma } from "@/lib/db/prisma";
import { getPlanConfig } from "@/lib/entitlements/service";

type UsageSummaryOptions = {
  excludeGenerationJobId?: string;
};

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

async function sumUsage(workspaceId: string, since: Date, key = "generation") {
  const used = await prisma.usageLog.aggregate({
    where: {
      workspaceId,
      key,
      createdAt: { gte: since },
    },
    _sum: { quantity: true },
  });

  return used._sum.quantity ?? 0;
}

async function countQueuedReservations(workspaceId: string, since: Date, options: UsageSummaryOptions = {}) {
  return prisma.generationJob.count({
    where: {
      workspaceId,
      type: "five_entry_generation",
      status: { in: ["pending", "running"] },
      createdAt: { gte: since },
      id: options.excludeGenerationJobId ? { not: options.excludeGenerationJobId } : undefined,
    },
  });
}

export async function getGenerationUsageSummary(workspaceId: string, planCode: string, options: UsageSummaryOptions = {}) {
  const plan = await getPlanConfig(normalizePlanCode(planCode));
  const today = startOfToday();
  const thisMonth = startOfThisMonth();
  const [dailyUsed, monthlyUsed, dailyReserved, monthlyReserved] = await Promise.all([
    sumUsage(workspaceId, today),
    sumUsage(workspaceId, thisMonth),
    countQueuedReservations(workspaceId, today, options),
    countQueuedReservations(workspaceId, thisMonth, options),
  ]);
  const dailyTotal = dailyUsed + dailyReserved;
  const monthlyTotal = monthlyUsed + monthlyReserved;

  return {
    plan,
    daily: {
      used: dailyTotal,
      limit: plan.dailyGenerationLimit,
      remaining: plan.dailyGenerationLimit === null ? null : Math.max(plan.dailyGenerationLimit - dailyTotal, 0),
    },
    monthly: {
      used: monthlyTotal,
      limit: plan.monthlyGenerationLimit,
      remaining: plan.monthlyGenerationLimit === null ? null : Math.max(plan.monthlyGenerationLimit - monthlyTotal, 0),
    },
  };
}

export async function getImageGenerationUsageSummary(workspaceId: string, planCode: string) {
  const plan = await getPlanConfig(normalizePlanCode(planCode));
  const today = startOfToday();
  const thisMonth = startOfThisMonth();
  const [dailyUsed, monthlyUsed] = await Promise.all([
    sumUsage(workspaceId, today, "image_generation"),
    sumUsage(workspaceId, thisMonth, "image_generation"),
  ]);

  return {
    plan,
    daily: {
      used: dailyUsed,
      limit: plan.dailyImageGenerationLimit,
      remaining: plan.dailyImageGenerationLimit === null ? null : Math.max(plan.dailyImageGenerationLimit - dailyUsed, 0),
    },
    monthly: {
      used: monthlyUsed,
      limit: plan.monthlyImageGenerationLimit,
      remaining: plan.monthlyImageGenerationLimit === null ? null : Math.max(plan.monthlyImageGenerationLimit - monthlyUsed, 0),
    },
  };
}

export async function assertCanUseGeneration(workspaceId: string, planCode: string, options: UsageSummaryOptions = {}) {
  const summary = await getGenerationUsageSummary(workspaceId, planCode, options);

  if (summary.daily.limit !== null && summary.daily.used >= summary.daily.limit) {
    throw new Error(`Current plan allows ${summary.daily.limit} generations per day.`);
  }

  if (summary.monthly.limit !== null && summary.monthly.used >= summary.monthly.limit) {
    throw new Error(`Current plan allows ${summary.monthly.limit} generations per month.`);
  }
}

export async function assertCanUseImageGeneration(workspaceId: string, planCode: string, quantity = 1) {
  const summary = await getImageGenerationUsageSummary(workspaceId, planCode);

  if (summary.daily.limit !== null && summary.daily.used + quantity > summary.daily.limit) {
    throw new Error(`Current plan allows ${summary.daily.limit} AI images per day.`);
  }

  if (summary.monthly.limit !== null && summary.monthly.used + quantity > summary.monthly.limit) {
    throw new Error(`Current plan allows ${summary.monthly.limit} AI images per month.`);
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

export async function recordImageGenerationUsage(workspaceId: string, quantity = 1) {
  await prisma.usageLog.create({
    data: {
      workspaceId,
      key: "image_generation",
      quantity,
    },
  });
}
