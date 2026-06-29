import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { tutorialArticles } from "@/lib/seo/tutorials";

export const metadata: Metadata = {
  title: "微信内容增长教程",
  description: "面向公众号副业创作者的微信内容增长教程，覆盖公众号、小绿书、搜一搜、问一问和朋友圈五个入口。",
};

export default function TutorialsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-12 sm:px-6">
      <Link className="text-sm text-emerald-700" href="/">
        返回首页
      </Link>
      <div className="mt-4 max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-sm text-emerald-700">
          <BookOpen className="size-4" />
          微信内容增长教程
        </div>
        <h1 className="mt-5 text-3xl font-semibold text-slate-950 sm:text-4xl">从一个选题，布局五个微信入口</h1>
        <p className="mt-4 leading-7 text-slate-600">
          这里整理公众号、小绿书、搜一搜、问一问和朋友圈的实操教程。每篇文章都围绕一个具体问题，给出直接答案、操作步骤、示例和常见误区。
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {tutorialArticles.map((article) => (
          <article key={article.slug} className="rounded-lg border border-emerald-100 bg-white p-5">
            <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{article.category}</span>
              <span>{article.readMinutes} 分钟阅读</span>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-950">
              <Link href={`/tutorials/${article.slug}`}>{article.title}</Link>
            </h2>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{article.description}</p>
            <Link className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-700" href={`/tutorials/${article.slug}`}>
              阅读教程
              <ArrowRight className="size-4" />
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
