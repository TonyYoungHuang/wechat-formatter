import { z } from "zod";

export const redeemActivationCodeSchema = z.object({
  code: z.string().trim().min(8, "请输入有效的激活码。").max(80, "激活码太长，请检查后重试。"),
});

export const createActivationCodesSchema = z.object({
  planCode: z.enum(["starter", "pro"]),
  quantity: z.coerce.number().int().min(1).max(500).default(1),
  durationDays: z.coerce.number().int().min(1).max(3660).default(31),
  maxRedemptions: z.coerce.number().int().min(1).max(100).default(1),
  batchName: z.string().trim().max(80).optional(),
  source: z.string().trim().max(80).default("ecommerce"),
  note: z.string().trim().max(500).optional(),
  expiresAt: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? new Date(value) : undefined))
    .refine((value) => !value || !Number.isNaN(value.getTime()), "激活码过期时间格式不正确。"),
});
