import { defaultPlans } from "@/lib/entitlements/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">会员与额度</h1>
        <p className="mt-1 text-sm text-slate-600">价格和额度后续通过后台配置，首版先保留完整套餐结构。</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {defaultPlans.map((plan) => (
          <Card key={plan.code}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>{plan.description}</p>
              <p>账号档案：{plan.accountProfileLimit} 个</p>
              <p>每日生成：{plan.dailyGenerationLimit ?? "按后台配置"}</p>
              <p>价格：{plan.priceCents === null ? "待配置" : `¥${plan.priceCents / 100}`}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

