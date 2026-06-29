import type { ContentEntry } from "@/lib/content/entries";

export type PublicTemplate = {
  slug: string;
  title: string;
  category: string;
  entry: ContentEntry | "all";
  suitableFor: string;
  preview: string;
  sections: string[];
};

export const publicTemplates: PublicTemplate[] = [
  {
    slug: "wechat-problem-solution",
    title: "公众号痛点解决型长文模板",
    category: "公众号长文",
    entry: "wechat_article",
    suitableFor: "适合副业、知识服务、咨询、课程类账号",
    preview: "用一个真实痛点开头，接着解释原因、给出步骤，最后自然引导关注或领取资料。",
    sections: ["痛点场景", "为什么会这样", "三到五步解决方案", "案例或对比", "结尾 CTA"],
  },
  {
    slug: "green-note-card-script",
    title: "小绿书 6 页图文脚本模板",
    category: "小绿书图文",
    entry: "green_note",
    suitableFor: "适合把公众号选题改成轻量图文",
    preview: "一页一个观点，用封面钩子、问题解释、步骤拆解和总结页完成一次快速种草。",
    sections: ["封面标题", "痛点页", "原因页", "步骤 1-3", "避坑页", "总结 CTA 页"],
  },
  {
    slug: "wechat-search-keyword-layout",
    title: "微信搜一搜关键词布局模板",
    category: "搜索增长",
    entry: "search",
    suitableFor: "适合希望文章长期被搜索的人群",
    preview: "围绕主关键词、长尾问题、摘要前 100 字和小标题做自然布局，不堆砌关键词。",
    sections: ["主关键词", "长尾问题", "搜索型标题", "摘要前 100 字", "正文关键词分布"],
  },
  {
    slug: "question-answer-trust",
    title: "问一问信任回答模板",
    category: "问一问",
    entry: "question",
    suitableFor: "适合通过问答建立专业感和关注入口",
    preview: "先直接回答，再解释判断依据，最后给出行动建议，避免硬广和空泛鸡汤。",
    sections: ["一句话答案", "适合谁", "不适合谁", "具体做法", "关注引导"],
  },
  {
    slug: "moments-soft-cta",
    title: "朋友圈自然转发模板",
    category: "私域转化",
    entry: "moments",
    suitableFor: "适合资料包、咨询、社群和课程转化",
    preview: "用个人观察开头，不直接卖货，把文章价值和领取动作说清楚。",
    sections: ["个人观察", "为什么值得看", "适合谁", "一句行动引导", "评论或私信 CTA"],
  },
  {
    slug: "five-entry-launch",
    title: "一个选题五入口发布模板",
    category: "五入口联动",
    entry: "all",
    suitableFor: "适合一周内容计划和多账号矩阵",
    preview: "同一个选题拆成公众号深度、小绿书卡片、搜一搜关键词、问一问回答和朋友圈转发。",
    sections: ["公众号主文", "小绿书脚本", "搜一搜标题", "问一问答案", "朋友圈转发"],
  },
];

export const templateEntryLabels: Record<PublicTemplate["entry"], string> = {
  all: "五入口",
  wechat_article: "公众号",
  green_note: "小绿书",
  search: "搜一搜",
  question: "问一问",
  moments: "朋友圈",
};
