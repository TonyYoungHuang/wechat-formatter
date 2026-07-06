import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

import { getAiProviderCandidates } from "@/lib/ai/provider";

const imagePromptOutputSchema = z.object({
  prompts: z.array(z.string().min(10).max(800)).min(1).max(9),
});

export type AiImagePromptResult = {
  prompts: string[];
  provider: string;
  model: string;
  tokenInput: number;
  tokenOutput: number;
};

function sceneLabel(scene: string) {
  const labels: Record<string, string> = {
    wechat_cover: "微信公众号封面",
    green_note_cover: "小绿书封面",
    green_note_pages: "小绿书分页图文",
  };

  return labels[scene] || scene;
}

function expectedPromptCount(scene: string, pageCount: number) {
  return scene === "green_note_pages" ? pageCount : 3;
}

export async function generateImagePromptsWithAi(input: {
  topic: string;
  scene: string;
  style: string;
  pageCount: number;
  prompt?: string;
}): Promise<AiImagePromptResult> {
  const count = expectedPromptCount(input.scene, input.pageCount);
  const prompt =
    input.prompt ??
    [
      `主题: ${input.topic}`,
      `图片场景: ${sceneLabel(input.scene)}`,
      `视觉风格: ${input.style}`,
      `提示词数量: ${count}`,
      "",
      "请生成中文图片提示词，只描述画面，不要声称已经生成图片。",
      "每条提示词都要适合直接发送给 Gemini 图片模型。",
      "可见中文要像真人创作者写的小卡片标题，短、具体、有判断，不要像广告口号。",
      "提示词必须包含画面比例、主体、中文标题区域、信息层级、留白、配色、CTA 预留位置和禁止事项。",
      "如果是小绿书分页图文，请按页面顺序安排: 封面钩子页、问题解释页、方法步骤页、清单页、总结行动页。",
      "图片中的中文不要堆满小字，不要写“爆款、逆袭、躺赚、官方推荐、保证有效”。",
    ].join("\n");

  const candidates = (await getAiProviderCandidates("image")).filter((config) => config.baseUrl && config.apiKey && config.model);

  if (!candidates.length) {
    throw new Error("AI image prompt provider is not configured.");
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
        schema: imagePromptOutputSchema,
        system: [
          "You are Paibanmao's Chinese visual prompt assistant.",
          "Generate practical image prompts for WeChat articles, green-note cards, and creator workflows.",
          "Prompts should be Chinese, production-ready, and concise enough for an image model.",
          "Visible Chinese text should feel written by a real creator: short, grounded, and not slogan-like.",
          "Do not claim that images have already been generated. Return prompts only.",
          "Avoid unsafe, exaggerated, misleading, copyrighted, or official-platform endorsement claims in visible Chinese text.",
          "Prefer clean WeChat-green workspace visuals, clear cards, readable Chinese title zones, and enough whitespace.",
        ].join("\n"),
        prompt,
        temperature: 0.6,
      });

      return {
        prompts: result.object.prompts.slice(0, count),
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

  throw new Error(`AI image prompt generation failed for all providers: ${errors.join("; ")}`);
}
