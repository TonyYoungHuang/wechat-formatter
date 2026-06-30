import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HomeHeroGenerator } from "@/components/marketing/home-hero-generator";
import { contentEntries } from "@/lib/content/entries";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata = createPublicMetadata({
  title: "微信内容增长工作台",
  description: "排版猫把一个选题拆成公众号、小绿书、搜一搜、问一问和朋友圈五个微信入口，适合公众号副业号主和个人 IP 做内容矩阵。",
  path: "/",
  keywords: ["微信内容增长", "公众号副业", "公众号矩阵", "小绿书生成", "搜一搜关键词", "问一问回答"],
});

const freeTools = [
  { href: "/tools/wechat-title-generator", label: "公众号标题生成器", desc: "从一个选题拆出 12 个标题角度。" },
  { href: "/tools/topic-generator", label: "公众号选题生成器", desc: "生成适合五个微信入口的选题。" },
  { href: "/tools/green-note-generator", label: "小绿书文案生成器", desc: "生成图文脚本和图片提示词。" },
  { href: "/tools/search-keyword-helper", label: "搜一搜关键词助手", desc: "整理主关键词、长尾词和摘要建议。" },
  { href: "/tools/question-answer-generator", label: "问一问回答生成器", desc: "把选题改写成问答型内容。" },
  { href: "/tools/moments-copy-generator", label: "朋友圈文案生成器", desc: "生成更自然的私域转发文案。" },
  { href: "/tools/compliance-checker", label: "发布前检查", desc: "检查标题风险、AI 味和 CTA 突兀感。" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-emerald-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-slate-950">
            <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500 text-white">排</span>
            <span>排版猫</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <Link href="/tools/topic-generator">免费工具</Link>
            <Link href="/templates">模板库</Link>
            <Link href="/use-cases">场景</Link>
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
        <HomeHeroGenerator />
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

      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-col gap-2">
            <h2 className="text-2xl font-semibold text-slate-950">先用免费工具试一个入口</h2>
            <p className="text-slate-600">标题、选题、小绿书、搜一搜、问一问、朋友圈和发布检查都可以先从轻量工具开始。</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {freeTools.map((tool) => (
              <Link
                key={tool.href}
                className="rounded-lg border border-slate-100 bg-white p-4 transition hover:border-emerald-200 hover:shadow-sm"
                href={tool.href}
              >
                <h3 className="font-semibold text-slate-950">{tool.label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{tool.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-emerald-100 bg-white py-14">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">从模板开始，少在空白页前耗着</h2>
            <p className="mt-3 leading-7 text-slate-600">
              排版猫模板库把公众号长文、小绿书图文、搜一搜关键词、问一问回答和朋友圈转发拆成可复用结构。登录后可以沉淀成自己的账号模板。
            </p>
            <Button asChild className="mt-5">
              <Link href="/templates">
                查看模板库
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {["公众号痛点解决型长文", "小绿书 6 页图文脚本", "一个选题五入口发布"].map((item) => (
              <div key={item} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-950">{item}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">适合微信副业创作者快速搭建可发布内容结构。</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
