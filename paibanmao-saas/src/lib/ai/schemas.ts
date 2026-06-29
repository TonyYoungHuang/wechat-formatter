import { z } from "zod";

export const aiProviderPatchSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.literal("openai-compatible").default("openai-compatible"),
  baseUrl: z.string().trim().url(),
  apiKeyRef: z.string().trim().min(1).max(120).default("AI_OPENAI_COMPATIBLE_API_KEY"),
  active: z.boolean().default(true),
  models: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        modelId: z.string().trim().min(1).max(120),
        purpose: z.string().trim().min(1).max(40).default("content"),
        active: z.boolean().default(true),
      }),
    )
    .min(1)
    .max(10),
});
