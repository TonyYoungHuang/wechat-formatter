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

const promptTemplates = [
  {
    key: "five_entry_generation",
    version: 1,
    content: [
      "选题：{{topic}}",
      "内容目标：{{goal}}",
      "账号名称：{{accountName}}",
      "领域：{{niche}}",
      "人设：{{persona}}",
      "目标读者：{{audience}}",
      "读者痛点：{{audiencePainPoints}}",
      "产品或服务：{{productOrService}}",
      "变现方式：{{monetizationMethods}}",
      "语气风格：{{tone}}",
      "常用 CTA：{{commonCta}}",
      "禁用表达：{{forbiddenWords}}",
      "参考样文：{{sampleText}}",
      "",
      "请生成公众号、小绿书、搜一搜、问一问、朋友圈五个微信入口内容。",
    ].join("\n"),
  },
  {
    key: "topic_generation",
    version: 1,
    content: [
      "账号名称：{{accountName}}",
      "领域：{{niche}}",
      "目标读者：{{audience}}",
      "本周主题：{{theme}}",
      "变现目标：{{monetizationGoal}}",
      "避免方向：{{avoid}}",
      "",
      "请生成适合五个微信入口复用的选题。",
    ].join("\n"),
  },
  {
    key: "image_prompt_generation",
    version: 1,
    content: [
      "主题：{{topic}}",
      "图片场景：{{scene}}",
      "视觉风格：{{style}}",
      "",
      "请生成适合微信图文和小绿书的中文图片提示词。",
    ].join("\n"),
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

for (const template of promptTemplates) {
  await prisma.promptTemplate.upsert({
    where: {
      key_version: {
        key: template.key,
        version: template.version,
      },
    },
    create: {
      key: template.key,
      version: template.version,
      content: template.content,
      active: true,
    },
    update: {
      content: template.content,
      active: true,
    },
  });
}

await prisma.$disconnect();
