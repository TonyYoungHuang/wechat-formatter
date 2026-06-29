import type { PlanCode } from "@/lib/entitlements/plans";
import { getPlanConfig } from "@/lib/entitlements/service";

export async function getPlanPriceCents(planCode: PlanCode) {
  const plan = await getPlanConfig(planCode);
  return plan.priceCents ?? 0;
}

export function buildPlaceholderCheckout(orderId: string, provider: "wechat" | "alipay") {
  return {
    mode: "placeholder",
    provider,
    orderId,
    instructions:
      provider === "wechat"
        ? "微信支付参数已预留；接入商户号后在这里返回 Native Pay 二维码链接。"
        : "支付宝参数已预留；接入应用私钥后在这里返回网页支付或扫码支付参数。",
  };
}
