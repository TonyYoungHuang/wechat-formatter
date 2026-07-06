"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
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
  dailyImageGenerationLimit: number | null;
  monthlyImageGenerationLimit: number | null;
  advancedChecks: boolean;
};

type PricingVersion = {
  id: string;
  planCode: PlanCode;
  version: number;
  snapshot: Plan;
  note?: string | null;
  createdAt: string;
};

type UsageSummary = {
  generation: {
    plan: Plan;
    daily: { used: number; limit: number | null; remaining: number | null };
    monthly: { used: number; limit: number | null; remaining: number | null };
  };
  imageGeneration: {
    plan: Plan;
    daily: { used: number; limit: number | null; remaining: number | null };
    monthly: { used: number; limit: number | null; remaining: number | null };
  };
};

type Checkout = {
  mode: string;
  provider: string;
  orderId: string;
  amountCents: number;
  expiresAt: string;
  instructions?: string;
  codeUrl?: string;
  qrCodeDataUrl?: string;
  paymentUrl?: string;
};

type PaymentCallback = {
  id: string;
  status: string;
  eventType?: string | null;
  providerTradeNo?: string | null;
  message?: string | null;
  createdAt: string;
};

type PaymentOrder = {
  id: string;
  planCode: PlanCode;
  provider: string;
  amountCents: number;
  status: string;
  paidAt?: string | null;
  expiresAt: string;
  createdAt: string;
  checkout?: Checkout | null;
  callbacks?: PaymentCallback[];
};

