import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ToolPage({
  title,
  description,
  placeholder,
  unlocks,
}: {
  title: string;
  description: string;
  placeholder: string;
  unlocks: string[];
}) {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-12 sm:px-6">
      <Link className="text-sm text-emerald-700" href="/">
        返回首页
      </Link>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <h1 className="text-3xl font-semibold text-slate-950">{title}</h1>
          <p className="mt-3 leading-7 text-slate-600">{description}</p>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>免费试用</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea className="min-h-28 w-full rounded-lg border border-slate-200 p-4 outline-none focus:border-emerald-400" placeholder={placeholder} />
              <Button>
                生成预览
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>登录后解锁</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            {unlocks.map((item) => (
              <p key={item} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </p>
            ))}
            <Button asChild className="mt-2 w-full">
              <Link href="/register">免费注册</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
