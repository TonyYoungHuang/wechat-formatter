"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Loader2, LogIn, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AuthFormProps = {
  mode: "login" | "register";
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = normalizePlan(searchParams.get("plan"));
  const next = normalizeNextPath(searchParams.get("next"), plan);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await readJson(
        await fetch(`/api/auth/${mode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mode === "register" ? { name, email, password } : { email, password }),
        }),
      );
      router.replace(next);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "认证失败。");
    } finally {
      setLoading(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6faf7] px-4">
      <Card className="w-full max-w-md border-emerald-100">
        <CardHeader>
          <CardTitle className="text-2xl">{isRegister ? "注册排版猫" : "登录排版猫"}</CardTitle>
          <p className="text-sm leading-6 text-slate-600">
            {isRegister
              ? plan && plan !== "free"
                ? "创建账号后会进入会员页，继续开通你在价格页选择的套餐。"
                : "免费版每天 1 次生成，先体验一个选题布局五个微信入口。"
              : "继续管理你的微信内容增长工作台。"}
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            {isRegister ? (
              <input
                className="h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400"
                onChange={(event) => setName(event.target.value)}
                placeholder="昵称"
                required
                value={name}
              />
            ) : null}
            <input
              className="h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="邮箱"
              required
              type="email"
              value={email}
            />
            <input
              className="h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400"
              minLength={isRegister ? 8 : 1}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isRegister ? "密码，至少 8 位" : "密码"}
              required
              type="password"
              value={password}
            />
            {message ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</div> : null}
            <Button className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : isRegister ? <UserPlus className="size-4" /> : <LogIn className="size-4" />}
              {isRegister ? "创建账号" : "登录"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            {isRegister ? "已有账号？" : "还没有账号？"}
            <Link className="ml-1 text-emerald-700" href={buildAuthSwitchHref(isRegister ? "/login" : "/register", plan, next)}>
              {isRegister ? "登录" : "注册"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

function normalizePlan(value: string | null) {
  return value === "free" || value === "starter" || value === "pro" ? value : "";
}

function normalizeNextPath(value: string | null, plan: string) {
  const fallback = plan && plan !== "free" ? `/dashboard/billing?plan=${plan}` : "/dashboard";

  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://paibanmao.local");
    if (parsed.origin !== "https://paibanmao.local" || parsed.pathname === "/login" || parsed.pathname === "/register") {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

function buildAuthSwitchHref(path: string, plan: string, next: string) {
  const params = new URLSearchParams();

  if (plan) {
    params.set("plan", plan);
  }

  if (next && next !== "/dashboard") {
    params.set("next", next);
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
