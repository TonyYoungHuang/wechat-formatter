import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TopicGeneratorToolPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-12 sm:px-6">
      <Link className="text-sm text-emerald-700" href="/">返回首页</Link>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <h1 className="text-3xl font-semibold text-slate-950">公众号选题生成器</h1>
          <p className="mt-3 text-slate-600">
            输入领域和变现方式，生成适合公众号、小绿书、搜一搜、问一问和朋友圈的选题。
          </p>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>免费试用</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea className="min-h-28 w-full rounded-xl border border-slate-200 p-4 outline-none focus:border-emerald-400" placeholder="例如：AI 工具副业，目标读者是普通上班族" />
              <Button>生成选题预览</Button>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>登录后解锁</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>保存到选题库</p>
            <p>一键生成五入口内容</p>
            <p>按账号档案生成更贴合的选题</p>
            <Button asChild className="mt-2 w-full">
              <Link href="/register">免费注册</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

