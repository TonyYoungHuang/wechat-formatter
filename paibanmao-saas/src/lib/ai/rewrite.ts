import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

import { getAiProviderCandidates } from "@/lib/ai/provider";

const rewriteSchema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(20000),
});

export type RewriteGoal = "lower_ai_tone" | "more_concise" | "more_wechat" | "stronger_cta";

export type AiRewriteResult = {
  title: string;
  body: string;
  provider: string;
  model: string;
  tokenInput: number;
  tokenOutput: number;
};

export function buildFallbackRewrite(input: {
  title?: string;
  content: string;
  goal: RewriteGoal;
  commonCta?: string | null;
}) {
  const replacements: Array<[RegExp, string]> = [
    [/首先[，。:：]?/g, "先说结论: "],
    [/其次[，。:：]?/g, "再看一个关键点: "],
    [/最后[，。:：]?/g, "收个尾，"],
    [/综上所述[，。:：]?/g, "简单总结一下，"],
    [/不难发现[，。:：]?/g, "我自己的感受是，"],
    [/总而言之[，。:：]?/g, "说到底，"],
  ];
  let body = input.content.trim();

  for (const [pattern, replacement] of replacements) {
    body = body.replace(pattern, replacement);
  }

  if (input.goal === "more_concise") {
    body = body
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 12)
      .join("\n\n");
  }

  if (input.goal === "more_wechat") {
    body = body.replaceAll("用户", "读者").replaceAll("内容平台", "微信生态");
  }

  if (input.goal === "stronger_cta" && input.commonCta && !body.includes(input.commonCta)) {
    body = `${body}\n\n${input.commonCta}`;
  }

  return {
    title: input.title?.trim() || "改写稿",
    body,
    provider: "fallback",
    model: "local-rules",
    tokenInput: 0,
    tokenOutput: 0,
  };
}

export async function rewriteWithAi(input: {
  prompt: string;
  title?: string;
  content: string;
}): Promise<AiRewriteResult> {
  const candidates = (await getAiProviderCandidates("rewrite")).filter((config) => config.baseUrl && config.apiKey && config.model);

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
        schema: rewriteSchema,
        system: [
          "You are Paibanmao, a Chinese WeChat editor for small creators.",
          "Rewrite content to sound natural, specific, and trustworthy.",
          "Do not invent facts, data, screenshots, income, traffic, rankings, or platform approval results.",
          "Return only the rewritten title and body.",
        ].join("\n"),
        prompt: input.prompt,
        temperature: 0.6,
      });

      return {
        title: result.object.title || input.title || "改写稿",
        body: result.object.body,
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

  throw new Error(`AI rewrite failed for all providers: ${errors.join("; ")}`);
}
