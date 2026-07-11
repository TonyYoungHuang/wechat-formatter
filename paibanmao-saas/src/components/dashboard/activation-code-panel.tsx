"use client";

import { CheckCircle2, Copy, Gift, KeyRound, Loader2, RefreshCw, Ticket } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PlanCode = "starter" | "pro";

type GeneratedCode = {
  id: string;
  code: string;
  codePrefix: string;
  codeSuffix: string;
  planCode: PlanCode;
};

type ActivationCodeRecord = {
  id: string;
  codePrefix: string;
  codeSuffix: string;
  planCode: PlanCode;
  status: string;
  maxRedemptions: number;
  redeemedCount: number;
  durationDays: number | null;
  batchName: string | null;
  source: string | null;
  expiresAt: string | null;
  createdAt: string;
  redemptions: Array<{
    id: string;
    redeemedAt: string;
    user: { email: string; name: string };
    workspace: { name: string };
  }>;
};

type ActivationCodePanelProps = {
  isSiteAdmin: boolean;
  adminMode?: boolean;
};

const planLabel: Record<PlanCode, string> = {
  starter: "入门版",
  pro: "专业版",
};

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(typeof data.message === "string" ? data.message : "请求失败，请稍后重试。");
  }

  return data as T;
}

function dateText(value?: string | null) {
  if (!value) return "不限";
  return new Date(value).toLocaleDateString();
}

