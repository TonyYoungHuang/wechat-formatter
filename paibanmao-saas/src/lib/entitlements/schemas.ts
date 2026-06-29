import { z } from "zod";

export const planCodeSchema = z.enum(["free", "starter", "pro"]);

export const planConfigPatchSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  description: z.string().trim().min(1).max(300).optional(),
  priceCents: z.number().int().min(0).nullable().optional(),
  accountProfileLimit: z.number().int().min(1).max(100).optional(),
  dailyGenerationLimit: z.number().int().min(0).nullable().optional(),
  monthlyGenerationLimit: z.number().int().min(0).nullable().optional(),
  advancedChecks: z.boolean().optional(),
});

export const adminPlansPatchSchema = z.object({
  plans: z.record(planCodeSchema, planConfigPatchSchema).optional(),
});
