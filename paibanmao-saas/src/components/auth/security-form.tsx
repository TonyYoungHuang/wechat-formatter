"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2, Mail, RotateCcw } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Mode = "forgot-password" | "reset-password" | "verify-email";

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}

export function SecurityForm({ mode }: { mode: Mode }) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState("");
  const [loading, setLoading] = useState(false);
  const token = searchParams.get("token") || "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setDevLink("");

    try {
      if (mode === "forgot-password") {
        const data = await readJson<{ resetLink?: string }>(
          await fetch("/api/auth/password-reset/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          }),
        );
        setDevLink(data.resetLink || "");
        setMessage("如果邮箱已注册，重置链接会发送到该邮箱。");
      } else if (mode === "reset-password") {
        await readJson(
          await fetch("/api/auth/password-reset/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, password }),
          }),
        );
        setMessage("密码已重置，请重新登录。");
      } else {
        await readJson(
          await fetch("/api/auth/verify-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          }),
        );
        setMessage("邮箱已验证。");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败。");
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "forgot-password" ? "找回密码" : mode === "reset-password" ? "设置新密码" : "验证邮箱";
  const icon = mode === "forgot-password" ? <Mail className="size-4" /> : mode === "reset-password" ? <RotateCcw className="size-4" /> : <CheckCircle2 className="size-4" />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5fbf7] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandLogo />
        </div>
      <Card className="w-full border-emerald-300 shadow-md shadow-emerald-900/[0.06]">
        <CardHeader>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <p className="text-sm leading-6 text-slate-600">
            {mode === "forgot-password" ? "输入注册邮箱，排版猫会生成一次性重置链接。" : mode === "reset-password" ? "重置成功后，原有登录会话会失效。" : "点击验证后即可标记邮箱为已验证。"}
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            {mode === "forgot-password" ? (
              <input className="h-11 w-full rounded-lg border border-emerald-200 bg-white px-3 outline-none focus:border-emerald-500" onChange={(event) => setEmail(event.target.value)} placeholder="邮箱" required type="email" value={email} />
            ) : null}
            {mode === "reset-password" ? (
              <input className="h-11 w-full rounded-lg border border-emerald-200 bg-white px-3 outline-none focus:border-emerald-500" minLength={8} onChange={(event) => setPassword(event.target.value)} placeholder="新密码，至少 8 位" required type="password" value={password} />
            ) : null}
            {mode !== "forgot-password" && !token ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">链接缺少 token，请重新申请。</div> : null}
            {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</div> : null}
            {devLink ? <div className="break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">本地测试链接：{devLink}</div> : null}
            <Button className="w-full" disabled={loading || (mode !== "forgot-password" && !token)} type="submit">
              {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
              {title}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            <Link className="text-emerald-700" href="/login">返回登录</Link>
          </p>
        </CardContent>
      </Card>
      </div>
    </main>
  );
}
