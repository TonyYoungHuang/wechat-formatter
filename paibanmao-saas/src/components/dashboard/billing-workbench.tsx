"use client";

import { useEffect, useState } from "react";
import { CreditCard, RefreshCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PlanCode = "free" | "starter" | "pro";

type Plan = {
  code: PlanCode;
  name: string;
  description: string;
  priceCents: number | null;
  accountProfileLimit: number;
  dailyGenerationLimit: number | null;
  monthlyGenerationLimit: number | null;
  advancedChecks: boolean;
};

type UsageSummary = {
  generation: {
    plan: Plan;
    daily: { used: number; limit: number | null; remaining: number | null };
    monthly: { used: number; limit: number | null; remaining: number | null };
  };
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}

function toNullableNumber(value: string) {
  if (value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatLimit(value: number | null) {
  return value === null ? "不限" : `${value} 次`;
}

export function BillingWorkbench() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [message, setMessage] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<PlanCode>("starter");
  const [provider, setProvider] = useState("wechat");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [planData, usageData] = await Promise.all([
        fetch("/api/billing/plans").then((response) => readJson<{ plans: Plan[] }>(response)),
        fetch("/api/usage/summary").then((response) => readJson<UsageSummary>(response)),
      ]);
      setPlans(planData.plans);
      setUsage(usageData);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载会员额度失败。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function updatePlan(code: PlanCode, patch: Partial<Plan>) {
    setPlans((items) => items.map((plan) => (plan.code === code ? { ...plan, ...patch } : plan)));
  }

  async function savePlan(plan: Plan) {
    try {
      const body = {
        plans: {
          [plan.code]: {
            name: plan.name,
            description: plan.description,
            priceCents: plan.priceCents,
            accountProfileLimit: plan.accountProfileLimit,
            dailyGenerationLimit: plan.dailyGenerationLimit,
            monthlyGenerationLimit: plan.monthlyGenerationLimit,
            advancedChecks: plan.advancedChecks,
          },
        },
      };
      await readJson(await fetch("/api/admin/pricing", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
      setMessage(`${plan.name} 已保存。`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败。");
    }
  }

  async function createOrder() {
    try {
      const data = await readJson<{ order: { id: string; status: string } }>(
        await fetch("/api/billing/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planCode: selectedPlan, provider }),
        }),
      );
      setMessage(`已创建订单 ${data.order.id}，状态：${data.order.status}。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建订单失败。");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">会员与额度</h1>
          <p className="mt-1 text-sm text-slate-600">配置套餐价格、账号档案上限、生成额度，并验证支付订单链路。</p>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}>
          <RefreshCcw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div> : null}

      {usage ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-slate-500">当前套餐</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-slate-950">{usage.generation.plan.name}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-slate-500">今日生成额度</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-slate-950">
              {usage.generation.daily.used} / {formatLimit(usage.generation.daily.limit)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-slate-500">本月生成额度</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-slate-950">
              {usage.generation.monthly.used} / {formatLimit(usage.generation.monthly.limit)}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.code}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block space-y-1 text-sm">
                <span className="text-slate-600">套餐名称</span>
                <input value={plan.name} onChange={(event) => updatePlan(plan.code, { name: event.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-slate-600">描述</span>
                <textarea value={plan.description} onChange={(event) => updatePlan(plan.code, { description: event.target.value })} className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-400" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span className="text-slate-600">价格（分）</span>
                  <input value={plan.priceCents ?? ""} onChange={(event) => updatePlan(plan.code, { priceCents: toNullableNumber(event.target.value) })} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-slate-600">账号档案</span>
                  <input type="number" value={plan.accountProfileLimit} onChange={(event) => updatePlan(plan.code, { accountProfileLimit: Number(event.target.value) })} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-slate-600">每日生成</span>
                  <input value={plan.dailyGenerationLimit ?? ""} onChange={(event) => updatePlan(plan.code, { dailyGenerationLimit: toNullableNumber(event.target.value) })} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-slate-600">每月生成</span>
                  <input value={plan.monthlyGenerationLimit ?? ""} onChange={(event) => updatePlan(plan.code, { monthlyGenerationLimit: toNullableNumber(event.target.value) })} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={plan.advancedChecks} onChange={(event) => updatePlan(plan.code, { advancedChecks: event.target.checked })} />
                高级发布检查
              </label>
              <Button className="w-full" variant="secondary" onClick={() => savePlan(plan)}>
                <Save className="size-4" />
                保存配置
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>支付订单链路测试</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[180px_180px_1fr] md:items-end">
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">套餐</span>
            <select value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value as PlanCode)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400">
              {plans.map((plan) => (
                <option key={plan.code} value={plan.code}>
                  {plan.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">支付方式</span>
            <select value={provider} onChange={(event) => setProvider(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400">
              <option value="wechat">微信支付</option>
              <option value="alipay">支付宝</option>
            </select>
          </label>
          <Button onClick={createOrder}>
            <CreditCard className="size-4" />
            创建测试订单
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
