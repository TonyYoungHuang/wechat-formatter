import { z } from "zod";

const contentEntrySchema = z.enum(["wechat_article", "green_note", "search", "question", "moments"]);
const topicStatusSchema = z.enum(["idea", "generated", "editing", "ready", "published", "reviewed"]);

const optionalIdSchema = z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional());
const optionalTextSchema = z.preprocess((value) => (value === "" ? undefined : value), z.string().optional());

const dateStringSchema = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
  message: "A valid date is required.",
});

export const calendarItemCreateSchema = z.object({
  accountProfileId: optionalIdSchema,
  topicId: optionalIdSchema,
  projectId: optionalIdSchema,
  entry: contentEntrySchema,
  title: z.string().min(2).max(120),
  status: topicStatusSchema.default("ready"),
  scheduledFor: dateStringSchema,
  publishedAt: dateStringSchema.optional().nullable(),
  note: optionalTextSchema,
});

export const calendarItemPatchSchema = z.object({
  accountProfileId: optionalIdSchema,
  topicId: optionalIdSchema,
  projectId: optionalIdSchema,
  entry: contentEntrySchema.optional(),
  title: z.string().min(2).max(120).optional(),
  status: topicStatusSchema.optional(),
  scheduledFor: dateStringSchema.optional(),
  publishedAt: dateStringSchema.optional().nullable(),
  note: optionalTextSchema,
});
