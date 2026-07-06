import { prisma } from "@/lib/db/prisma";

type PromptContext = Record<string, string | number | boolean | null | undefined>;

export const defaultPromptTemplateVersions: Record<string, number> = {
  five_entry_generation: 4,
  topic_generation: 3,
  image_prompt_generation: 3,
  ai_tone_rewrite: 3,
};

export const defaultPromptTemplates: Record<string, string> = {
  five_entry_generation: [
    "选题: {{topic}}",
    "内容目标: {{goal}}",
    "内容目标中文: {{goalLabel}}",
    "当前目标策略: {{goalStrategy}}",
    "当前目标硬性要求:",
    "{{goalRequirements}}",
    "当前目标推荐 CTA: {{goalCta}}",
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
    "你不是泛泛写稿助手，而是一个负责微信私域、公众号矩阵和内容转化的主理人。目标不是“写满”，而是让一个小创作者真的能拿去发布、测试和复盘。",
    "",
    "最重要的风格要求:",
    "1. 写得像一个真实微信创作者刚整理完思路后发出来的内容，不要像 AI 助手、课程讲义、营销海报或新闻通稿。",
    "2. 少用整齐但空泛的套话，例如“在当今时代”“赋能”“闭环”“全方位”“打造个人品牌”“实现增长”。",
    "3. 少用机械连接词，例如“首先、其次、最后、综上所述、值得注意的是、不可否认的是”。需要转折时，用更口语的表达: “先说我的判断”“这里容易踩坑”“换个更小的说法”“别急着做复杂”。",
    "4. 每个入口至少要有一个具体读者场景，例如“下班后只有 1 小时”“手里只有一个小号”“写了三篇没人看”“不知道朋友圈怎么转”。",
    "5. 可以有犹豫、边界和提醒，不要每句话都很确定。比如“这件事能做，但不适合指望马上变现”。",
    "6. 不要编造作者亲身经历、收入数字、截图、平台排名、客户案例。如果没有材料，就写成“可以这样理解/可以这样测试”。",
    "7. CTA 要克制，像真人顺手提醒，不要硬塞“立即关注、马上购买、私信领取暴富秘籍”。",
    "8. 不要把用户输入的选题原句硬塞进每个标题。标题要像编辑重新提炼过，有判断、有矛盾、有具体读者。",
    "9. 每段尽量只说一件事。多用短句、具体动作、真实迟疑，少用排比口号。",
    "10. 如果账号档案或知识库标签里有明显风格，优先贴近账号自己的称呼、节奏、禁用词和转化方式。",
    "",
    "原创感要求:",
    "- 不要复述常见爆款标题模板，不要像从模板库拼出来。",
    "- 同一观点要给出自己的判断边界: 适合谁、不适合谁、先做什么、不急着做什么。",
    "- 可以引用常识，但不要伪造“我见过/我辅导过/我朋友靠这个赚到”这类经历。",
    "- 内容要有取舍，不要每个入口都面面俱到。真正的矩阵内容应该各自承担一个任务。",
    "",
    "内容目标执行要求:",
    "- 这次生成必须优先服从“当前目标策略”和“当前目标硬性要求”。",
    "- 不是在五个入口里平均用力，而是让五个入口一起服务当前内容目标。",
    "- 如果当前目标是涨粉，重点写出陌生读者为什么以后还值得看这个账号。",
    "- 如果当前目标是搜索，必须强化关键词、长尾词、搜索型标题和摘要承接。",
    "- 如果当前目标是转化，必须有痛点、解决路径、产品/服务承接和克制 CTA。",
    "- 如果当前目标是信任，必须有边界、适合谁/不适合谁、真实判断，不强卖。",
    "- 如果当前目标是互动，必须有问题钩子、讨论话术、评论/私信/朋友圈互动 CTA。",
    "- 当前目标推荐 CTA 可以参考，但要结合账号 commonCta，写得自然。",
    "",
    "五个入口的差异:",
    "- 公众号: 承担“深度解释和信任建立”。像一篇能直接继续编辑的长文草稿。开头先给判断或场景，不要写宏大背景。正文包含 3-5 个小标题，每节要有具体动作。结尾自然引到 commonCta。正文可以用 Markdown 结构: # 主标题、## 小标题、引用、清单，方便后续排版。",
    "- 小绿书: 承担“轻阅读和转发”。像微信里的轻图文，不要像小红书夸张种草。输出封面标题、分页脚本、每页短标题和一句解释。metadata.imagePrompts 必须给出适合图片模型的中文图片提示词。",
    "- 搜一搜: 承担“搜索承接”。像为真实搜索问题准备的内容。输出主关键词、长尾词、搜索型标题、摘要前 100 字和正文小标题。metadata.keywords 必须包含主关键词和长尾关键词。",
    "- 问一问: 承担“疑问拦截”。像一个懂行的人认真回答问题。先直接回答，再讲适合谁、不适合谁、怎么开始，最后弱引导到公众号或资料。",
    "- 朋友圈: 承担“私域唤醒”。像个人转发时写的一段话。可以有“我最近在想”“这篇更适合谁看”“你们觉得哪一步最难”这样的私域语气，不要像广告。",
    "",
    "公众号排版提示:",
    "- 公众号正文要天然适合排版: 标题短、二级标题有判断、段落不要太长，重要观点可单独成段。",
    "- 可以在正文里安排 1 个引用块、1 个清单块、1 个结尾行动块，但不要每段都像模板。",
    "- 小标题不要都写成“原因一/原因二/原因三”，要像真实作者起的小标题。",
    "- 结尾 CTA 前可以有一句边界提醒，让转化显得自然。",
    "",
    "安全和可信要求:",
    "- 不要承诺 guaranteed 流量、收益、排名、审核通过、医疗/金融结果。",
    "- 不要夸大微信官方规则，不要暗示平台背书。",
    "- 尊重禁用表达；如果参考样文存在，请贴近它的称呼、节奏、句子长度和表达习惯。",
    "",
    "输出必须是结构化对象，五个 variants 的 entry 分别为 wechat_article、green_note、search、question、moments。",
  ].join("\n"),
  topic_generation: [
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
    "你要像一个微信内容主理人在给自己排 15 天内容，而不是一次性吐出漂亮标题。",
    "",
    "选题要像真人会写的题，而不是 AI 生成的栏目名:",
    "1. 具体到一个读者眼前的问题，不要只写“如何提升认知”“如何打造 IP”这种大词。",
    "2. 标题里尽量出现真实处境、动作或矛盾，例如“写了 3 篇没人看”“每天只有 1 小时”“不知道该不该继续”。",
    "3. 每个选题都要能拆成五个入口，尤其要能变成搜一搜问题和问一问回答。",
    "4. reason 要像编辑给作者的选题建议，说明为什么值得写、读者为什么会点开、后面怎么接转化。",
    "5. 不要制造焦虑，不要夸大收益，不要洗稿搬运，不要碰瓷热点。",
    "6. 输出数量尽量接近 {{count}}，角度之间要有明显差异。",
    "7. 每个选题最好有一个可验证动作，例如“先写一篇”“先问 3 个读者”“先发一条朋友圈测试”。",
    "8. 避免标题过度像短视频标题党；微信读者更吃“具体、可信、能收藏”的标题。",
    "9. 如果主题很宽，先拆成小切口；如果主题很窄，就补一个读者为什么关心它的角度。",
    "10. entries 不要永远五个都填满，只有适合矩阵分发时才标满；否则保留最自然的入口组合。",
  ].join("\n"),
  image_prompt_generation: [
    "主题: {{topic}}",
    "图片场景: {{scene}}",
    "视觉风格: {{style}}",
    "页数: {{pageCount}}",
    "",
    "请生成适合微信图文、小绿书或公众号封面的中文图片提示词，只输出提示词建议，不要声称已经生成图片。",
    "这些提示词会交给 Gemini 图片模型使用，目标是生成可直接用于微信内容的封面或分页图。",
    "",
    "提示词目标:",
    "1. 图片要像一个真实创作者会发的微信图文卡片，不要像夸张广告海报。",
    "2. 可见中文要短，像人写的卡片标题，不要写满口号。比如“先别急着写文章”“普通人先做这一步”。",
    "3. 每条提示词都要包含画面比例、主体、中文标题区域、正文留白、信息层级、配色和 CTA 预留位置。",
    "4. 小绿书分页要有节奏: 封面钩子页、问题页、方法页、清单页、结尾行动页。页数不足时按这个顺序取前几类。",
    "5. 视觉上保持轻微信绿色工作台、白底、浅绿、清爽可信；不要廉价海报感、强促销按钮、复杂背景。",
    "6. 不要包含真实品牌 Logo、平台背书、夸大收益、违规导流或容易误导的可见文字。",
    "7. 可见中文必须少而准，每张图最多 1 个主标题和 1 行短副标题，不要让模型生成大段文字。",
    "8. 画面主体要服务内容，不要只写“清爽背景”。可以使用桌面、手机、便签、微信内容工作台、简洁人物剪影等元素。",
    "9. 每页提示词都要有差异，不能只是把标题换一下。",
  ].join("\n"),
  ai_tone_rewrite: [
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
    "",
    "改写规则:",
    "1. 保留事实、结构和核心观点，不要编造案例、数据、收入、流量、排名、截图或审核结果。",
    "2. 删除或替换模板词: 首先、其次、最后、综上所述、不可否认、在当今时代、赋能、闭环、全方位、助力、打造。",
    "3. 把过度整齐的句子打散，允许长短句混合。公众号里更像真人的表达，通常不是每段都一样长。",
    "4. 加入读者正在经历的具体场景，但只能基于原文和账号信息合理推断，不要编故事。",
    "5. 允许有边界感: 哪些人适合、哪些人不适合、这件事不能指望马上见效。",
    "6. CTA 如果生硬，改成轻一点的微信表达，比如“想继续看完整清单，可以先收藏/关注后看下一篇”。",
    "7. 输出 title 和 body，body 保留适合公众号编辑器的自然段落结构。",
    "8. 不要过度美化，微信私域里可信比华丽更重要。宁可像真人说得朴素一点，也不要像广告文案。",
    "9. 如果原文已经不错，只做轻微润色，不要重写成另一个主题。",
    "10. 保留能排版的结构: 短标题、短段落、引用句、清单和结尾行动。",
  ].join("\n"),
};

