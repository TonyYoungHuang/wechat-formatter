import type { Prisma } from "@prisma/client";

import type { PlanCode, PlanConfig } from "@/lib/entitlements/plans";
import { defaultPlans } from "@/lib/entitlements/plans";
import { prisma } from "@/lib/db/prisma";

const entitlementKeys = [
  "accountProfileLimit",
  "dailyGenerationLimit",
  "monthlyGenerationLimit",
  "advancedChecks",
] as const;

function parseNullableInt(value: string | undefined, fallback: number | null) {
  if (value === undefined || value === "null") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return fallback;
}

export async function getPlanConfigs(): Promise<PlanConfig[]> {
  const rows = await prisma.pricingPlan.findMany({
    include: { entitlements: true },
    orderBy: { sortOrder: "asc" },
  });

  return defaultPlans.map((fallback, index) => {
    const row = rows.find((plan) => plan.code === fallback.code);
    const entitlements = new Map(row?.entitlements.map((item) => [item.key, item.value]));

    return {
      code: fallback.code,
      name: row?.name ?? fallback.name,
      description: row?.description ?? fallback.description,
      priceCents: row?.priceCents ?? fallback.priceCents,
      accountProfileLimit: parseNullableInt(entitlements.get("accountProfileLimit"), fallback.accountProfileLimit) ?? fallback.accountProfileLimit,
      dailyGenerationLimit: parseNullableInt(entitlements.get("dailyGenerationLimit"), fallback.dailyGenerationLimit),
      monthlyGenerationLimit: parseNullableInt(entitlements.get("monthlyGenerationLimit"), fallback.monthlyGenerationLimit),
      advancedChecks: parseBoolean(entitlements.get("advancedChecks"), fallback.advancedChecks),
      sortOrder: row?.sortOrder ?? index,
    };
  });
}

export async function getPlanConfig(code: PlanCode) {
  const plans = await getPlanConfigs();
  return plans.find((plan) => plan.code === code) ?? plans[0];
}

export async function getPricingVersions(limit = 20) {
  return prisma.pricingVersion.findMany({
    orderBy: [{ createdAt: "desc" }, { version: "desc" }],
    take: limit,
  });
}

async function recordPricingVersion(code: PlanCode, snapshot: PlanConfig, note?: string) {
  const latest = await prisma.pricingVersion.aggregate({
    where: { planCode: code },
    _max: { version: true },
  });
  const version = (latest._max.version ?? 0) + 1;

  return prisma.pricingVersion.create({
    data: {
      planCode: code,
      version,
      snapshot: snapshot as unknown as Prisma.InputJsonValue,
      note,
    },
  });
}

export async function upsertPlanConfig(code: PlanCode, patch: Partial<PlanConfig>, options: { recordVersion?: boolean; note?: string } = {}) {
  const fallback = defaultPlans.find((plan) => plan.code === code) ?? defaultPlans[0];
  const data = {
    code,
    name: patch.name ?? fallback.name,
    description: patch.description ?? fallback.description,
    priceCents: patch.priceCents === undefined ? fallback.priceCents : patch.priceCents,
    active: true,
    sortOrder: defaultPlans.findIndex((plan) => plan.code === code),
  };

  await prisma.pricingPlan.upsert({
    where: { code },
    create: data,
    update: data,
  });

  const entitlements = {
    accountProfileLimit: patch.accountProfileLimit ?? fallback.accountProfileLimit,
    dailyGenerationLimit: patch.dailyGenerationLimit ?? fallback.dailyGenerationLimit,
    monthlyGenerationLimit: patch.monthlyGenerationLimit ?? fallback.monthlyGenerationLimit,
    advancedChecks: patch.advancedChecks ?? fallback.advancedChecks,
  };

  await Promise.all(
    entitlementKeys.map((key) =>
      prisma.planEntitlement.upsert({
        where: { planCode_key: { planCode: code, key } },
        create: {
          planCode: code,
          key,
          value: entitlements[key] === null ? "null" : String(entitlements[key]),
        },
        update: {
          value: entitlements[key] === null ? "null" : String(entitlements[key]),
        },
      }),
    ),
  );

  const plan = await getPlanConfig(code);

  if (options.recordVersion) {
    await recordPricingVersion(code, plan, options.note);
  }

  return plan;
}
