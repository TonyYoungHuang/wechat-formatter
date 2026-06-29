import { defaultPlans } from "@/lib/entitlements/plans";

export async function GET() {
  return Response.json({
    plans: defaultPlans,
    status: "placeholder",
    message: "后续在这里接入管理员鉴权、价格配置和额度配置。",
  });
}

