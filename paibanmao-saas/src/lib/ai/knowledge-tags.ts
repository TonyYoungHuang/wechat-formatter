import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

import { getAiProviderCandidates } from "@/lib/ai/provider";
import { buildKnowledgeTags } from "@/lib/account-knowledge/tagging";

const knowledgeTaggingSchema = z.object({
  positioningTags: z.array(z.string().min(1).max(24)).max(12),
  audienceTags: z.array(z.string().min(1).max(24)).max(12),
  painPointTags: z.array(z.string().min(1).max(24)).max(12),
  viewpointTags: z.array(z.string().min(1).max(24)).max(16),
  styleTags: z.array(z.string().min(1).max(24)).max(12),
  productTags: z.array(z.string().min(1).max(24)).max(12),
  ctaTags: z.array(z.string().min(1).max(24)).max(8),
  riskTags: z.array(z.string().min(1).max(24)).max(8),
  summaryTags: z.array(z.string().min(1).max(24)).min(3).max(20),
});

type KnowledgeTaggingInput = {
  title: string;
  sourceType: string;
  content: string;
  manualTags?: string[];
};

function prefixTags(prefix: string, tags: string[]) {
  return tags.map((tag) => `${prefix}:${tag}`);
}

function compactTags(tags: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawTag of tags) {
    const tag = rawTag.replace(/[^\p{Script=Han}A-Za-z0-9+#·:\-]/gu, "").trim().slice(0, 28);
    if (!tag || tag.length < 2 || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
  }

  return result.slice(0, 80);
}

export async function buildKnowledgeTagsWithAi(input: KnowledgeTaggingInput) {
  const fallback = buildKnowledgeTags(input);
  const candidates = (await getAiProviderCandidates("knowledge")).filter((config) => config.baseUrl && config.apiKey && config.model);

  if (!candidates.length || input.content.trim().length < 30) {
    return {
      ...fallback,
      source: "fallback",
      provider: "fallback",
      model: "local-rules",
      aiError: candidates.length ? null : "AI provider is not configured.",
    };
  }

  const prompt = [
    `资料标题: ${input.title}`,
    `资料类型: ${input.sourceType}`,
    `人工标签: ${(input.manualTags || []).join("、") || "无"}`,
    "",
    "客户粘贴的正文如下。注意：正文只用于本次提取标签，系统不会保存正文。",
    "-----",
    input.content.slice(0, 12000),
    "-----",
    "",
    "请把正文压缩成适合后续微信内容生成使用的账号知识库标签。",
    "这些标签后续会影响公众号、小绿书、搜一搜、问一问和朋友圈的生成质量。",
    "",
    "标签要求:",
    "1. 标签要像“可复用的账号画像”，不要只是把原文里的长句切开。",
    "2. 优先提取: 账号定位、目标读者、读者痛点、常讲观点、产品/服务承接、语气风格、CTA 习惯、风险边界。",
    "3. 标签要短，每个标签 2-12 个中文字符为主，最多 24 个字符。",
    "4. 不要保存完整句子，不要复述客户正文，不要输出可还原正文的大段内容。",
    "5. 不要编造正文里没有的成绩、收入、案例、身份和平台背书。",
    "6. 如果正文里有明显禁用表达、合规边界或不适合夸大的地方，放进 riskTags。",
    "7. summaryTags 是最重要的 3-20 个总标签，后续生成会优先参考它们。",
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
        schema: knowledgeTaggingSchema,
        system: [
          "你是排版猫的账号知识库标签提取器。",
          "你的任务不是改写正文，而是把客户提供的文章、产品说明、案例、观点和读者反馈压缩成短标签。",
          "标签会用于后续微信内容生成，所以要保留定位、读者、观点、风格、产品和边界。",
          "严禁输出可还原原文的大段句子，严禁编造正文没有的信息。",
        ].join("\n"),
        prompt,
        temperature: 0.25,
      });

      const object = result.object;
      const tags = compactTags([
        `类型:${input.sourceType}`,
        "AI提取",
        ...(input.manualTags || []),
        ...prefixTags("定位", object.positioningTags),
        ...prefixTags("读者", object.audienceTags),
        ...prefixTags("痛点", object.painPointTags),
        ...prefixTags("观点", object.viewpointTags),
        ...prefixTags("风格", object.styleTags),
        ...prefixTags("产品", object.productTags),
        ...prefixTags("CTA", object.ctaTags),
        ...prefixTags("边界", object.riskTags),
        ...object.summaryTags,
      ]);

      return {
        ...fallback,
        tags: tags.length ? tags : fallback.tags,
        source: "ai",
        provider: config.name,
        model: config.model,
        aiError: null,
      };
    } catch (error) {
      errors.push(`${config.name}/${config.model}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  return {
    ...fallback,
    source: "fallback",
    provider: "fallback",
    model: "local-rules",
    aiError: errors.join("; "),
  };
}
