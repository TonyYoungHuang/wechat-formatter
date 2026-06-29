import { z } from "zod";

import { contentEntrySchema, topicStatusSchema } from "@/lib/topics/schemas";

export const projectCreateSchema = z.object({
  accountProfileId: z.string().min(1),
  topicId: z.string().min(1).optional(),
  title: z.string().trim().min(2).max(160),
  status: topicStatusSchema.default("generated"),
  variants: z
    .array(
      z.object({
        entry: contentEntrySchema,
        title: z.string().trim().min(1).max(160),
        body: z.string().trim().min(1).max(50000),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .max(5)
    .default([]),
});

export const projectPatchSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  status: topicStatusSchema.optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  reviewNote: z.string().trim().max(3000).nullable().optional(),
  variants: z
    .array(
      z.object({
        entry: contentEntrySchema,
        title: z.string().trim().min(1).max(160),
        body: z.string().trim().min(1).max(50000),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .max(5)
    .optional(),
});
