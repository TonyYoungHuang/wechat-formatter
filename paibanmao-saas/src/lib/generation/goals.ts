export type ContentGoal = "growth" | "search" | "conversion" | "trust" | "interaction";

export const contentGoalStrategies: Record<
  ContentGoal,
  {
    label: string;
    strategy: string;
    requirements: string[];
    cta: string;
  }
> = {
  growth: {
    label: "涨粉",
    strategy: "目标是让陌生读者愿意关注，内容要有“为什么以后还值得看你”的理由。",
    requirements: [
      "开头要让新读者马上知道这个账号长期会解决什么问题。",
      "公众号结尾必须给出关注理由，而不是只说欢迎关注。",
      "小绿书和朋友圈要强调收藏、转发和后续系列感。",
      "不要硬卖产品，先建立“这个账号以后还会继续讲清楚”的期待。",
    ],
    cta: "如果你也关心这个方向，可以先关注/收藏，后面我会继续把这类问题拆细。",
  },
  search: {
    label: "搜索",
    strategy: "目标是微信搜一搜承接，必须输出关键词、长尾词、搜索型标题、摘要。",
    requirements: [
      "搜一搜入口必须包含主关键词、长尾关键词、搜索型标题和摘要前 100 字。",
      "公众号标题和小标题要自然覆盖用户可能搜索的问题。",
      "问一问入口要像真实问题的回答，先直接回答，再补充边界。",
      "避免只写情绪标题，必须有可检索的具体词。",
    ],
    cta: "如果你是搜到这个问题的，可以先收藏，后面按步骤慢慢核对。",
  },
  conversion: {
    label: "转化",
    strategy: "目标是转化，必须有痛点、解决路径、产品/服务承接和克制 CTA。",
    requirements: [
      "先写清楚读者的痛点和为什么自己做会卡住。",
      "正文必须给出解决路径，再自然引到产品、服务、资料包或咨询。",
      "CTA 要克制，像顺手提醒，不要强卖、不要制造焦虑。",
      "朋友圈要适合私信咨询或领取资料，不要像广告海报。",
    ],
    cta: "如果你想少走一点弯路，可以先把自己的情况发我，我再看适合从哪一步开始。",
  },
  trust: {
    label: "信任",
    strategy: "目标是建立信任，要有边界、适合谁/不适合谁、真实判断，不强卖。",
    requirements: [
      "必须写清楚适合谁、不适合谁，不能每个人都劝做。",
      "允许保留不确定和限制条件，像真实主理人的判断。",
      "不要夸大收益、效果、排名和平台规则。",
      "结尾少卖，多做风险提醒和下一步建议。",
    ],
    cta: "这件事不适合所有人，先判断自己适不适合，再决定要不要继续做。",
  },
  interaction: {
    label: "互动",
    strategy: "目标是评论/私信/朋友圈互动，要有问题钩子、讨论话术和互动 CTA。",
    requirements: [
      "开头或结尾要设计一个容易回答的问题钩子。",
      "朋友圈入口必须有讨论话术，例如让读者选 A/B 或说出卡点。",
      "问一问入口要适合延展成评论区讨论。",
      "CTA 以评论、私信、投票、补充经历为主，不要急着成交。",
    ],
    cta: "你现在最卡的是哪一步？可以直接留言或私信说一句，我看看后面要不要单独拆。",
  },
};

export function getContentGoalStrategy(goal: string) {
  if (Object.prototype.hasOwnProperty.call(contentGoalStrategies, goal)) {
    return contentGoalStrategies[goal as ContentGoal];
  }

  return contentGoalStrategies.growth;
}
