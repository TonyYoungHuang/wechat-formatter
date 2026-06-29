import { z } from "zod";

export const createPaymentOrderSchema = z.object({
  planCode: z.enum(["starter", "pro"]),
  provider: z.enum(["wechat", "alipay"]),
});

export const createInvoiceRequestSchema = z.object({
  paymentOrderId: z.string().min(1),
  title: z.string().trim().min(2).max(120),
  taxNumber: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email().max(160),
});

export const invoiceRequestPatchSchema = z.object({
  status: z.enum(["requested", "issued", "rejected", "cancelled"]).optional(),
  note: z.string().trim().max(1000).optional().nullable(),
  issuedAt: z.string().datetime().optional().nullable(),
});
