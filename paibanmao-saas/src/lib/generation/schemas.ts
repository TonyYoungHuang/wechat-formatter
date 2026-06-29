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
  style: z.string().trim().max(80).default("清爽微信绿色工作台风格"),
});
