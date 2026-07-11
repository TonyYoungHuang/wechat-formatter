import { z } from "zod";

import { generateJsonWithChat } from "@/lib/ai/chat-json";
import { getAiProviderCandidates } from "@/lib/ai/provider";
import { contentEntries } from "@/lib/content/entries";
import type { GeneratedVariant } from "@/lib/generation/fallback";

type AccountProfileLike = {
  name: string;
  niche: string;
  persona: string;
  audience: string;
  audiencePainPoints: string;
  productOrService: string;
  monetizationMethods: string[];
  tone: string;
  commonCta: string;
  forbiddenWords: string[];
  sampleText?: string | null;
};

const variantSchema = z.object({
  entry: z.enum(["wechat_article", "green_note", "search", "question", "moments"]),
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(20000),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const fiveEntrySchema = z.object({
  variants: z.array(variantSchema).length(5),
});

const fiveEntryPlanSchema = z.object({
  coreAngle: z.string().min(1).max(500),
  readerScene: z.string().min(1).max(500),
  contentPromise: z.string().min(1).max(500),
  entryPlan: z.array(
    z.object({
      entry: z.enum(["wechat_article", "green_note", "search", "question", "moments"]),
      task: z.string().min(1).max(300),
      mustInclude: z.array(z.string().min(1).max(80)).min(1).max(8),
      avoid: z.array(z.string().min(1).max(80)).min(1).max(8),
    }),
  ).length(5),
  editorNotes: z.array(z.string().min(1).max(160)).min(2).max(8),
});

export type AiFiveEntryResult = {
  variants: GeneratedVariant[];
  provider: string;
  model: string;
  tokenInput: number;
  tokenOutput: number;
  plan?: z.infer<typeof fiveEntryPlanSchema> | null;
  stages?: string[];
};

export async function isAiProviderConfigured() {
  const candidates = await getAiProviderCandidates();
  return candidates.some((config) => config.baseUrl && config.apiKey && config.model);
}

export async function generateFiveEntryWithAi(input: {
  topic: string;
  goal: string;
  accountProfile: AccountProfileLike;
  prompt?: string;
}): Promise<AiFiveEntryResult> {
  const profile = input.accountProfile;
  const prompt = input.prompt ?? [
    `Topic: ${input.topic}`,
    `Goal: ${input.goal}`,
    `Account name: ${profile.name}`,
    `Niche: ${profile.niche}`,
    `Persona: ${profile.persona}`,
    `Audience: ${profile.audience}`,
    `Audience pain points: ${profile.audiencePainPoints}`,
    `Product or service: ${profile.productOrService || "not specified"}`,
    `Monetization methods: ${profile.monetizationMethods.join(", ") || "not specified"}`,
    `Tone: ${profile.tone}`,
    `Common CTA: ${profile.commonCta || "natural follow or private-message CTA"}`,
    `Forbidden words: ${profile.forbiddenWords.join(", ") || "none"}`,
    `Sample text: ${profile.sampleText || "none"}`,
    "",
    "Entries to generate:",
    contentEntries.map((entry) => `- ${entry.id}: ${entry.summary}`).join("\n"),
    "",
    "For green_note, include image prompt suggestions in metadata.imagePrompts.",
    "For search, include keywords in metadata.keywords.",
    "For question, make the answer useful and not spammy.",
    "For moments, make the copy natural and personal.",
  ].join("\n");

  const candidates = (await getAiProviderCandidates()).filter((config) => config.baseUrl && config.apiKey && config.model);

  if (!candidates.length) {
    throw new Error("AI provider is not configured.");
  }

  const errors: string[] = [];

  for (const config of candidates) {
    try {
      const result = await generateJsonWithChat({
        config,
        schema: fiveEntrySchema,
        system: [
          "You are Paibanmao, a Chinese WeChat content SaaS assistant.",
          "Return structured Chinese content for exactly five WeChat ecosystem entries.",
          "Write like a real small WeChat creator, not like an AI assistant, news article, course outline, or marketing brochure.",
          "Avoid generic transition words and slogan-like phrases. Prefer concrete reader situations, plain judgments, mild uncertainty, and restrained calls to action.",
          "Do not invent first-person experiences, revenue, traffic, screenshots, rankings, or platform approval results.",
          "Do not promise guaranteed traffic, income, ranking, audit approval, or medical/financial results.",
          "Respect forbidden words and keep the content practical for small individual creators.",
        ].join("\n"),
        prompt,
        temperature: 0.68,
        maxTokens: 7000,
      });

      const normalized = contentEntries.map((entry) => {
        const variant = result.object.variants.find((item) => item.entry === entry.id);
        if (!variant) {
          throw new Error(`AI result missing ${entry.id}.`);
        }
        return variant;
      });

      return {
        variants: normalized,
        provider: config.name,
        model: config.model,
        tokenInput: result.tokenInput,
        tokenOutput: result.tokenOutput,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      errors.push(`${config.name}/${config.model}: ${message}`);
    }
  }

  throw new Error(`AI generation failed for all providers: ${errors.join("; ")}`);
}

export async function generateFiveEntryPlanWithAi(input: {
  topic: string;
  goal: string;
  goalStrategy: string;
  accountProfile: AccountProfileLike;
  knowledgeContext: string;
}) {
  const profile = input.accountProfile;
  const candidates = (await getAiProviderCandidates()).filter((config) => config.baseUrl && config.apiKey && config.model);
  const prompt = [
    `选题: ${input.topic}`,
    `内容目标: ${input.goal}`,
    `目标策略: ${input.goalStrategy}`,
    `账号名称: ${profile.name}`,
    `领域: ${profile.niche}`,
    `人设: ${profile.persona}`,
    `目标读者: ${profile.audience}`,
    `读者痛点: ${profile.audiencePainPoints}`,
    `产品或服务: ${profile.productOrService || "未填写"}`,
    `常用 CTA: ${profile.commonCta || "未填写"}`,
    `禁用表达: ${profile.forbiddenWords.join(", ") || "无"}`,
    "",
    "账号知识库标签:",
    input.knowledgeContext || "无",
    "",
    "请先像微信内容团队的主编一样，给这次五入口内容制定一份分工策划。",
    "不要写正文，只做策划。每个入口必须有不同任务，不能五个入口都重复同一段话。",
  ].join("\n");
  const errors: string[] = [];

  for (const config of candidates) {
    try {
      const result = await generateJsonWithChat({
        config,
        schema: fiveEntryPlanSchema,
        system: [
          "你是排版猫的微信内容策划主编。",
          "你的工作是先给公众号、小绿书、搜一搜、问一问和朋友圈做内容分工，再交给写手生成。",
          "策划必须具体、克制、适合中国大陆微信内容生态。",
        ].join("\n"),
        prompt,
        temperature: 0.42,
        maxTokens: 2200,
      });

      return {
        plan: result.object,
        provider: config.name,
        model: config.model,
        tokenInput: result.tokenInput,
        tokenOutput: result.tokenOutput,
      };
    } catch (error) {
      errors.push(`${config.name}/${config.model}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  throw new Error(`AI planning failed for all providers: ${errors.join("; ")}`);
}

export async function polishFiveEntryWithAi(input: {
  topic: string;
  goal: string;
  accountProfile: AccountProfileLike;
  variants: GeneratedVariant[];
  plan?: z.infer<typeof fiveEntryPlanSchema> | null;
}) {
  const profile = input.accountProfile;
  const candidates = (await getAiProviderCandidates()).filter((config) => config.baseUrl && config.apiKey && config.model);
  const prompt = [
    `选题: ${input.topic}`,
    `内容目标: ${input.goal}`,
    `账号名称: ${profile.name}`,
    `语气风格: ${profile.tone}`,
    `禁用表达: ${profile.forbiddenWords.join(", ") || "无"}`,
    "",
    "策划方案:",
    input.plan ? JSON.stringify(input.plan, null, 2) : "无",
    "",
    "待主编润色的五入口草稿:",
    JSON.stringify(input.variants, null, 2),
    "",
    "请像微信内容团队主编一样进行最后一轮统一润色。",
    "目标: 去掉 AI 味，减少五个入口之间的重复，让每个入口服务自己的任务。",
    "保留原结构，仍然输出 exactly five variants。",
    "不要编造事实、收入、案例、截图、排名或平台背书。",
    "如果 metadata.imagePrompts 或 metadata.keywords 存在，请保留并优化。",
  ].join("\n");
  const errors: string[] = [];

  for (const config of candidates) {
    try {
      const result = await generateJsonWithChat({
        config,
        schema: fiveEntrySchema,
        system: [
          "你是排版猫的微信内容终审主编。",
          "你负责把五入口草稿统一润色成可发布版本。",
          "你要让内容像真人创作者写的，具体、克制、有边界，不像 AI 模板。",
        ].join("\n"),
        prompt,
        temperature: 0.45,
        maxTokens: 7000,
      });
      const normalized = contentEntries.map((entry) => {
        const variant = result.object.variants.find((item) => item.entry === entry.id);
        if (!variant) {
          throw new Error(`AI polish result missing ${entry.id}.`);
        }
        return variant;
      });

      return {
        variants: normalized,
        provider: config.name,
        model: config.model,
        tokenInput: result.tokenInput,
        tokenOutput: result.tokenOutput,
      };
    } catch (error) {
      errors.push(`${config.name}/${config.model}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  throw new Error(`AI polish failed for all providers: ${errors.join("; ")}`);
}
