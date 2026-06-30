import { z } from "zod";

import { planCodes } from "@/lib/entitlements/plans";

export const planCodeSchema = z.enum(planCodes);

export const planConfigPatchSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  description: z.string().trim().min(1).max(300).optional(),
  priceCents: z.number().int().min(0).nullable().optional(),
  accountProfileLimit: z.number().int().min(1).max(100).optional(),
  dailyGenerationLimit: z.number().int().min(0).nullable().optional(),
  monthlyGenerationLimit: z.number().int().min(0).nullable().optional(),
  dailyImageGenerationLimit: z.number().int().min(0).nullable().optional(),
  monthlyImageGenerationLimit: z.number().int().min(0).nullable().optional(),
  advancedChecks: z.boolean().optional(),
});

export const adminPlansPatchSchema = z.object({
  plans: z.partialRecord(planCodeSchema, planConfigPatchSchema).optional(),
});
