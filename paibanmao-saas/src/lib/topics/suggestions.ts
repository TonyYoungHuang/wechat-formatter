import type { ContentEntry, ContentGoal } from "@prisma/client";

type AccountProfileLike = {
  name: string;
  niche: string;
  audience: string;
  productOrService: string;
};

const entrySets: ContentEntry[][] = [
  ["wechat_article", "search", "moments"],
  ["wechat_article", "green_note", "moments"],
  ["question", "search", "wechat_article"],
  ["green_note", "question", "moments"],
  ["wechat_article", "green_note", "search", "question", "moments"],
];

const goals: ContentGoal[] = ["growth", "search", "conversion", "trust", "interaction"];

export function buildTopicSuggestions(input: {
  profile: AccountProfileLike;
  theme: string;
  monetizationGoal: string;
  avoid?: string;
  count: number;
}) {
  const { profile, theme, monetizationGoal, count } = input;
  const base = [
    `${profile.audience}做${theme}最容易踩的 3 个坑`,
    `${theme}新手如何从一个小选题开始验证需求`,
    `${profile.niche}账号如何用${theme}承接私域咨询`,
    `${theme}适合发公众号还是小绿书`,
    `${profile.audience}为什么看了很多教程还是做不起来`,
    `${profile.productOrService || profile.name}可以如何自然植入${theme}内容`,
    `${theme}的搜一搜关键词怎么布局`,
    `围绕${theme}设计一组问一问回答`,
    `${theme}内容如何发朋友圈不显得硬广`,
    `${profile.name}本周可以连续更新的${theme}选题清单`,
  ];

  return base.slice(0, count).map((title, index) => ({
    title,
    reason: `围绕 ${profile.audience} 的真实问题展开，目标是 ${monetizationGoal}，可拆成多入口复用。`,
    goals: [goals[index % goals.length]],
    entries: entrySets[index % entrySets.length],
  }));
}
