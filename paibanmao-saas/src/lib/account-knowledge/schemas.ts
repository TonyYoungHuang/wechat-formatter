import { z } from "zod";

export const knowledgeSourceTypes = ["wechat_article", "product", "case", "audience", "viewpoint", "note", "generated_content"] as const;

export const accountKnowledgeItemSchema = z.object({
  title: z.string().trim().min(1).max(80),
  sourceType: z.enum(knowledgeSourceTypes).default("note"),
  content: z.string().trim().min(10).max(12000),
  tags: z.array(z.string().trim().min(1).max(24)).max(12).default([]),
  active: z.boolean().default(true),
});

export const accountKnowledgeItemPatchSchema = accountKnowledgeItemSchema.partial();
