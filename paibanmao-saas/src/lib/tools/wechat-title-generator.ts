import { z } from "zod";

export const wechatTitleGeneratorSchema = z.object({
  topic: z.string().trim().min(2).max(120),
  audience: z.string().trim().max(80).optional().default("微信内容创作者"),
  goal: z
    .enum(["growth", "search", "conversion", "trust", "interaction"])
    .optional()
    .default("growth"),
  tone: z.string().trim().max(60).optional().default("清晰、具体、有点击欲望"),
});

export type WechatTitleGeneratorInput = z.infer<typeof wechatTitleGeneratorSchema>;

export type WechatTitleSuggestion = {
  title: string;
  angle: string;
  entryFit: string;
  reason: string;
};

const goalLabels: Record<WechatTitleGeneratorInput["goal"], string> = {
  growth: "涨粉",
  search: "搜一搜",
  conversion: "转化",
  trust: "信任",
  interaction: "互动",
};

const templates = [
  {
    angle: "痛点直击",
    entryFit: "公众号头条",
    build: (topic: string, audience: string) => `${audience}做${topic}，最容易卡住的不是努力`,
    reason: "先点出目标人群，再制造认知反差，适合作为长文主标题。",
  },
  {
    angle: "搜一搜长尾",
    entryFit: "搜一搜",
    build: (topic: string) => `${topic}怎么做？一篇讲清楚新手最该先做的 5 件事`,
    reason: "包含搜索型问句和明确收益，利于覆盖微信搜一搜长尾需求。",
  },
  {
    angle: "清单方案",
    entryFit: "公众号收藏",
    build: (topic: string) => `我把${topic}拆成了 7 个可执行步骤`,
    reason: "清单结构降低阅读门槛，适合引导收藏和转发。",
  },
  {
    angle: "经验复盘",
    entryFit: "朋友圈转发",
    build: (topic: string) => `做${topic}一段时间后，我发现真正有用的是这几点`,
    reason: "第一人称更自然，适合个人 IP 和朋友圈二次分发。",
  },
  {
    angle: "避坑提醒",
    entryFit: "公众号头条",
    build: (topic: string) => `如果你准备做${topic}，这 4 个坑先别踩`,
    reason: "风险提醒有即时价值，能吸引准备行动的人群。",
  },
  {
    angle: "低门槛切入",
    entryFit: "小绿书",
    build: (topic: string, audience: string) => `${audience}也能开始的${topic}入门路线`,
    reason: "强调可开始、低压力，适合图文卡片和新手教程。",
  },
  {
    angle: "问题回答",
    entryFit: "问一问",
    build: (topic: string) => `现在做${topic}还来得及吗？我的真实判断`,
    reason: "用常见疑问做标题，可直接延展成问一问回答。",
  },
  {
    angle: "结果导向",
    entryFit: "转化内容",
    build: (topic: string) => `用一套简单流程，把${topic}从想法变成可发布内容`,
    reason: "突出流程和结果，适合承接资料包、咨询或课程转化。",
  },
  {
    angle: "对比判断",
    entryFit: "搜一搜",
    build: (topic: string) => `${topic}新手最该选哪种路径？我建议先看这张对比表`,
    reason: "对比型标题容易匹配决策搜索，也方便正文结构化展开。",
  },
  {
    angle: "反常识",
    entryFit: "公众号头条",
    build: (topic: string) => `做${topic}，一开始别急着追热点`,
    reason: "反常识观点能提高打开率，但表达不过度夸张。",
  },
  {
    angle: "互动提问",
    entryFit: "朋友圈",
    build: (topic: string) => `你觉得普通人做${topic}，最难的是哪一步？`,
    reason: "问题式标题更容易带来评论区互动和私域讨论。",
  },
  {
    angle: "信任建设",
    entryFit: "公众号深度文",
    build: (topic: string) => `认真聊聊${topic}：适合谁，不适合谁，怎么少走弯路`,
    reason: "边界感强，适合建立专业可信的内容人设。",
  },
];

export function generateWechatTitles(input: WechatTitleGeneratorInput): WechatTitleSuggestion[] {
  const topic = normalizePhrase(input.topic);
  const audience = normalizePhrase(input.audience || "微信内容创作者");
  const goalLabel = goalLabels[input.goal];
  const tone = normalizePhrase(input.tone || "清晰、具体、有点击欲望");

  return templates.map((template) => {
    const title = template.build(topic, audience);

    return {
      title,
      angle: `${template.angle} / ${goalLabel}`,
      entryFit: template.entryFit,
      reason: `${template.reason} 当前语气：${tone}。`,
    };
  });
}

function normalizePhrase(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
