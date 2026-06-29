import { z } from "zod";

import { contentEntrySchema } from "@/lib/topics/schemas";

export const ctaSnippetSchema = z.object({
  accountProfileId: z.string().min(1).optional().nullable(),
  title: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(40).default("通用转化"),
  entry: contentEntrySchema.optional().nullable(),
  content: z.string().trim().min(1).max(2000),
  tags: z.array(z.string().trim().min(1).max(24)).max(12).default([]),
  active: z.boolean().default(true),
});

export const ctaSnippetPatchSchema = ctaSnippetSchema.partial();
