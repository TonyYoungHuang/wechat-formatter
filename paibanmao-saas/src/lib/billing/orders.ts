import { defaultPlans, type PlanCode } from "@/lib/entitlements/plans";

export function getPlanPriceCents(planCode: PlanCode) {
  const plan = defaultPlans.find((item) => item.code === planCode);
  return plan?.priceCents ?? 0;
}

export function buildPlaceholderCheckout(orderId: string, provider: "wechat" | "alipay") {
  return {
    mode: "placeholder",
    provider,
    orderId,
    instructions:
      provider === "wechat"
        ? "微信支付参数已预留，价格配置完成后接入 Native Pay。"
        : "支付宝参数已预留，价格配置完成后接入网页/扫码支付。",
  };
}

