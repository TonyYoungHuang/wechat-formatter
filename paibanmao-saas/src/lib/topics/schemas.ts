import { z } from "zod";

export const contentGoalSchema = z.enum(["growth", "search", "conversion", "trust", "interaction"]);
export const contentEntrySchema = z.enum(["wechat_article", "green_note", "search", "question", "moments"]);
export const topicStatusSchema = z.enum(["idea", "generated", "editing", "ready", "published", "reviewed"]);

export const topicCreateSchema = z.object({
  accountProfileId: z.string().min(1),
  title: z.string().trim().min(2).max(160),
  reason: z.string().trim().max(800).default(""),
  goals: z.array(contentGoalSchema).min(1).max(5).default(["growth"]),
  entries: z.array(contentEntrySchema).min(1).max(5).default([
    "wechat_article",
    "green_note",
    "search",
    "question",
    "moments",
  ]),
  status: topicStatusSchema.default("idea"),
});

export const topicPatchSchema = topicCreateSchema.partial();

export const topicGenerateSchema = z.object({
  accountProfileId: z.string().min(1),
  theme: z.string().trim().min(2).max(120),
  monetizationGoal: z.string().trim().max(120).default("lead generation"),
  avoid: z.string().trim().max(300).default(""),
  count: z.number().int().min(3).max(10).default(10),
});