function renderTemplate(content: string, context: PromptContext) {
  return content.replaceAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = context[key];
    return value === null || value === undefined || value === "" ? "未填写" : String(value);
  });
}

export async function getActivePromptTemplate(key: string, context: PromptContext = {}) {
  const template = await prisma.promptTemplate.findFirst({
    where: { key, active: true },
    orderBy: { version: "desc" },
  });

  const defaultVersion = defaultPromptTemplateVersions[key] ?? 0;
  const useDatabaseTemplate = Boolean(template && template.version >= defaultVersion);
  const content = useDatabaseTemplate ? template?.content ?? "" : defaultPromptTemplates[key] ?? "";

  return {
    id: useDatabaseTemplate ? template?.id ?? null : null,
    key,
    version: useDatabaseTemplate ? template?.version ?? 0 : defaultVersion,
    content,
    rendered: renderTemplate(content, context),
    source: useDatabaseTemplate ? "database" : template ? "default_newer_than_database" : "default",
  };
}

export async function upsertPromptTemplate(input: {
  key: string;
  content: string;
  version?: number;
  active?: boolean;
}) {
  const version =
    input.version ??
    ((await prisma.promptTemplate.aggregate({
      where: { key: input.key },
      _max: { version: true },
    }))._max.version ?? 0) + 1;

  if (input.active !== false) {
    await prisma.promptTemplate.updateMany({
      where: { key: input.key, active: true },
      data: { active: false },
    });
  }

  return prisma.promptTemplate.upsert({
    where: { key_version: { key: input.key, version } },
    create: {
      key: input.key,
      version,
      content: input.content,
      active: input.active ?? true,
    },
    update: {
      content: input.content,
      active: input.active ?? true,
    },
  });
}
