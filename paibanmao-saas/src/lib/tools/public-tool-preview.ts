import { z } from "zod";

export const publicToolKindSchema = z.enum([
  "topic",
  "green_note",
  "search",
  "question",
  "moments",
  "compliance",
]);

export const publicToolPreviewSchema = z.object({
  kind: publicToolKindSchema,
  input: z.string().trim().min(2).max(3000),
});

export type PublicToolKind = z.infer<typeof publicToolKindSchema>;

export type PublicToolPreviewBlock = {
  label: string;
  content: string;
};

export type PublicToolPreview = {
  title: string;
  summary: string;
  blocks: PublicToolPreviewBlock[];
  loginHint: string;
};

export function generatePublicToolPreview(kind: PublicToolKind, rawInput: string): PublicToolPreview {
  const input = normalize(rawInput);

  switch (kind) {
    case "topic":
      return buildTopicPreview(input);
    case "green_note":
      return {
        title: "小绿书图文预览",
        summary: `把「${input}」改成适合微信图文卡片的短内容。`,
        blocks: [
          block("封面文案", `${input}，先别急着做复杂`),
          block("第 1 页", "痛点: 很多人不是没有想法，而是不知道第一步怎么落地。"),
          block("第 2 页", "方法: 先用一个明确场景，写给一类具体读者。"),
          block("图片提示词", "3:4 竖版，浅绿色微信工作台风格，清爽信息卡片，中文标题醒目，留白充足。"),
          block("结尾 CTA", "想要完整脚本，可以先保存这篇，再按自己的账号定位改写。"),
        ],
        loginHint: "登录后可生成 3/6/9 页脚本、逐页图片提示词，并继续用 Gemini 图片模型生成图片。",
      };
    case "search":
      return {
        title: "搜一搜关键词预览",
        summary: `围绕「${input}」生成适合微信搜一搜的关键词结构。`,
        blocks: [
          block("主关键词", input),
          block("长尾关键词", `${input}怎么做、${input}新手、${input}步骤、${input}避坑`),
          block("搜索型标题", `${input}怎么做？新手先看这 5 个步骤`),
          block("摘要前 100 字", `如果你正在搜索「${input}」，这篇会从适合人群、具体步骤和常见误区三个方面讲清楚。`),
        ],
        loginHint: "登录后可把关键词直接应用到公众号正文、标题候选和问一问问题库里。",
      };
    case "question":
      return {
        title: "问一问回答预览",
        summary: `把「${input}」整理成问一问里更自然的回答结构。`,
        blocks: [
          block("相关问题", `${input}适合普通人现在开始吗？`),
          block("一句话回答", "可以开始，但要先选清楚定位、读者和可持续输出方式。"),
          block("回答框架", "先给判断，再讲适合谁、不适合谁，最后给一个可执行动作。"),
          block("关注引导", "如果你想继续看完整拆解，可以关注后看我整理的步骤清单。"),
        ],
        loginHint: "登录后可生成问题库、专业版回答、口语版回答和公众号延展选题。",
      };
    case "moments":
      return {
        title: "朋友圈文案预览",
        summary: `把「${input}」改成更像真人表达的朋友圈转发文案。`,
        blocks: [
          block("转发理由", `最近一直在想「${input}」这件事，越拆越发现它不是一个大问题，而是一组小步骤。`),
          block("互动话术", "你们觉得最难的是开始、坚持，还是不知道写给谁？"),
          block("资料包 CTA", "我把思路整理成了一份清单，想看的可以留言，我发你。"),
        ],
        loginHint: "登录后可生成更短、更自然、更转化的多个朋友圈版本。",
      };
    case "compliance":
      return buildCompliancePreview(input);
  }
}

