import { z } from "zod";

export const createPaymentOrderSchema = z.object({
  planCode: z.enum(["starter", "pro"]),
  provider: z.enum(["wechat", "alipay"]),
});

