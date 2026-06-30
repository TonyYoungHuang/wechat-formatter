import { z } from "zod";

export const generateFiveEntrySchema = z.object({
  accountProfileId: z.string().optional(),
  topicId: z.string().optional(),
  topic: z.string().trim().min(2).max(160),
  goal: z.enum(["growth", "search", "conversion", "trust", "interaction"]).default("growth"),
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