export function ActivationCodePanel({ isSiteAdmin, adminMode = false }: ActivationCodePanelProps) {
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemMessage, setRedeemMessage] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const [planCode, setPlanCode] = useState<PlanCode>("starter");
  const [quantity, setQuantity] = useState(10);
  const [durationDays, setDurationDays] = useState(31);
  const [batchName, setBatchName] = useState("电商平台月卡");
  const [source, setSource] = useState("ecommerce");
  const [expiresAt, setExpiresAt] = useState("");
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedCode[]>([]);
  const [activationCodes, setActivationCodes] = useState<ActivationCodeRecord[]>([]);
  const [adminMessage, setAdminMessage] = useState("");
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [creating, setCreating] = useState(false);

  const generatedCodeText = useMemo(() => generatedCodes.map((item) => item.code).join("\n"), [generatedCodes]);

  async function redeem() {
    setRedeeming(true);
    setRedeemMessage("");

    try {
      const data = await readJson<{
        activationCode: { planCode: PlanCode; durationDays: number | null };
        subscriptionExpiresAt: string | null;
      }>(
        await fetch("/api/billing/activation-codes/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: redeemCode }),
        }),
      );

      setRedeemCode("");
      setRedeemMessage(
        `已开通${planLabel[data.activationCode.planCode]}${data.subscriptionExpiresAt ? `，有效期至 ${dateText(data.subscriptionExpiresAt)}` : ""}。`,
      );
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setRedeemMessage(error instanceof Error ? error.message : "激活失败，请稍后重试。");
    } finally {
      setRedeeming(false);
    }
  }

  async function loadActivationCodes() {
    if (!isSiteAdmin) return;

    setLoadingAdmin(true);
    try {
      const data = await readJson<{ activationCodes: ActivationCodeRecord[] }>(await fetch("/api/admin/activation-codes"));
      setActivationCodes(data.activationCodes);
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : "加载激活码记录失败。");
    } finally {
      setLoadingAdmin(false);
    }
  }

  async function createCodes(nextPlanCode = planCode) {
    setCreating(true);
    setAdminMessage("");
    setGeneratedCodes([]);

    try {
      const data = await readJson<{ codes: GeneratedCode[]; message: string }>(
        await fetch("/api/admin/activation-codes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planCode: nextPlanCode,
            quantity,
            durationDays,
            maxRedemptions: 1,
            batchName,
            source,
            expiresAt: expiresAt || undefined,
          }),
        }),
      );

      setGeneratedCodes(data.codes);
      setAdminMessage(data.message);
      await loadActivationCodes();
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : "生成激活码失败。");
    } finally {
      setCreating(false);
    }
  }

  async function copyGeneratedCodes() {
    if (!generatedCodeText) return;
    await navigator.clipboard.writeText(generatedCodeText);
    setAdminMessage("已复制本批激活码。");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadActivationCodes();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSiteAdmin]);

  return (
    <section id="activation-codes" className="mt-6 scroll-mt-24 space-y-6">
      {!adminMode ? (
      <Card className="border-emerald-300 bg-emerald-50/60">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <KeyRound className="h-5 w-5 text-emerald-700" />
              激活码开通
            </CardTitle>
            <p className="mt-2 text-sm leading-6 text-slate-600">在电商平台购买后，把商家发给你的排版猫激活码粘贴到这里，即可开通对应套餐。</p>
          </div>
          <span className="inline-flex w-fit items-center gap-1 rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-800">
            <Gift className="h-3.5 w-3.5" />
            支持入门版 / 专业版
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={redeemCode}
              onChange={(event) => setRedeemCode(event.target.value)}
              placeholder="输入激活码，例如 PBM-ST-XXXX-XXXX-XXXX"
              className="h-12 rounded-lg border border-emerald-300 bg-white px-4 text-base font-medium text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            />
            <Button size="lg" onClick={redeem} disabled={redeeming || !redeemCode.trim()} className="min-w-36">
              {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              立即开通
            </Button>
          </div>
          {redeemMessage ? <p className="mt-3 text-sm font-medium text-emerald-800">{redeemMessage}</p> : null}
        </CardContent>
      </Card>
      ) : null}

      {isSiteAdmin ? (
        <Card className="border-teal-300 bg-white">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Ticket className="h-5 w-5 text-teal-700" />
                激活码发放后台
              </CardTitle>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                生成入门版或专业版激活码后，可以复制到淘宝、闲鱼、拼多多等电商平台自动发货。后台只保存激活码哈希，明文只在本次生成后展示。
              </p>
            </div>
            <Button variant="secondary" onClick={loadActivationCodes} disabled={loadingAdmin}>
              {loadingAdmin ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              刷新记录
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-6">
              <label className="space-y-1 lg:col-span-1">
                <span className="text-xs font-medium text-slate-500">套餐</span>
                <select
                  value={planCode}
                  onChange={(event) => setPlanCode(event.target.value as PlanCode)}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
                >
                  <option value="starter">入门版</option>
                  <option value="pro">专业版</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-500">数量</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-500">开通天数</span>
                <input
                  type="number"
                  min={1}
                  max={3660}
                  value={durationDays}
                  onChange={(event) => setDurationDays(Number(event.target.value))}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
                />
              </label>
              <label className="space-y-1 lg:col-span-2">
                <span className="text-xs font-medium text-slate-500">批次名</span>
                <input
                  value={batchName}
                  onChange={(event) => setBatchName(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-500">售卖渠道</span>
                <input
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
                />
              </label>
              <label className="space-y-1 lg:col-span-2">
                <span className="text-xs font-medium text-slate-500">激活码有效期，可不填</span>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
                />
              </label>
              <div className="grid gap-2 lg:col-span-4 lg:grid-cols-2 lg:items-end">
                <Button onClick={() => createCodes("starter")} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                  生成入门版激活码
                </Button>
                <Button onClick={() => createCodes("pro")} disabled={creating} className="bg-teal-700 hover:bg-teal-800">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                  生成专业版激活码
                </Button>
              </div>
            </div>

            {adminMessage ? <p className="text-sm font-medium text-teal-800">{adminMessage}</p> : null}

            {generatedCodes.length ? (
              <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">本批生成的明文激活码</p>
                    <p className="text-sm text-slate-600">请立即复制保存，刷新页面后不会再次显示明文。</p>
                  </div>
                  <Button variant="secondary" onClick={copyGeneratedCodes}>
                    <Copy className="h-4 w-4" />
                    复制全部
                  </Button>
                </div>
                <textarea
                  readOnly
                  value={generatedCodeText}
                  className="min-h-40 w-full rounded-lg border border-teal-200 bg-white p-3 font-mono text-sm leading-6 text-slate-950 outline-none"
                />
              </div>
            ) : null}

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_1fr] bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
                <span>激活码</span>
                <span>套餐</span>
                <span>状态</span>
                <span>使用</span>
                <span>批次 / 最近兑换</span>
              </div>
              <div className="divide-y divide-slate-100">
                {activationCodes.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_1fr] gap-2 px-4 py-3 text-sm text-slate-700">
                    <span className="font-mono">{item.codePrefix}***{item.codeSuffix}</span>
                    <span>{planLabel[item.planCode]}</span>
                    <span>{item.status === "active" ? "可用" : item.status === "used" ? "已用完" : item.status}</span>
                    <span>
                      {item.redeemedCount}/{item.maxRedemptions}
                    </span>
                    <span className="truncate">
                      {item.batchName || item.source || "未命名批次"}
                      {item.redemptions[0] ? ` · ${item.redemptions[0].user.email}` : ""}
                    </span>
                  </div>
                ))}
                {!activationCodes.length ? <p className="px-4 py-6 text-sm text-slate-500">还没有生成过激活码。</p> : null}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
