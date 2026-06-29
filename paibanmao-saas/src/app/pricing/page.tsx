import Link from "next/link";

import { defaultPlans } from "@/lib/entitlements/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PricingPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <Link className="text-sm text-emerald-700" href="/">返回首页</Link>
        <h1 className="mt-4 text-3xl font-semibold text-slate-950">价格</h1>
        <p className="mt-2 text-slate-600">价格暂未最终确定，系统已预留后台配置和支付链路。</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {defaultPlans.map((plan) => (
          <Card key={plan.code} className="border-emerald-100">
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-slate-600">{plan.description}</p>
              <div className="text-2xl font-semibold text-slate-950">
                {plan.priceCents === null ? "待定" : `¥${plan.priceCents / 100}`}
              </div>
              <Button className="w-full" asChild>
                <Link href="/register">开始使用</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}

