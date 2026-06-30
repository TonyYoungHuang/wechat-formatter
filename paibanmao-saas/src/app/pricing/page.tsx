import type { Metadata } from "next";
import Link from "next/link";

import { PublicPageShell } from "@/components/marketing/public-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { defaultPlans } from "@/lib/entitlements/plans";
import { getPlanConfigs } from "@/lib/entitlements/service";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPublicMetadata({
  title: "价格",
  description: "排版猫会员套餐价格入口，支持免费版、入门版和专业版，适合公众号副业创作者做微信内容矩阵。",
  path: "/pricing",
  keywords: ["排版猫价格", "公众号写作 SaaS 价格", "微信内容工具套餐", "公众号矩阵工具"],
});

export const dynamic = "force-dynamic";

const launchPromotions: Partial<Record<string, { label: string; originalPriceCents: number }>> = {
  starter: {
    label: "新网站促销",
    originalPriceCents: 2900,
  },
  pro: {
    label: "新网站促销",
    originalPriceCents: 9900,
  },
};

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
  if (daily !== null) {
    return `每天 ${daily} 次生成`;
  }

  if (monthly !== null) {
    return `每月 ${monthly} 次生成`;
  }

  return "生成额度后台配置";
}

function formatImageGenerationLimit(daily: number | null, monthly: number | null) {
  if (daily === 0 || monthly === 0) {
    return "image2 模型生图：0 张，仅提供图片提示词";
  }

  const dailyText = daily === null ? "不限日次数" : `${daily} 张/天`;
  const monthlyText = monthly === null ? "不限月次数" : `${monthly} 张/月`;
  return `image2 模型生图：${dailyText}，${monthlyText}`;
}

function getPlanAction(priceCents: number | null) {
  if (priceCents === null) {
    return "预约开通";
  }

  if (priceCents === 0) {
    return "开始使用";
  }

  return "开通套餐";
}

function PlanPrice({ code, priceCents }: { code: string; priceCents: number | null }) {
  const promotion = launchPromotions[code];

  if (!promotion || priceCents === null || priceCents === 0) {
    return <div className="text-2xl font-semibold text-slate-950">{formatPrice(priceCents)}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
        {promotion.label}
      </div>
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        <span className="text-base text-slate-400 line-through">{formatPrice(promotion.originalPriceCents)}</span>
        <span className="text-3xl font-bold text-emerald-700">{formatPrice(priceCents)}</span>
        <span className="pb-1 text-sm text-slate-500">/ 月</span>
      </div>
    </div>
  );
}

export default async function PricingPage() {
  const { plans, fallback } = await getPricingPlansForPage();

  return (
    <PublicPageShell contentClassName="max-w-6xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-700">排版猫套餐</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">价格</h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">
          新网站上线促销中，文字内容统一使用 Claude 3.5 Sonnet 生成；入门版和专业版按当前优惠价开通，原价会在套餐卡片中用删除线标出。
        </p>
        {fallback ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            当前数据库配置暂不可用，页面正在展示默认套餐配置。
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.code} className="border-emerald-300 shadow-md shadow-emerald-900/[0.05]">
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7 text-slate-600">{plan.description}</p>
              <PlanPrice code={plan.code} priceCents={plan.priceCents} />
              <ul className="space-y-2 text-base leading-7 text-slate-600">
                <li>Claude 3.5 Sonnet 文字生成</li>
                <li>{plan.accountProfileLimit} 个账号档案</li>
                <li>{formatGenerationLimit(plan.dailyGenerationLimit, plan.monthlyGenerationLimit)}</li>
                <li>{formatImageGenerationLimit(plan.dailyImageGenerationLimit, plan.monthlyImageGenerationLimit)}</li>
                <li>{plan.advancedChecks ? "高级发布前检查" : "基础发布前检查"}</li>
              </ul>
              <Button className="w-full" asChild>
                <Link href={`/register?plan=${plan.code}`}>{getPlanAction(plan.priceCents)}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </PublicPageShell>
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
