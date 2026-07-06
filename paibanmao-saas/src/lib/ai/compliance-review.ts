import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

import { getAiProviderCandidates } from "@/lib/ai/provider";

const aiReviewIssueSchema = z.object({
  category: z.enum(["合规风险", "标题风险", "AI 味", "搜一搜承接", "CTA 自然度", "入口适配", "信任感"]),
  severity: z.enum(["low", "medium", "high"]),
  excerpt: z.string().max(160),
  problem: z.string().min(1).max(300),
  suggestion: z.string().min(1).max(500),
  replacement: z.string().max(500),
});

export const complianceAiReviewSchema = z.object({
  verdict: z.enum(["可发布", "建议修改", "高风险"]),
  editorSummary: z.string().min(1).max(600),
  strengths: z.array(z.string().min(1).max(120)).min(1).max(5),
  issues: z.array(aiReviewIssueSchema).max(8),
  revisedTitle: z.string().max(160),
  revisedBody: z.string().max(12000),
  publishChecklist: z.array(z.string().min(1).max(120)).min(3).max(8),
});

export type ComplianceAiReview = z.infer<typeof complianceAiReviewSchema>;

type ContentEntry = "wechat_article" | "green_note" | "search" | "question" | "moments";

const entryLabels: Record<ContentEntry, string> = {
  wechat_article: "公众号",
  green_note: "小绿书",
  search: "搜一搜",
  question: "问一问",
  moments: "朋友圈",
};

export function buildFallbackComplianceAiReview(input: { title?: string; content: string; entry?: ContentEntry }): ComplianceAiReview {
  const title = input.title?.trim() || "";
  const content = input.content.trim();
  const entry = input.entry ? entryLabels[input.entry] : "微信内容";

  return {
    verdict: content.length < 300 && (!input.entry || input.entry === "wechat_article") ? "建议修改" : "可发布",
    editorSummary: `已完成基础主编检查。当前内容按「${entry}」发布前，建议重点复核标题承诺、正文是否支撑标题、CTA 是否自然，以及是否存在夸大表达。`,
    strengths: ["主题方向明确", "已经具备可继续修改的正文基础"],
    issues: [],
    revisedTitle: title,
    revisedBody: content,
    publishChecklist: ["标题不要夸大承诺", "正文要能支撑标题", "CTA 保持低压力", "发布前人工复核敏感行业表述"],
  };
}

export async function reviewComplianceWithAi(input: {
  title?: string;
  content: string;
  entry?: ContentEntry;
  ruleSummary: string;
  ruleIssues: Array<{
    category: string;
    severity: string;
    excerpt: string;
    message: string;
    suggestion: string;
  }>;
}) {
  const fallback = buildFallbackComplianceAiReview(input);
  const candidates = (await getAiProviderCandidates("compliance")).filter((config) => config.baseUrl && config.apiKey && config.model);

  if (!candidates.length) {
    return {
      review: fallback,
      provider: "fallback",
      model: "local-rules",
      fallback: true,
      aiError: "AI provider is not configured.",
    };
  }

  const prompt = [
    `入口: ${input.entry ? entryLabels[input.entry] : "未指定"}`,
    `标题: ${input.title || "未填写"}`,
    "",
    "规则检查摘要:",
    input.ruleSummary,
    "",
    "规则检查发现的问题:",
    input.ruleIssues.length
      ? input.ruleIssues.map((issue, index) => `${index + 1}. [${issue.severity}] ${issue.category}: ${issue.message} 建议: ${issue.suggestion}`).join("\n")
      : "规则检查未发现明显问题。",
    "",
    "待审正文:",
    "-----",
    input.content.slice(0, 50000),
    "-----",
    "",
    "请像微信公众号内容主编一样做发布前审稿，并给出一版可直接替换的修改稿。",
    "",
    "审稿重点:",
    "1. 合规风险: 绝对化、夸大收益、平台背书、诱导分享、医疗金融教育等高风险承诺。",
    "2. 标题风险: 标题是否夸张、是否能被正文支撑、是否适合微信列表页。",
    "3. AI 味: 是否像模板、课程讲义、广告海报或 AI 助手写的。",
    "4. 搜一搜承接: 是否有自然关键词、长尾问题、摘要承接，不要关键词堆砌。",
    "5. CTA 自然度: 是否过硬、过早、过度焦虑，是否适合私信/评论/收藏。",
    "6. 入口适配: 公众号要有完整论证；小绿书要轻图文；搜一搜要搜索结构；问一问要先回答；朋友圈要像个人转发。",
    "7. 信任感: 是否有边界、适合谁/不适合谁、真实判断，不要强卖。",
    "",
    "输出要求:",
    "- 不要保证平台审核通过。",
    "- 不要编造数据、案例、收入、排名、截图或平台规则。",
    "- revisedBody 要保留原文核心意思，但去掉明显 AI 味和高风险表达。",
    "- 如果原文很短，revisedBody 可以补成更完整但仍克制的版本。",
    "- replacement 只写对应问题可替换的一小段，不要整篇重复。",
  ].join("\n");

  const errors: string[] = [];

  for (const config of candidates) {
    try {
      const openai = createOpenAI({
        baseURL: config.baseUrl,
        apiKey: config.apiKey,
      });

      const result = await generateObject({
        model: openai(config.model),
        schema: complianceAiReviewSchema,
        system: [
          "你是排版猫的微信内容发布前主编。",
          "你服务的是中国大陆公众号、小绿书、搜一搜、问一问和朋友圈创作者。",
          "你的目标是帮助用户降低明显风险、减少 AI 味、增强可信度，并给出可直接替换的修改稿。",
          "你不是法律顾问，不能承诺审核通过，也不能编造事实。",
        ].join("\n"),
        prompt,
        temperature: 0.35,
      });

      return {
        review: result.object,
        provider: config.name,
        model: config.model,
        fallback: false,
        aiError: null,
      };
    } catch (error) {
      errors.push(`${config.name}/${config.model}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  return {
    review: fallback,
    provider: "fallback",
    model: "local-rules",
    fallback: true,
    aiError: errors.join("; "),
  };
}
