"use client";

import Link from "next/link";
import { CheckCircle2, KeyRound, Loader2, LogIn } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type PlanCode = "starter" | "pro";

const planLabel: Record<PlanCode, string> = {
  starter: "入门版",
  pro: "专业版",
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(typeof payload.message === "string" ? payload.message : "请求失败，请稍后重试。");
  }

  return payload as T;
}

function dateText(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
}

export function ActivationCodeRedeemCard() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [loading, setLoading] = useState(false);

  async function redeem() {
    setLoading(true);
    setMessage("");
    setNeedsLogin(false);

    try {
      const data = await readJson<{
        activationCode: { planCode: PlanCode; durationDays: number | null };
        subscriptionExpiresAt: string | null;
      }>(
        await fetch("/api/billing/activation-codes/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        }),
      );

      setCode("");
      setMessage(`已开通${planLabel[data.activationCode.planCode]}${data.subscriptionExpiresAt ? `，有效期至 ${dateText(data.subscriptionExpiresAt)}` : ""}。`);
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "激活失败，请稍后重试。";
      setNeedsLogin(nextMessage.includes("sign in") || nextMessage.includes("登录"));
      setMessage(nextMessage.includes("sign in") ? "请先登录邮箱账号，登录后再输入激活码开通。" : nextMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-emerald-300 bg-[#f5fbf7] p-5 shadow-sm shadow-emerald-950/[0.05]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <KeyRound className="size-4" />
            已有激活码
          </div>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">输入激活码，直接开通入门版或专业版</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">激活码会绑定到当前登录的邮箱账号和工作区；未登录时需要先登录，再回来输入激活码。</p>
        </div>
        <Link className="text-sm font-medium text-emerald-700 hover:text-emerald-800" href="/dashboard/billing">
          进入会员页管理激活码
        </Link>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="例如 PBM-ST-XXXX-XXXX-XXXX"
          className="h-12 rounded-lg border border-emerald-300 bg-white px-4 text-base font-medium text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
        <Button size="lg" onClick={redeem} disabled={loading || !code.trim()} className="min-w-36">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          立即开通
        </Button>
      </div>

      {message ? (
        <div className="mt-3 flex flex-col gap-3 rounded-lg border border-emerald-200 bg-white px-3 py-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <span>{message}</span>
          {needsLogin ? (
            <Button asChild size="sm">
              <Link href="/login?next=/dashboard/billing">
                <LogIn className="size-4" />
                先登录
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
