import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

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

export type AiFiveEntryResult = {
  variants: GeneratedVariant[];
  provider: string;
  model: string;
  tokenInput: number;
  tokenOutput: number;
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
      const openai = createOpenAI({
        baseURL: config.baseUrl,
        apiKey: config.apiKey,
      });

      const result = await generateObject({
        model: openai(config.model),
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
        tokenInput: result.usage.inputTokens ?? 0,
        tokenOutput: result.usage.outputTokens ?? 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      errors.push(`${config.name}/${config.model}: ${message}`);
    }
  }

  throw new Error(`AI generation failed for all providers: ${errors.join("; ")}`);
}
