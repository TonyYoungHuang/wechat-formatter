import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6faf7] px-4">
      <Card className="w-full max-w-md border-emerald-100">
        <CardHeader>
          <CardTitle className="text-2xl">注册排版猫</CardTitle>
          <p className="text-sm text-slate-600">免费版每天 1 次生成，先体验一个选题布局五入口。</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <input className="h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-400" placeholder="昵称" />
          <input className="h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-400" placeholder="邮箱" />
          <input className="h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-400" placeholder="密码" type="password" />
          <Button className="w-full">创建账号</Button>
          <p className="text-center text-sm text-slate-500">
            已有账号？ <Link className="text-emerald-700" href="/login">登录</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

