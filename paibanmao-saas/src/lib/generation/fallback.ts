import type { ContentEntry } from "@/lib/content/entries";
import { getContentGoalStrategy } from "@/lib/generation/goals";

type AccountProfileLike = {
  name: string;
  niche: string;
  persona: string;
  audience: string;
  productOrService: string;
  commonCta: string;
  tone: string;
};

export type GeneratedVariant = {
  entry: ContentEntry;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export function buildFallbackFiveEntry(input: {
  topic: string;
  goal: string;
  accountProfile: AccountProfileLike;
}): GeneratedVariant[] {
  const { topic, accountProfile, goal } = input;
  const goalStrategy = getContentGoalStrategy(goal);
  const cta = accountProfile.commonCta || goalStrategy.cta;
  const audience = accountProfile.audience || "微信副业创作者";
  const niche = accountProfile.niche || "微信内容增长";
  const tone = accountProfile.tone || "自然、直接";
  const product = accountProfile.productOrService || "资料包、咨询或轻课程";
  const goalChecklist = goalStrategy.requirements.map((item, index) => `${index + 1}. ${item}`);

  return [
    {
      entry: "wechat_article",
      title: `${topic}: 给${audience}的一份${goalStrategy.label}向拆解`,
      body: [
        `# ${topic}`,
        "",
        `这篇文章面向${audience}，用${tone}的方式讲清楚这个问题。`,
        "",
        "## 这次内容目标",
        goalStrategy.strategy,
        "",
        "## 这次必须做到",
        ...goalChecklist,
        "",
        "## 为什么这个选题值得写",
        `它和「${niche}」相关，也能承接账号「${accountProfile.name}」的长期定位。读者缺的通常不是信息，而是一套能马上执行的小步骤。`,
        "",
        "## 可以怎么展开",
        "1. 先讲读者当下的具体困境，不要一上来就给宏大结论。",
        "2. 再给一个能马上执行的小动作，让读者觉得这件事可以开始。",
        "3. 最后自然引导到你的产品、服务或资料包。",
        "",
        "## 可放入正文的案例角度",
        `如果你的产品是「${product}」，可以把它放在结尾作为下一步选择，而不是在开头硬推。`,
        "",
        "## 结尾 CTA",
        cta,
      ].join("\n"),
      metadata: { format: "markdown", export: "wechat_html", goal: goalStrategy.label },
    },
    {
      entry: "green_note",
      title: `${topic}: ${goalStrategy.label}版 3 页图文`,
      body: [
        `适合小绿书的短图文结构: ${topic}`,
        "",
        "第 1 页: 一句话点出痛点。",
        `第 2 页: 围绕「${goalStrategy.label}」给出一个具体判断。`,
        "第 3 页: 给一个最小行动清单和自然 CTA。",
        "",
        `短文案: ${audience}不要一上来就追求爆款，先把一个选题拆成多个微信入口。这个版本重点服务「${goalStrategy.label}」目标: ${goalStrategy.strategy}`,
      ].join("\n"),
      metadata: {
        goal: goalStrategy.label,
        pages: 3,
        imagePrompts: [
          `轻微信绿色工作台风格封面，3:4 竖版，主题「${topic}」，大标题区域清晰，浅绿色与白色留白，适合中文短图文`,
          "步骤清单页，浅绿色背景，三条简洁中文要点，信息层级清楚，手机屏幕可读，避免小字密集",
          "结尾行动页，预留关注、收藏、私信关键词的视觉空间，干净克制，适合微信创作者工具感",
        ],
      },
    },
    {
      entry: "search",
      title: `${topic}怎么做`,
      body: [
        "搜一搜关键词建议:",
        `- ${topic}`,
        `- ${niche}怎么做`,
        `- ${audience}公众号副业`,
        "",
        "内容目标承接:",
        goalStrategy.strategy,
        "",
        "搜索型标题建议:",
        `普通人做${topic}，先解决这 3 个问题`,
        "",
        "摘要前 100 字建议:",
        `本文用一篇文章讲清「${topic}」的可执行步骤，适合${audience}参考。`,
      ].join("\n"),
      metadata: { keywords: [topic, `${niche}怎么做`, `${audience}公众号副业`], goal: goalStrategy.label },
    },
    {
      entry: "question",
      title: `${topic}，普通人应该怎么开始？`,
      body: [
        "问一问回答草稿:",
        `如果你是${audience}，建议先不要把目标定成马上变现。`,
        "更稳的做法是: 先确定一个垂直问题，再连续输出 7-14 天，观察哪类内容有人收藏、评论和私信。",
        "",
        `可以从「${topic}」这个方向开始测试。${cta}`,
      ].join("\n"),
      metadata: { answerTone: accountProfile.tone, goal: goalStrategy.label },
    },
    {
      entry: "moments",
      title: `朋友圈转发: ${topic}`,
      body: [
        `今天把「${topic}」拆了一遍。`,
        "",
        "我越来越觉得，做公众号副业不是每天硬写长文，而是把一个好选题拆成公众号、小绿书、搜一搜、问一问和朋友圈。",
        "",
        "这样一个内容资产能用很多次，也更适合普通人慢慢积累。",
        "",
        goalStrategy.cta,
      ].join("\n"),
      metadata: { cta, goal: goalStrategy.label },
    },
  ];
}

export function buildImagePrompts(topic: string, scene: string, style: string, pageCount = 3) {
  const greenNotePagePrompts = Array.from({ length: pageCount }, (_, index) => {
    const pageNumber = index + 1;
    const pageRole =
      pageNumber === 1 ? "封面钩子页" : pageNumber === pageCount ? "结尾行动页" : `第 ${pageNumber} 页观点拆解`;

    return `${style}，微信小绿书 3:4 竖版图文，主题「${topic}」，${pageRole}，中文标题醒目，正文留白充足，信息层级清晰，适合手机阅读，避免真实平台 Logo 和夸大收益表达`;
  });
  const prompts =
    scene === "green_note_pages"
      ? greenNotePagePrompts
      : [
          `${style}，中文封面图，主题「${topic}」，主体清晰，浅绿色留白，适合微信公众号和小绿书，预留大标题和短副标题区域`,
          `${style}，步骤说明页，3 个信息层级，适合 3:4 手机图文比例，中文短句排版清楚，避免小字密集`,
          `${style}，结尾行动页，预留中文标题和 CTA 位置，背景干净，不要复杂装饰和夸大承诺`,
        ];

  return {
    topic,
    scene,
    pageCount: scene === "green_note_pages" ? pageCount : undefined,
    style,
    prompts,
    imageGenerationReady: false,
    nextStep: "当前先生成图片提示词；开通 Gemini 生图后可将 prompts 数组逐条发送给图片生成模型。",
  };
}
