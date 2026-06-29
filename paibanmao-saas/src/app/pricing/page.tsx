import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { defaultPlans } from "@/lib/entitlements/plans";

export const metadata: Metadata = {
  title: "价格",
  description: "排版猫会员套餐价格入口，支持免费版、入门版和专业版，价格和额度可在后台配置。",
};

export default function PricingPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <Link className="text-sm text-emerald-700" href="/">
          返回首页
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-slate-950">价格</h1>
        <p className="mt-2 text-slate-600">价格暂未最终确定，系统已预留后台配置、额度配置和支付链路。</p>
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
                {plan.priceCents === null ? "待定" : plan.priceCents === 0 ? "免费" : `¥${plan.priceCents / 100}`}
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>{plan.accountProfileLimit} 个账号档案</li>
                <li>{plan.dailyGenerationLimit ? `每天 ${plan.dailyGenerationLimit} 次生成` : "生成额度后台配置"}</li>
                <li>{plan.advancedChecks ? "高级发布前检查" : "基础发布前检查"}</li>
              </ul>
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
