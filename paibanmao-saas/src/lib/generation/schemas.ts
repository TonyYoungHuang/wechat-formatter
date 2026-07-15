import { z } from "zod";

export const generationInputModeSchema = z.enum(["topic", "material", "url"]);
export const adaptationModeSchema = z.enum(["adapt", "rewrite", "original"]);

export const generateFiveEntrySchema = z
  .object({
    accountProfileId: z.string().optional(),
    topicId: z.string().optional(),
    topic: z.string().trim().max(160).default(""),
    goal: z.enum(["growth", "search", "conversion", "trust", "interaction"]).default("growth"),
    inputMode: generationInputModeSchema.default("topic"),
    sourceText: z.string().trim().max(50000).default(""),
    sourceUrl: z.string().trim().max(2000).default(""),
    sourceTitle: z.string().trim().max(160).default(""),
    sourceInstructions: z.string().trim().max(500).default(""),
    adaptationMode: adaptationModeSchema.default("adapt"),
  })
  .superRefine((value, context) => {
    if (value.inputMode === "topic" && value.topic.length < 2) {
      context.addIssue({ code: "custom", path: ["topic"], message: "请先输入至少 2 个字的选题。" });
    }

    if (value.inputMode === "material" && value.sourceText.length < 50) {
      context.addIssue({ code: "custom", path: ["sourceText"], message: "请粘贴至少 50 个字的参考素材。" });
    }

    if (value.inputMode === "url") {
      try {
        const url = new URL(value.sourceUrl);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error("unsupported protocol");
      } catch {
        context.addIssue({ code: "custom", path: ["sourceUrl"], message: "请输入可以公开访问的 http/https 链接。" });
      }
    }
  });

export const imagePromptSchema = z.object({
  topic: z.string().trim().min(2).max(160),
  scene: z.enum(["wechat_cover", "green_note_cover", "green_note_pages"]).default("green_note_cover"),
  pageCount: z.number().int().refine((value) => [3, 6, 9].includes(value)).default(3),
  style: z.string().trim().max(80).default("清爽微信绿色工作台风格"),
});

export const imageGenerationSchema = z.object({
  prompts: z.array(z.string().trim().min(10).max(2000)).min(1).max(9),
  model: z.string().trim().min(2).max(120).optional(),
  size: z.enum(["1024x1024", "1536x1024", "1024x1536"]).default("1024x1536"),
  quality: z.enum(["auto", "high", "medium", "low"]).default("auto"),
  responseFormat: z.enum(["url", "b64_json"]).default("url"),
  outputFormat: z.enum(["png", "jpeg", "webp"]).default("png"),
});

export const rewriteContentSchema = z.object({
  accountProfileId: z.string().optional(),
  title: z.string().trim().max(160).optional(),
  content: z.string().trim().min(20).max(20000),
  goal: z.enum(["lower_ai_tone", "more_concise", "more_wechat", "stronger_cta"]).default("lower_ai_tone"),
});

export const wechatLayoutSchema = z.object({
  title: z.string().trim().max(160).optional(),
  content: z.string().trim().min(20).max(30000),
  template: z
    .enum([
      "classic-green",
      "clean-reading",
      "deep-column",
      "tutorial-list",
      "private-conversion",
      "industry-report",
      "interview-dialogue",
      "story-narrative",
      "product-introduction",
      "news-information",
      "clean",
      "deep",
      "private",
      "checklist",
      "editorial",
    ])
    .default("classic-green"),
});
