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

export const rewriteContentSchema = z.object({
  accountProfileId: z.string().optional(),
  title: z.string().trim().max(160).optional(),
  content: z.string().trim().min(20).max(20000),
  goal: z.enum(["lower_ai_tone", "more_concise", "more_wechat", "stronger_cta"]).default("lower_ai_tone"),
});
