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
    name: "免费版",
    description: "适合体验排版猫的五入口生成能力。",
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
    name: "入门版",
    description: "适合一个人运营多个微信副业账号。",
    priceCents: null,
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
    name: "专业版",
    description: "适合高频创作者和小团队做微信内容矩阵。",
    priceCents: null,
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
      "每个入口都要适配对应场景，不要简单复制同一段内容。",
      "小绿书入口需要在 metadata.imagePrompts 中给出图片提示词。",
      "搜一搜入口需要在 metadata.keywords 中给出关键词。",
      "不要承诺 guaranteed 流量、收入、排名、审核通过或高风险结果。",
    ].join("\n"),
  },
  {
    key: "topic_generation",
    version: 1,
    content: [
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
      "本次主题：{{theme}}",
      "变现目标：{{monetizationGoal}}",
      "避免方向：{{avoid}}",
      "生成数量：{{count}}",
      "",
      "请生成一组适合公众号、小绿书、搜一搜、问一问和朋友圈复用的微信内容选题。",
      "每个选题需要包含：title、reason、goals、entries。",
      "goals 只能从 growth、search、conversion、trust、interaction 中选择。",
      "entries 只能从 wechat_article、green_note、search、question、moments 中选择。",
      "选题要具体、可执行、可连续创作，并避免夸大收益或洗稿搬运定位。",
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
      "请生成适合微信图文、小绿书或公众号封面的中文图片提示词。",
      "只输出提示词建议，不要调用真实图片生成。",
    ].join("\n"),
  },
  {
    key: "ai_tone_rewrite",
    version: 1,
    content: [
      "标题：{{title}}",
      "改写目标：{{goal}}",
      "账号名称：{{accountName}}",
      "领域：{{niche}}",
      "人设：{{persona}}",
      "目标读者：{{audience}}",
      "语气风格：{{tone}}",
      "常用 CTA：{{commonCta}}",
      "禁用表达：{{forbiddenWords}}",
      "",
      "原文：",
      "{{content}}",
      "",
      "请把原文改写成更像真实创作者写给微信读者的表达，降低模板感和 AI 味。",
      "保留事实、结构和核心观点，不要编造数据，不要承诺收益、流量、排名或平台审核结果。",
      "如果 CTA 生硬，请改成更自然的微信生态引导。",
    ].join("\n"),
  },
];

const providerName = process.env.AI_DEFAULT_PROVIDER || "openai-compatible";
const providerBaseUrl = process.env.AI_OPENAI_COMPATIBLE_BASE_URL;
const providerApiKey = process.env.AI_OPENAI_COMPATIBLE_API_KEY;
const providerModel = process.env.AI_DEFAULT_MODEL || "gpt-4.1-mini";
const providerApiKeyRef = "AI_OPENAI_COMPATIBLE_API_KEY";
const providerModelPurposes = ["content", "topic", "rewrite", "image"];

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

if (providerBaseUrl && providerApiKey) {
  await prisma.aiProvider.upsert({
    where: { name: providerName },
    create: {
      name: providerName,
      type: "openai-compatible",
      baseUrl: providerBaseUrl,
      apiKeyRef: providerApiKeyRef,
      active: true,
      models: {
        create: providerModelPurposes.map((purpose) => ({
          name: `${providerModel} ${purpose}`,
          modelId: providerModel,
          purpose,
          active: true,
        })),
      },
    },
    update: {
      type: "openai-compatible",
      baseUrl: providerBaseUrl,
      apiKeyRef: providerApiKeyRef,
      active: true,
      models: {
        deleteMany: {},
        create: providerModelPurposes.map((purpose) => ({
          name: `${providerModel} ${purpose}`,
          modelId: providerModel,
          purpose,
          active: true,
        })),
      },
    },
  });
}

await prisma.$disconnect();
