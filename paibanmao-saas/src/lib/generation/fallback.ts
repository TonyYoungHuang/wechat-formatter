import type { ContentEntry } from "@/lib/content/entries";

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
  const { topic, accountProfile } = input;
  const cta = accountProfile.commonCta || "如果你也在做公众号副业，可以先从一个小选题开始测试。";

  return [
    {
      entry: "wechat_article",
      title: `${topic}：给${accountProfile.audience}的一份实操拆解`,
      body: [
        `# ${topic}`,
        "",
        `这篇文章面向${accountProfile.audience}，用${accountProfile.tone}的方式讲清楚这个问题。`,
        "",
        "## 为什么这个选题值得写",
        `它和「${accountProfile.niche}」相关，也能承接账号「${accountProfile.name}」的长期定位。`,
        "",
        "## 可以怎么展开",
        "1. 先讲读者当下的困惑。",
        "2. 再给一个能马上执行的小步骤。",
        "3. 最后自然引导到你的产品、服务或资料包。",
        "",
        "## 结尾 CTA",
        cta,
      ].join("\n"),
      metadata: { format: "markdown", export: "wechat_html" },
    },
    {
      entry: "green_note",
      title: `${topic}，先做这 3 步`,
      body: [
        `适合小绿书的短图文结构：${topic}`,
        "",
        "第 1 页：一句话点出痛点。",
        "第 2 页：告诉读者为什么现在适合做。",
        "第 3 页：给一个最小行动清单。",
        "",
        `短文案：${accountProfile.audience}不要一上来就追求爆款，先把一个选题拆成多个微信入口。`,
      ].join("\n"),
      metadata: {
        pages: 3,
        imagePrompts: [
          `微信绿色轻工作台风格封面，主题：${topic}，干净留白，适合中文短图文`,
          "步骤清单页，浅绿色背景，三条简洁中文要点",
          "结尾行动页，包含关注、收藏、私信关键词的视觉空间",
        ],
      },
    },
    {
      entry: "search",
      title: `${topic}怎么做`,
      body: [
        "搜一搜关键词建议：",
        `- ${topic}`,
        `- ${accountProfile.niche}怎么做`,
        `- ${accountProfile.audience}公众号副业`,
        "",
        "搜索型摘要建议：",
        `本文用一篇文章讲清「${topic}」的可执行步骤，适合${accountProfile.audience}参考。`,
      ].join("\n"),
      metadata: { keywords: [topic, accountProfile.niche, accountProfile.audience] },
    },
    {
      entry: "question",
      title: `${topic}，普通人应该怎么开始？`,
      body: [
        "问一问回答草稿：",
        `如果你是${accountProfile.audience}，建议先不要把目标定成马上变现。`,
        "更稳的做法是：先确定一个垂直问题，再连续输出 7-14 天，观察哪类内容有人收藏、评论和私信。",
        "",
        `可以从「${topic}」这个方向开始测试。${cta}`,
      ].join("\n"),
      metadata: { answerTone: accountProfile.tone },
    },
    {
      entry: "moments",
      title: `朋友圈转发：${topic}`,
      body: [
        `今天把「${topic}」拆了一遍。`,
        "",
        "我越来越觉得，做公众号副业不是每天硬写长文，而是把一个好选题拆成公众号、小绿书、搜一搜、问一问和朋友圈。",
        "",
        "这样一个内容资产能用很多次，也更适合普通人慢慢积累。",
      ].join("\n"),
      metadata: { cta },
    },
  ];
}

export function buildImagePrompts(topic: string, scene: string, style: string) {
  return {
    topic,
    scene,
    style,
    prompts: [
      `${style}，中文封面图，主题「${topic}」，主体清晰，浅绿色留白，适合微信公众号和小绿书`,
      `${style}，步骤说明页，3 个信息层级，适合 3:4 手机图文比例`,
      `${style}，结尾行动页，预留中文标题和 CTA 位置，不要复杂背景`,
    ],
  };
}

