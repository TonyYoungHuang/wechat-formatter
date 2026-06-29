import { z } from "zod";

export const accountProfileSchema = z.object({
  name: z.string().trim().min(1).max(40),
  type: z
    .enum(["wechat_official", "green_note", "question_host", "personal_ip", "local_business"])
    .default("wechat_official"),
  niche: z.string().trim().min(1).max(80),
  persona: z.string().trim().min(1).max(500),
  audience: z.string().trim().min(1).max(300),
  audiencePainPoints: z.string().trim().min(1).max(500),
  productOrService: z.string().trim().max(500).default(""),
  monetizationMethods: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  tone: z.string().trim().max(200).default("自然、直接、有陪伴感"),
  commonCta: z.string().trim().max(300).default(""),
  forbiddenWords: z.array(z.string().trim().min(1).max(40)).max(40).default([]),
  sampleText: z.string().trim().max(3000).optional(),
  isDefault: z.boolean().default(false),
});

export const accountProfilePatchSchema = accountProfileSchema.partial();

