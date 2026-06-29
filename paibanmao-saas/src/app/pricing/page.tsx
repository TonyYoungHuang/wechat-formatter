import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { defaultPlans } from "@/lib/entitlements/plans";
import { getPlanConfigs } from "@/lib/entitlements/service";

export const metadata: Metadata = {
  title: "价格",
  description: "排版猫会员套餐价格入口，支持免费版、入门版和专业版，价格和额度可在后台配置。",
};

export const dynamic = "force-dynamic";

function formatPrice(priceCents: number | null) {
  if (priceCents === null) {
    return "待定";
  }

  if (priceCents === 0) {
    return "免费";
  }

  return `¥${(priceCents / 100).toFixed(2)}`;
}

function formatGenerationLimit(daily: number | null, monthly: number | null) {
  if (daily) {
    return `每天 ${daily} 次生成`;
  }

  if (monthly) {
    return `每月 ${monthly} 次生成`;
  }

  return "生成额度后台配置";
}

export default async function PricingPage() {
  const { plans, fallback } = await getPricingPlansForPage();

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <Link className="text-sm text-emerald-700" href="/">
          返回首页
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-slate-950">价格</h1>
        <p className="mt-2 text-slate-600">套餐价格和额度从后台配置读取；价格未定时会显示为待定，后续可直接接入支付开通。</p>
        {fallback ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            当前数据库配置暂不可用，页面正在展示默认套餐配置。
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.code} className="border-emerald-100">
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-slate-600">{plan.description}</p>
              <div className="text-2xl font-semibold text-slate-950">{formatPrice(plan.priceCents)}</div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>{plan.accountProfileLimit} 个账号档案</li>
                <li>{formatGenerationLimit(plan.dailyGenerationLimit, plan.monthlyGenerationLimit)}</li>
                <li>{plan.advancedChecks ? "高级发布前检查" : "基础发布前检查"}</li>
              </ul>
              <Button className="w-full" asChild>
                <Link href={`/register?plan=${plan.code}`}>{plan.priceCents && plan.priceCents > 0 ? "开通套餐" : "开始使用"}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}

async function getPricingPlansForPage() {
  try {
    return {
      plans: await getPlanConfigs(),
      fallback: false,
    };
  } catch {
    return {
      plans: defaultPlans,
      fallback: true,
    };
  }
}
