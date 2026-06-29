import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const plans = [
  {
    code: "free",
    name: "Free",
    description: "For trying the five-entry WeChat content workflow.",
    priceCents: 0,
    sortOrder: 0,
    entitlements: {
      accountProfileLimit: 1,
      dailyGenerationLimit: 1,
      monthlyGenerationLimit: null,
      advancedChecks: false,
    },
  },
  {
    code: "starter",
    name: "Starter",
    description: "For individual creators operating several WeChat side-project accounts.",
    priceCents: 0,
    sortOrder: 1,
    entitlements: {
      accountProfileLimit: 3,
      dailyGenerationLimit: null,
      monthlyGenerationLimit: null,
      advancedChecks: false,
    },
  },
  {
    code: "pro",
    name: "Pro",
    description: "For high-frequency creators and small WeChat content teams.",
    priceCents: 0,
    sortOrder: 2,
    entitlements: {
      accountProfileLimit: 10,
      dailyGenerationLimit: null,
      monthlyGenerationLimit: null,
      advancedChecks: true,
    },
  },
];

for (const plan of plans) {
  await prisma.pricingPlan.upsert({
    where: { code: plan.code },
    create: {
      code: plan.code,
      name: plan.name,
      description: plan.description,
      priceCents: plan.priceCents,
      sortOrder: plan.sortOrder,
    },
    update: {
      name: plan.name,
      description: plan.description,
      priceCents: plan.priceCents,
      sortOrder: plan.sortOrder,
      active: true,
    },
  });

  for (const [key, rawValue] of Object.entries(plan.entitlements)) {
    await prisma.planEntitlement.upsert({
      where: {
        planCode_key: {
          planCode: plan.code,
          key,
        },
      },
      create: {
        planCode: plan.code,
        key,
        value: rawValue === null ? "null" : String(rawValue),
      },
      update: {
        value: rawValue === null ? "null" : String(rawValue),
      },
    });
  }
}

await prisma.$disconnect();
