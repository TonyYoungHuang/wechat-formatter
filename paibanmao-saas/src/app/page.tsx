import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDollarSign, Search, Sparkles } from "lucide-react";

import { contentEntries } from "@/lib/content/entries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sampleOutputs = [
  "公众号长文：普通人做公众号副业，还有哪些真实机会？",
  "小绿书：3 图讲清普通人做号的第一步",
  "搜一搜：公众号副业怎么赚钱、公众号新手怎么起步",
  "问一问：现在做公众号还来得及吗？",
  "朋友圈：我把这个问题拆成了一套微信内容打法",
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-emerald-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-slate-950">
            <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500 text-white">
              排
            </span>
            <span>排版猫</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <Link href="/tools/topic-generator">免费工具</Link>
            <Link href="/pricing">价格</Link>
            <Link href="/tutorials">教程</Link>
            <Link href="/login">登录</Link>
          </nav>
          <Button asChild>
            <Link href="/dashboard">
              开始使用
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div className="flex flex-col justify-center">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-sm text-emerald-700">
            <Sparkles className="size-4" />
            微信副业创作者的内容增长工作台
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
            一个选题，布局微信五个入口
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            用排版猫把公众号文章、小绿书、搜一搜、问一问、朋友圈一次性生成出来，
            适合副业号主、个人 IP 和小团队做微信内容矩阵。
          </p>

          <div className="mt-8 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="min-h-12 flex-1 rounded-xl border border-slate-200 px-4 text-base outline-none transition focus:border-emerald-400"
                placeholder="输入一个选题，例如：普通人做公众号副业还有机会吗"
              />
              <Button size="lg" asChild>
                <Link href="/dashboard/generate">生成五入口内容</Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              免费版每天 1 次生成
            </div>
            <div className="flex items-center gap-2">
              <Search className="size-4 text-emerald-600" />
              支持搜一搜关键词
            </div>
            <div className="flex items-center gap-2">
              <CircleDollarSign className="size-4 text-emerald-600" />
              预留付费和额度配置
            </div>
          </div>
        </div>

        <Card className="border-emerald-100 shadow-sm">
          <CardHeader>
            <CardTitle>生成结果预览</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sampleOutputs.map((item) => (
              <div key={item} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="border-y border-emerald-100 bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-col gap-2">
            <h2 className="text-2xl font-semibold text-slate-950">五个入口一起做，不浪费每个选题</h2>
            <p className="text-slate-600">排版猫不承诺爆款，只帮你把内容生产、入口适配和发布检查做扎实。</p>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            {contentEntries.map((entry) => (
              <Card key={entry.id} className="border-slate-100">
                <CardHeader>
                  <CardTitle className="text-base">{entry.label}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-6 text-slate-600">{entry.summary}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

