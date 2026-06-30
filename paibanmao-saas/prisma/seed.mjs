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
      dailyImageGenerationLimit: 0,
      monthlyImageGenerationLimit: 0,
      advancedChecks: false,
    },
  },
  {
    code: "starter",
    name: "入门版",
    description: "适合一个人运营多个微信副业账号。",
    priceCents: 1990,
    sortOrder: 1,
    entitlements: {
      accountProfileLimit: 3,
      dailyGenerationLimit: null,
      monthlyGenerationLimit: 150,
      dailyImageGenerationLimit: 3,
      monthlyImageGenerationLimit: 60,
      advancedChecks: false,
    },
  },
  {
    code: "pro",
    name: "专业版",
    description: "适合高频创作者和小团队做微信内容矩阵。",
    priceCents: 6900,
    sortOrder: 2,
    entitlements: {
      accountProfileLimit: 10,
      dailyGenerationLimit: null,
      monthlyGenerationLimit: 500,
      dailyImageGenerationLimit: 10,
      monthlyImageGenerationLimit: 300,
      advancedChecks: true,
    },
  },
];

const promptTemplates = [
  {
    key: "five_entry_generation",
    version: 3,
    content: [
      "选题: {{topic}}",
      "内容目标: {{goal}}",
      "账号名称: {{accountName}}",
      "领域: {{niche}}",
      "人设: {{persona}}",
      "目标读者: {{audience}}",
      "读者痛点: {{audiencePainPoints}}",
      "产品或服务: {{productOrService}}",
      "变现方式: {{monetizationMethods}}",
      "语气风格: {{tone}}",
      "常用 CTA: {{commonCta}}",
      "禁用表达: {{forbiddenWords}}",
      "参考样文: {{sampleText}}",
      "",
      "请围绕同一个选题，生成公众号、小绿书、搜一搜、问一问、朋友圈五个微信入口内容。",
      "写得像一个真实微信创作者刚整理完思路后发出来的内容，不要像 AI 助手、课程讲义、营销海报或新闻通稿。",
      "少用“首先、其次、最后、综上所述、在当今时代、赋能、闭环、全方位、打造个人品牌”。",
      "需要转折时，用更口语的表达: “先说我的判断”“这里容易踩坑”“换个更小的说法”“别急着做复杂”。",
      "每个入口至少要有一个具体读者场景，例如下班后只有 1 小时、手里只有一个小号、写了三篇没人看、不知道朋友圈怎么转。",
      "可以有犹豫、边界和提醒，不要每句话都很确定。不要编造作者亲身经历、收入数字、截图、平台排名、客户案例。",
      "公众号要像长文草稿；小绿书要像轻图文；搜一搜要像真实搜索问题；问一问要像懂行的人认真回答；朋友圈要像个人转发。",
      "不要承诺 guaranteed 流量、收益、排名、审核通过、医疗/金融结果。",
    ].join("\n"),
  },
  {
    key: "topic_generation",
    version: 3,
    content: [
      "账号名称: {{accountName}}",
      "领域: {{niche}}",
      "人设: {{persona}}",
      "目标读者: {{audience}}",
      "读者痛点: {{audiencePainPoints}}",
      "产品或服务: {{productOrService}}",
      "变现方式: {{monetizationMethods}}",
      "语气风格: {{tone}}",
      "常用 CTA: {{commonCta}}",
      "禁用表达: {{forbiddenWords}}",
      "参考样文: {{sampleText}}",
      "本次主题: {{theme}}",
      "变现目标: {{monetizationGoal}}",
      "避免方向: {{avoid}}",
      "生成数量: {{count}}",
      "",
      "请生成一组适合公众号、小绿书、搜一搜、问一问和朋友圈复用的微信内容选题。",
      "选题要像真人会写的题，而不是 AI 生成的栏目名。",
      "具体到一个读者眼前的问题，标题里尽量出现真实处境、动作或矛盾，例如写了 3 篇没人看、每天只有 1 小时、不知道该不该继续。",
      "reason 要像编辑给作者的选题建议，说明为什么值得写、读者为什么会点开、后面怎么接转化。",
      "不要制造焦虑，不要夸大收益，不要洗稿搬运，不要碰瓷热点。",
    ].join("\n"),
  },
  {
    key: "image_prompt_generation",
    version: 3,
    content: [
      "主题: {{topic}}",
      "图片场景: {{scene}}",
      "视觉风格: {{style}}",
      "页数: {{pageCount}}",
      "",
      "请生成适合微信图文、小绿书或公众号封面的中文图片提示词，只输出提示词建议，不要声称已经生成图片。",
      "图片要像一个真实创作者会发的微信图文卡片，不要像夸张广告海报。",
      "可见中文要短，像人写的卡片标题，不要写满口号。比如“先别急着写文章”“普通人先做这一步”。",
      "每条提示词都要包含画面比例、主体、中文标题区域、正文留白、信息层级、配色和 CTA 预留位置。",
      "小绿书分页要有节奏: 封面钩子页、问题页、方法页、清单页、结尾行动页。页数不足时按这个顺序取前几类。",
      "视觉上保持轻微信绿色工作台、白底、浅绿、清爽可信；不要廉价海报感、强促销按钮、复杂背景。",
      "不要包含真实品牌 Logo、平台背书、夸大收益、违规导流或容易误导的可见文字。",
    ].join("\n"),
  },
  {
    key: "ai_tone_rewrite",
    version: 3,
    content: [
      "标题: {{title}}",
      "改写目标: {{goal}}",
      "账号名称: {{accountName}}",
      "领域: {{niche}}",
      "人设: {{persona}}",
      "目标读者: {{audience}}",
      "语气风格: {{tone}}",
      "常用 CTA: {{commonCta}}",
      "禁用表达: {{forbiddenWords}}",
      "",
      "原文:",
      "{{content}}",
      "",
      "请把原文改写成更像真实创作者写给微信读者的表达，重点是去掉 AI 味。",
      "保留事实、结构和核心观点，不要编造案例、数据、收入、流量、排名、截图或审核结果。",
      "删除或替换模板词: 首先、其次、最后、综上所述、不可否认、在当今时代、赋能、闭环、全方位、助力、打造。",
      "把过度整齐的句子打散，允许长短句混合。公众号里更像真人的表达，通常不是每段都一样长。",
      "加入读者正在经历的具体场景，但只能基于原文和账号信息合理推断，不要编故事。",
      "允许有边界感: 哪些人适合、哪些人不适合、这件事不能指望马上见效。",
      "CTA 如果生硬，改成轻一点的微信表达。",
    ].join("\n"),
  },
];

const providerName = process.env.AI_DEFAULT_PROVIDER || "requesty";
const providerBaseUrl = process.env.AI_OPENAI_COMPATIBLE_BASE_URL || process.env.REQUESTY_BASE_URL;
const providerApiKey = process.env.AI_OPENAI_COMPATIBLE_API_KEY || process.env.REQUESTY_API_KEY;
const providerModel = process.env.AI_DEFAULT_MODEL || process.env.REQUESTY_TEXT_MODEL || "anthropic/claude-3-5-sonnet-latest";
const providerApiKeyRef = process.env.REQUESTY_API_KEY ? "REQUESTY_API_KEY" : "AI_OPENAI_COMPATIBLE_API_KEY";
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
  await prisma.promptTemplate.updateMany({
    where: { key: template.key, active: true },
    data: { active: false },
  });

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