function buildTopicPreview(input: string): PublicToolPreview {
  const topic = extractTopic(input);
  const audience = extractAudience(input);
  const monetization = extractMonetization(input);
  const reader = audience || "普通创作者";
  const product = monetization || "资料包、咨询或私域服务";

  return {
    title: "选题预览",
    summary: `我先把你的输入拆成一个更适合发布的方向：写给「${reader}」的「${topic}」内容，可以自然承接到${product}。`,
    blocks: [
      block("公众号", `${reader}做${topic}，先别急着追热点，先跑通这 3 个小步骤`),
      block("小绿书", `3 张图讲清：${reader}从 0 开始做${topic}，第一周可以做什么`),
      block("搜一搜", `${topic}新手怎么开始？适合${reader}的步骤、成本和避坑`),
      block("问一问", `${reader}现在做${topic}还来得及吗？先看这几个判断标准`),
      block("朋友圈", `最近把${topic}这件事拆了一遍，发现真正难的不是开始，而是找到一个能坚持的小切口。`),
    ],
    loginHint: "登录后可保存到选题库，并一键生成五入口完整内容。",
  };
}

function extractTopic(input: string) {
  const cleaned = input
    .replace(/目标读者是.+?(，|,|。|；|;|$)/g, "")
    .replace(/读者是.+?(，|,|。|；|;|$)/g, "")
    .replace(/想(转化|卖|引流|变现).+?(，|,|。|；|;|$)/g, "")
    .replace(/适合.+?(，|,|。|；|;|$)/g, "")
    .replace(/[。；;]/g, "，")
    .split(/[，,]/)
    .map((item) => item.trim())
    .find((item) => item.length >= 2);

  const fallback = input.split(/[，,。；;]/)[0]?.trim() || input;
  return truncatePhrase(cleaned || fallback, 18);
}

function extractAudience(input: string) {
  const patterns = [
    /目标读者是([^，,。；;]+)/,
    /读者是([^，,。；;]+)/,
    /面向([^，,。；;]+)/,
    /写给([^，,。；;]+)/,
    /适合([^，,。；;]+)/,
  ];
  const matched = patterns.map((pattern) => input.match(pattern)?.[1]?.trim()).find(Boolean);
  return matched ? truncatePhrase(matched, 18) : "";
}

function extractMonetization(input: string) {
  const patterns = [
    /想转化([^，,。；;]+)/,
    /转化([^，,。；;]+)/,
    /卖([^，,。；;]+)/,
    /变现([^，,。；;]+)/,
    /引流到([^，,。；;]+)/,
  ];
  const matched = patterns.map((pattern) => input.match(pattern)?.[1]?.trim()).find(Boolean);
  return matched ? truncatePhrase(matched, 20) : "";
}

function truncatePhrase(value: string, maxLength: number) {
  const cleaned = value.replace(/[「」"']/g, "").trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}...` : cleaned;
}

function buildCompliancePreview(input: string): PublicToolPreview {
  const issues: PublicToolPreviewBlock[] = [];
  const extremeWords = ["最", "第一", "稳赚", "保证", "永久", "唯一", "100%"];
  const aiWords = ["首先", "其次", "综上所述", "不难发现"];

  if (extremeWords.some((word) => input.includes(word))) {
    issues.push(block("合规风险", "文案里可能存在绝对化或夸大表达，建议改成更稳妥的经验描述。"));
  }

  if (aiWords.some((word) => input.includes(word))) {
    issues.push(block("AI 味", "连接词比较模板化，可以改成更具体的场景表达。"));
  }

  if (input.length < 80) {
    issues.push(block("内容完整度", "当前内容偏短，发布前建议补充案例、步骤或读者收益。"));
  }

  if (!issues.length) {
    issues.push(block("基础检查", "未发现明显极限词，但仍建议检查标题承诺、行业资质和 CTA 自然度。"));
  }

  return {
    title: "发布前检查预览",
    summary: "公开预览只做基础规则提示，不构成法律意见，也不保证平台审核结果。",
    blocks: issues,
    loginHint: "登录后可保存检查报告，并按公众号、小绿书、搜一搜、问一问分别检查。",
  };
}

function block(label: string, content: string): PublicToolPreviewBlock {
  return { label, content };
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
