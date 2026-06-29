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
      return {
        title: "选题预览",
        summary: `围绕“${input}”，先给你 5 个适合微信内容矩阵的选题方向。`,
        blocks: [
          block("公众号", `${input}：普通人真正该先做的 3 件事`),
          block("小绿书", `3 张图讲清楚${input}的新手路线`),
          block("搜一搜", `${input}怎么做？适合新手的步骤和避坑`),
          block("问一问", `现在做${input}还来得及吗？`),
          block("朋友圈", `我把${input}拆成了一套更容易开始的小计划。`),
        ],
        loginHint: "登录后可保存到选题库，并一键生成五入口完整内容。",
      };
    case "green_note":
      return {
        title: "小绿书图文预览",
        summary: `把“${input}”改成适合微信图文卡片的短内容。`,
        blocks: [
          block("封面文案", `${input}，先别急着做复杂`),
          block("第 1 页", "痛点：很多人不是没想法，而是不知道第一步怎么落地。"),
          block("第 2 页", "方法：先用一个明确场景，写给一类具体读者。"),
          block("图片提示词", "微信绿色工作台风格，清爽信息卡片，留白充足，中文标题醒目。"),
          block("结尾 CTA", "想要完整脚本，可以把这篇保存下来，再按自己的账号定位改写。"),
        ],
        loginHint: "登录后可生成 3/6/9 页脚本、逐页图片提示词和朋友圈转发卡片。",
      };
    case "search":
      return {
        title: "搜一搜关键词预览",
        summary: `围绕“${input}”生成适合微信搜一搜的关键词结构。`,
        blocks: [
          block("主关键词", input),
          block("长尾关键词", `${input}怎么做、${input}新手、${input}步骤、${input}避坑`),
          block("搜索型标题", `${input}怎么做？新手先看这 5 个步骤`),
          block("摘要前 100 字", `如果你正在搜索“${input}”，这篇会从适合人群、具体步骤和常见误区三个方面讲清楚。`),
        ],
        loginHint: "登录后可把关键词直接应用到公众号正文和标题候选里。",
      };
    case "question":
      return {
        title: "问一问回答预览",
        summary: `把“${input}”整理成问一问里更自然的回答结构。`,
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
        summary: `把“${input}”改成更像真人表达的朋友圈转发文案。`,
        blocks: [
          block("转发理由", `最近一直在想${input}这件事，越拆越发现它不是一个大问题，而是一组小步骤。`),
          block("互动话术", "你们觉得最难的是开始、坚持，还是不知道写给谁？"),
          block("资料包 CTA", "我把思路整理成了一份清单，想看的可以留言，我发你。"),
        ],
        loginHint: "登录后可生成更短、更自然、更转化的多个朋友圈版本。",
      };
    case "compliance":
      return buildCompliancePreview(input);
  }
}

function buildCompliancePreview(input: string): PublicToolPreview {
  const issues: PublicToolPreviewBlock[] = [];
  const extremeWords = ["最", "第一", "必赚", "保证", "永久", "唯一", "100%"];
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
