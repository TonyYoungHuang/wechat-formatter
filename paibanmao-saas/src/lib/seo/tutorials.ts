export type TutorialArticle = {
  slug: string;
  title: string;
  description: string;
  category: string;
  readMinutes: number;
  answer: string;
  steps: string[];
  example: string;
  pitfalls: string[];
  toolHref: string;
  toolLabel: string;
  relatedSlugs: string[];
};

export const tutorialArticles: TutorialArticle[] = [
  {
    slug: "wechat-topic-to-five-entries",
    title: "一个公众号选题怎么拆成五个微信入口？",
    description: "用一个选题同时布局公众号、小绿书、搜一搜、问一问和朋友圈，适合副业创作者做内容矩阵。",
    category: "五入口内容矩阵",
    readMinutes: 6,
    answer: "先确定一个主问题，再把它拆成长文、短图文、搜索词、问答和私域转发五种表达。公众号负责完整论证，小绿书负责轻量传播，搜一搜负责被动搜索，问一问负责回答场景，朋友圈负责信任转化。",
    steps: [
      "把选题改写成一个明确问题，例如“普通人做公众号副业还有机会吗”。",
      "为公众号准备完整结构：结论、原因、步骤、案例和 CTA。",
      "为小绿书提炼 3 到 9 张图文页，每页只讲一个观点。",
      "为搜一搜列出主关键词、长尾关键词和搜索型标题。",
      "为问一问准备 3 到 5 个相关问题，并写出自然回答。",
      "为朋友圈写一个个人视角的转发理由，避免像广告。",
    ],
    example: "选题“普通人做公众号副业还有机会吗”可以拆成公众号长文《普通人做公众号副业，真正的机会在哪里》、小绿书《3 张图讲清普通人做公众号的第一步》、搜一搜关键词“公众号副业怎么赚钱”、问一问回答“现在做公众号还来得及吗”、朋友圈文案“这篇文章写给想做副业但不知道从哪开始的人”。",
    pitfalls: [
      "五个入口不要复制同一段正文，否则每个入口都不像自己的场景。",
      "不要先写标题再硬凑内容，先确定读者问题更稳。",
      "朋友圈不要直接堆卖点，先写为什么这篇内容值得看。",
    ],
    toolHref: "/tools/topic-generator",
    toolLabel: "使用公众号选题生成器",
    relatedSlugs: ["green-note-from-wechat-topic", "wechat-search-keywords"],
  },
  {
    slug: "green-note-from-wechat-topic",
    title: "小绿书文案怎么从公众号选题生成？",
    description: "把公众号长文改成适合微信小绿书图文形态的封面、分页脚本和图片提示词。",
    category: "小绿书",
    readMinutes: 5,
    answer: "小绿书不是把公众号文章截短，而是把一个长文观点拆成连续图片页。每一页只解决一个小问题，封面负责让用户停下，正文负责讲清路径，结尾负责引导去公众号读完整内容或领取资料。",
    steps: [
      "从公众号选题里挑出最强钩子，写成封面标题。",
      "把正文拆成 3、6 或 9 页，每页控制一个观点。",
      "每页使用“观点 + 解释 + 例子”的短结构。",
      "为每页生成图片提示词，注明主体、风格、构图和文字层级。",
      "结尾页放轻 CTA，比如“想看完整清单，可以去公众号看长文”。",
    ],
    example: "公众号选题“副业公众号怎么起步”可以变成小绿书封面“普通人做公众号，第一步别写文章”，第 1 页讲定位，第 2 页讲读者问题，第 3 页讲选题库，第 4 页放行动清单。",
    pitfalls: [
      "不要一页塞太多字，小绿书要让用户一眼扫懂。",
      "图片提示词不要只写“好看”，要写清构图、元素和文字层级。",
      "不要把结尾 CTA 写得太硬，微信生态里信任比强推更重要。",
    ],
    toolHref: "/tools/green-note-generator",
    toolLabel: "使用小绿书文案生成器",
    relatedSlugs: ["wechat-topic-to-five-entries", "moments-copy-for-wechat"],
  },
  {
    slug: "wechat-search-keywords",
    title: "微信搜一搜关键词怎么布局到公众号文章里？",
    description: "公众号文章做搜一搜优化时，如何选择主关键词、长尾词、标题和摘要。",
    category: "搜一搜",
    readMinutes: 6,
    answer: "搜一搜关键词要围绕真实搜索问题布局。标题放核心词，摘要前 100 字回答问题，正文小标题覆盖长尾词，问答段落承接用户的具体疑问。关键词要自然出现，不要堆砌。",
    steps: [
      "先写出用户会直接搜索的问题，例如“公众号副业怎么赚钱”。",
      "确定 1 个主关键词和 5 到 8 个长尾关键词。",
      "标题里放主关键词，但保留可读性。",
      "摘要前 100 字直接给答案，不绕弯。",
      "正文小标题覆盖不同搜索意图，比如成本、步骤、变现、避坑。",
      "在结尾加相关问题，方便扩展问一问和下一篇选题。",
    ],
    example: "主关键词“公众号副业怎么赚钱”，长尾词可以是“公众号副业新手怎么起步”“公众号副业资料包怎么卖”“公众号副业多久有收入”。文章标题可以写成《公众号副业怎么赚钱？普通人先从这 3 件事开始》。",
    pitfalls: [
      "不要为了关键词牺牲可读性，用户读不下去就没有转化。",
      "不要所有文章都抢同一个词，可以围绕长尾词做系列。",
      "不要只优化标题，摘要和小标题同样重要。",
    ],
    toolHref: "/tools/search-keyword-helper",
    toolLabel: "使用搜一搜关键词助手",
    relatedSlugs: ["wechat-topic-to-five-entries", "question-answer-to-wechat"],
  },
  {
    slug: "question-answer-to-wechat",
    title: "微信问一问回答怎么自然引导到公众号？",
    description: "为问一问写专业回答，同时自然引导用户关注公众号或阅读完整文章。",
    category: "问一问",
    readMinutes: 5,
    answer: "问一问回答要先解决问题，再补充经验，最后轻轻引导。不要一上来推广公众号。好的回答像一个有经验的人在帮忙，公众号只是延伸阅读入口。",
    steps: [
      "把选题改写成用户会问的问题。",
      "开头 2 到 3 句直接给结论。",
      "中间用列表讲清步骤或判断标准。",
      "加一个真实场景例子，降低 AI 味。",
      "结尾用“如果你需要完整清单”这类弱引导连接公众号。",
    ],
    example: "问题“现在做公众号还来得及吗？”回答可以先说“来得及，但不适合把它当快速暴富工具”，再讲定位、选题、变现路径，最后提示“我把起号清单整理成了一篇长文，适合想系统做的人继续看”。",
    pitfalls: [
      "不要把回答写成广告软文，平台和用户都会反感。",
      "不要只给观点不给步骤，问一问用户需要可执行答案。",
      "不要频繁重复公众号名称，一次自然提及即可。",
    ],
    toolHref: "/tools/question-answer-generator",
    toolLabel: "使用问一问回答生成器",
    relatedSlugs: ["wechat-search-keywords", "wechat-publish-checklist"],
  },
  {
    slug: "moments-copy-for-wechat",
    title: "公众号文章发朋友圈怎么写转发文案？",
    description: "为公众号文章生成更自然的朋友圈转发理由、评论互动和私域 CTA。",
    category: "朋友圈",
    readMinutes: 4,
    answer: "朋友圈转发文案要像真实的人在分享，而不是像运营在投广告。先写你为什么写这篇文章，再写适合谁看，最后给一个轻量行动。",
    steps: [
      "用第一人称说明写这篇内容的原因。",
      "点出目标读者，让朋友知道要不要点开。",
      "摘出一个反常识观点或实用清单。",
      "结尾引导评论、私信或阅读原文。",
      "准备 2 到 3 个不同语气版本，避免每次都像模板。",
    ],
    example: "“今天把我这段时间研究公众号副业的坑整理了一下。最想提醒的一点是，很多人不是不会写，而是一开始就选了太大的题。如果你也想做一个小号，可以先看这篇里的 3 个起步动作。”",
    pitfalls: [
      "不要用太多感叹号和夸张词，会显得像群发广告。",
      "不要只发链接没有解释，朋友圈需要人味。",
      "不要每条都强转化，可以穿插经验、复盘和日常观察。",
    ],
    toolHref: "/tools/moments-copy-generator",
    toolLabel: "使用朋友圈文案生成器",
    relatedSlugs: ["green-note-from-wechat-topic", "wechat-publish-checklist"],
  },
  {
    slug: "wechat-publish-checklist",
    title: "公众号发布前要检查哪些风险？",
    description: "发布前检查极限词、夸大承诺、AI 味、搜一搜摘要、CTA 和入口规则。",
    category: "发布前检查",
    readMinutes: 6,
    answer: "公众号发布前至少要检查六类问题：合规风险、标题风险、AI 味、搜索优化、CTA 自然度和入口适配。检查的目的不是保证审核通过，而是减少明显错误和降低读者不信任感。",
    steps: [
      "检查是否有绝对化、保证收益、唯一第一等高风险表达。",
      "检查标题是否夸大承诺，正文是否能支撑标题。",
      "删除重复套话，加入具体经历、数据或判断标准来降低 AI 味。",
      "确认标题、摘要和小标题里自然覆盖搜一搜关键词。",
      "检查 CTA 是否符合内容语境，不要突然硬转化。",
      "分别检查公众号、小绿书、问一问、朋友圈的表达是否适合对应入口。",
    ],
    example: "“保证 7 天涨粉 1000”可以改成“我用 7 天测试了 3 个涨粉动作，适合新手参考”。前者像承诺结果，后者是经验复盘，风险和可信度都更好。",
    pitfalls: [
      "不要把检查工具当法律意见，它只能做发布前辅助。",
      "不要只查正文，标题和封面更容易出问题。",
      "不要为了规避风险把内容写得空泛，具体但不过度承诺才更稳。",
    ],
    toolHref: "/tools/compliance-checker",
    toolLabel: "使用发布前检查工具",
    relatedSlugs: ["wechat-search-keywords", "question-answer-to-wechat"],
  },
];

export function getTutorialBySlug(slug: string) {
  return tutorialArticles.find((article) => article.slug === slug);
}

export function getRelatedTutorials(article: TutorialArticle) {
  return article.relatedSlugs
    .map((slug) => getTutorialBySlug(slug))
    .filter((item): item is TutorialArticle => Boolean(item));
}