type InvoiceRequest = {
  id: string;
  paymentOrderId: string;
  title: string;
  taxNumber?: string | null;
  email: string;
  amountCents: number;
  status: "requested" | "issued" | "rejected" | "cancelled";
  note?: string | null;
  issuedAt?: string | null;
  createdAt: string;
  paymentOrder?: PaymentOrder;
  workspace?: {
    id: string;
    name: string;
    planCode: PlanCode;
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

function formatMoney(priceCents: number | null | undefined) {
  if (priceCents === null || priceCents === undefined) {
    return "待配置";
  }

  if (priceCents === 0) {
    return "免费";
  }

  return `¥${(priceCents / 100).toFixed(2)}`;
}

function latestCallback(order?: PaymentOrder | null) {
  return order?.callbacks?.[0] ?? null;
}

function providerName(provider: string) {
  return provider === "wechat" ? "微信支付" : provider === "alipay" ? "支付宝" : provider;
}

function getInitialPlan(): PlanCode {
  if (typeof window === "undefined") {
    return "starter";
  }

  const plan = new URLSearchParams(window.location.search).get("plan");
  return plan === "free" || plan === "starter" || plan === "pro" ? plan : "starter";
}

export function BillingWorkbench({ isSiteAdmin = false }: { isSiteAdmin?: boolean }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [versions, setVersions] = useState<PricingVersion[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRequest[]>([]);
  const [invoiceForm, setInvoiceForm] = useState({ paymentOrderId: "", title: "", taxNumber: "", email: "" });
  const [message, setMessage] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<PlanCode>(getInitialPlan);
  const [provider, setProvider] = useState("wechat");
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [currentOrder, setCurrentOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async function load() {
    setLoading(true);
    try {
      const [planData, usageData] = await Promise.all([
        fetch(isSiteAdmin ? "/api/admin/pricing" : "/api/billing/plans").then((response) => readJson<{ plans: Plan[]; versions?: PricingVersion[] }>(response)),
        fetch("/api/usage/summary").then((response) => readJson<UsageSummary>(response)),
      ]);
      const [orderData, invoiceData] = await Promise.all([
        fetch("/api/billing/orders").then((response) => readJson<{ orders: PaymentOrder[] }>(response)),
        fetch("/api/billing/invoices").then((response) => readJson<{ invoices: InvoiceRequest[] }>(response)),
      ]);
      setPlans(planData.plans);
      setVersions(planData.versions || []);
      setUsage(usageData);
      setOrders(orderData.orders);
      setCurrentOrder((current) => (current ? orderData.orders.find((order) => order.id === current.id) ?? current : current));
      setInvoices(invoiceData.invoices);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载会员额度失败。");
    } finally {
      setLoading(false);
    }
  }, [isSiteAdmin]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

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
            dailyImageGenerationLimit: plan.dailyImageGenerationLimit,
            monthlyImageGenerationLimit: plan.monthlyImageGenerationLimit,
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
    if (!canCreateOrder) {
      setMessage("当前套餐价格未配置，暂不能创建支付订单。请先在后台配置价格。");
      return;
    }

    try {
      const data = await readJson<{ order: PaymentOrder }>(
        await fetch("/api/billing/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planCode: activeSelectedPlan, provider }),
        }),
      );
      setCheckout(data.order.checkout || null);
      setCurrentOrder(data.order);
      setOrders((items) => [data.order, ...items.filter((order) => order.id !== data.order.id)]);
      setMessage(`已创建订单 ${data.order.id}，状态：${data.order.status}。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建订单失败。");
    }
  }

  async function refreshCurrentOrder() {
    if (!checkout) {
      return;
    }

    try {
      const data = await readJson<{ order: PaymentOrder }>(await fetch(`/api/billing/orders/${checkout.orderId}`));
      setCurrentOrder(data.order);
      setOrders((items) => [data.order, ...items.filter((order) => order.id !== data.order.id)]);

      if (data.order.status === "paid") {
        await load();
        setMessage("支付已确认，会员权益已经更新。");
        return;
      }

      if (data.order.status === "expired") {
        setMessage("订单已过期，请重新创建支付订单。");
        return;
      }

      setMessage(`订单当前状态：${data.order.status}。如果已经完成支付，请稍后再次检查。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "检查支付状态失败。");
    }
  }

  async function createInvoice() {
    try {
      await readJson<{ invoice: InvoiceRequest }>(
        await fetch("/api/billing/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentOrderId: invoiceForm.paymentOrderId,
            title: invoiceForm.title,
            taxNumber: invoiceForm.taxNumber || undefined,
            email: invoiceForm.email,
          }),
        }),
      );
      setMessage("发票申请已提交。");
      setInvoiceForm({ paymentOrderId: "", title: "", taxNumber: "", email: "" });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提交发票申请失败。");
    }
  }

  async function updateInvoiceStatus(invoice: InvoiceRequest, status: InvoiceRequest["status"]) {
    try {
      await readJson<{ invoice: InvoiceRequest }>(
        await fetch(`/api/billing/invoices/${invoice.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }),
      );
      setMessage("发票状态已更新。");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新发票状态失败。");
    }
  }

  const paidOrders = orders.filter((order) => order.status === "paid");
  const payablePlans = plans.filter((plan) => plan.code !== "free");
  const activeSelectedPlan = payablePlans.some((plan) => plan.code === selectedPlan) ? selectedPlan : payablePlans[0]?.code ?? "starter";
  const selectedPlanConfig = plans.find((plan) => plan.code === activeSelectedPlan);
  const canCreateOrder = Boolean(selectedPlanConfig && selectedPlanConfig.code !== "free" && typeof selectedPlanConfig.priceCents === "number" && selectedPlanConfig.priceCents > 0);
  const currentOrderCallback = latestCallback(currentOrder);
  const recentOrders = orders.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{isSiteAdmin ? "套餐与激活码" : "会员与额度"}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {isSiteAdmin ? "配置套餐价格、文字额度、Gemini 生图额度和激活码发放。" : "查看当前套餐、文字生成额度、Gemini 生图额度，并输入激活码开通。"}
          </p>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}>
          <RefreshCcw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div> : null}

      {usage ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-slate-500">今日 Gemini 生图</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-slate-950">
              {usage.imageGeneration.daily.used} / {formatLimit(usage.imageGeneration.daily.limit)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-slate-500">本月 Gemini 生图</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-slate-950">
              {usage.imageGeneration.monthly.used} / {formatLimit(usage.imageGeneration.monthly.limit)}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {isSiteAdmin ? (
        <>
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
                <label className="block space-y-1 text-sm">
                  <span className="text-slate-600">每日 Gemini 生图</span>
                  <input value={plan.dailyImageGenerationLimit ?? ""} onChange={(event) => updatePlan(plan.code, { dailyImageGenerationLimit: toNullableNumber(event.target.value) })} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-slate-600">每月 Gemini 生图</span>
                  <input value={plan.monthlyImageGenerationLimit ?? ""} onChange={(event) => updatePlan(plan.code, { monthlyImageGenerationLimit: toNullableNumber(event.target.value) })} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
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

          {versions.length ? (
            <Card>
          <CardHeader>
            <CardTitle>价格与额度版本记录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {versions.slice(0, 6).map((version) => (
              <div key={version.id} className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm md:grid-cols-[140px_1fr_180px] md:items-center">
                <div>
                  <div className="font-medium text-slate-950">
                    {version.snapshot?.name || version.planCode} v{version.version}
                  </div>
                  <div className="text-xs text-slate-500">{version.note || "配置更新"}</div>
                </div>
                <div className="grid gap-2 text-slate-600 sm:grid-cols-3 xl:grid-cols-6">
                  <span>价格：{version.snapshot?.priceCents === null ? "待定" : `¥${((version.snapshot?.priceCents ?? 0) / 100).toFixed(2)}`}</span>
                  <span>档案：{version.snapshot?.accountProfileLimit ?? "-"}</span>
                  <span>每日：{formatLimit(version.snapshot?.dailyGenerationLimit ?? null)}</span>
                  <span>每月：{formatLimit(version.snapshot?.monthlyGenerationLimit ?? null)}</span>
                  <span>图/日：{formatLimit(version.snapshot?.dailyImageGenerationLimit ?? null)}</span>
                  <span>图/月：{formatLimit(version.snapshot?.monthlyImageGenerationLimit ?? null)}</span>
                </div>
                <div className="text-xs text-slate-500 md:text-right">{new Date(version.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{isSiteAdmin ? "开通会员套餐" : "升级套餐"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[180px_180px_1fr] md:items-end">
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">套餐</span>
            <select value={activeSelectedPlan} onChange={(event) => setSelectedPlan(event.target.value as PlanCode)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400">
              {payablePlans.map((plan) => (
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
          <Button onClick={createOrder} disabled={!canCreateOrder}>
            <CreditCard className="size-4" />
            创建支付订单
          </Button>
          {selectedPlanConfig ? (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900 md:col-span-3">
              当前选择：{selectedPlanConfig.name}，价格 {formatMoney(selectedPlanConfig.priceCents)}，账号档案 {selectedPlanConfig.accountProfileLimit} 个，
              每日生成 {formatLimit(selectedPlanConfig.dailyGenerationLimit)}，每月生成 {formatLimit(selectedPlanConfig.monthlyGenerationLimit)}，
              Gemini 生图 {formatLimit(selectedPlanConfig.dailyImageGenerationLimit)} / 日，{formatLimit(selectedPlanConfig.monthlyImageGenerationLimit)} / 月。
              {!canCreateOrder ? " 价格配置为待定或免费时不会创建支付订单。" : ""}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {checkout ? (
        <Card>
          <CardHeader>
            <CardTitle>支付参数</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">模式</div>
                <div className="mt-1 font-medium text-slate-950">{checkout.mode}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">订单</div>
                <div className="mt-1 break-all font-medium text-slate-950">{checkout.orderId}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">金额</div>
                <div className="mt-1 font-medium text-slate-950">¥{(checkout.amountCents / 100).toFixed(2)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">订单状态</div>
                <div className="mt-1 font-medium text-slate-950">{currentOrder?.status || "pending"}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">过期时间</div>
                <div className="mt-1 font-medium text-slate-950">{new Date(currentOrder?.expiresAt || checkout.expiresAt).toLocaleString()}</div>
              </div>
            </div>
            {checkout.qrCodeDataUrl ? <Image alt="微信支付二维码" className="rounded-lg border border-slate-200 bg-white p-2" height={160} src={checkout.qrCodeDataUrl} unoptimized width={160} /> : null}
            {checkout.paymentUrl ? (
              <a className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700" href={checkout.paymentUrl} rel="noreferrer" target="_blank">
                打开支付宝支付
              </a>
            ) : null}
            {checkout.instructions ? <p className="leading-6">{checkout.instructions}</p> : null}
            {currentOrderCallback ? (
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs text-slate-500">最近回调</div>
                    <div className="mt-1 font-medium text-slate-950">
                      {currentOrderCallback.status}
                      {currentOrderCallback.eventType ? ` · ${currentOrderCallback.eventType}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">{new Date(currentOrderCallback.createdAt).toLocaleString()}</div>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <div>渠道交易号：{currentOrderCallback.providerTradeNo || "未返回"}</div>
                  <div>回调说明：{currentOrderCallback.message || "已记录，暂无异常说明"}</div>
                </div>
              </div>
            ) : currentOrder ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">当前订单暂未收到支付回调。若用户已付款，请稍后检查，或确认支付平台回调地址配置。</div>
            ) : null}
            <Button variant="secondary" onClick={refreshCurrentOrder}>
              <RefreshCcw className="size-4" />
              检查支付状态
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isSiteAdmin && recentOrders.length ? (
        <Card>
          <CardHeader>
            <CardTitle>最近订单</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOrders.map((order) => {
              const callback = latestCallback(order);
              return (
                <div key={order.id} className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm md:grid-cols-[1fr_120px_140px_1fr] md:items-center">
                  <div>
                    <div className="break-all font-medium text-slate-950">{order.id}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {providerName(order.provider)} · {order.planCode} · {new Date(order.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-slate-600">¥{(order.amountCents / 100).toFixed(2)}</div>
                  <div className="rounded-full bg-white px-2 py-1 text-center text-xs text-slate-600">{order.status}</div>
                  <div className="text-xs text-slate-500">
                    {callback ? (
                      <>
                        <div className="font-medium text-slate-700">回调：{callback.status}</div>
                        <div className="mt-1 truncate">{callback.message || callback.providerTradeNo || "已收到平台通知"}</div>
                      </>
                    ) : (
                      "暂无回调"
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {isSiteAdmin ? (
      <Card>
        <CardHeader>
          <CardTitle>发票申请</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_160px] md:items-end">
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">已支付订单</span>
              <select
                value={invoiceForm.paymentOrderId}
                onChange={(event) => setInvoiceForm({ ...invoiceForm, paymentOrderId: event.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400"
              >
                <option value="">选择订单</option>
                {paidOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.planCode} · ¥{(order.amountCents / 100).toFixed(2)} · {new Date(order.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">发票抬头</span>
              <input value={invoiceForm.title} onChange={(event) => setInvoiceForm({ ...invoiceForm, title: event.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">接收邮箱</span>
              <input value={invoiceForm.email} onChange={(event) => setInvoiceForm({ ...invoiceForm, email: event.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
            </label>
            <Button onClick={createInvoice} disabled={!invoiceForm.paymentOrderId || invoiceForm.title.trim().length < 2 || !invoiceForm.email.includes("@")}>
              提交申请
            </Button>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="text-slate-600">税号（企业发票可填）</span>
            <input value={invoiceForm.taxNumber} onChange={(event) => setInvoiceForm({ ...invoiceForm, taxNumber: event.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
          </label>

          {paidOrders.length ? null : <p className="text-sm text-slate-500">暂无可开票的已支付订单。支付成功后可在这里提交开票信息。</p>}

          {invoices.length ? (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm md:grid-cols-[1fr_120px_140px_220px] md:items-center">
                  <div>
                    <div className="font-medium text-slate-950">{invoice.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {invoice.email} {invoice.taxNumber ? `· ${invoice.taxNumber}` : ""}
                    </div>
                    {isSiteAdmin && invoice.workspace ? <div className="mt-1 text-xs text-slate-500">工作区：{invoice.workspace.name}</div> : null}
                  </div>
                  <div className="text-slate-600">¥{(invoice.amountCents / 100).toFixed(2)}</div>
                  <div className="rounded-full bg-white px-2 py-1 text-center text-xs text-slate-600">{invoice.status}</div>
                  <div className="space-y-2 md:text-right">
                    <div className="text-xs text-slate-500">{new Date(invoice.createdAt).toLocaleString()}</div>
                    {isSiteAdmin ? (
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        {invoice.status !== "issued" ? (
                          <Button size="sm" variant="secondary" onClick={() => updateInvoiceStatus(invoice, "issued")}>
                            已开票
                          </Button>
                        ) : null}
                        {invoice.status === "requested" ? (
                          <Button size="sm" variant="secondary" onClick={() => updateInvoiceStatus(invoice, "rejected")}>
                            驳回
                          </Button>
                        ) : null}
                        {invoice.status !== "cancelled" ? (
                          <Button size="sm" variant="ghost" onClick={() => updateInvoiceStatus(invoice, "cancelled")}>
                            取消
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
      ) : null}
    </div>
  );
}
