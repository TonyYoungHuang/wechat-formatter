import { z } from "zod";

import { contentEntrySchema } from "@/lib/topics/schemas";

const countSchema = z.number().int().min(0).max(100000000).default(0);

export const projectMetricCreateSchema = z.object({
  entry: contentEntrySchema.optional().nullable(),
  readCount: countSchema,
  likeCount: countSchema,
  watchCount: countSchema,
  favoriteCount: countSchema,
  commentCount: countSchema,
  followerGain: countSchema,
  consultationCount: countSchema,
  dealCount: countSchema,
  note: z.string().trim().max(2000).optional().nullable(),
  reviewNote: z.string().trim().max(3000).optional().nullable(),
  recordedAt: z.string().datetime().optional(),
});
