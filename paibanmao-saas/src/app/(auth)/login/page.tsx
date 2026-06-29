import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6faf7] px-4">
      <Card className="w-full max-w-md border-emerald-100">
        <CardHeader>
          <CardTitle className="text-2xl">登录排版猫</CardTitle>
          <p className="text-sm text-slate-600">继续管理你的微信内容小入口工作台。</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <input className="h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-400" placeholder="邮箱" />
          <input className="h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-400" placeholder="密码" type="password" />
          <Button className="w-full">登录</Button>
          <p className="text-center text-sm text-slate-500">
            还没有账号？ <Link className="text-emerald-700" href="/register">注册</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

