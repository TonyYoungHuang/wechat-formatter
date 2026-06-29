import { defaultPlans } from "@/lib/entitlements/plans";

export async function GET() {
  return Response.json({
    plans: defaultPlans,
    configurable: true,
    note: "价格和额度首版预留后台配置，默认值用于开发和内测。",
  });
}

