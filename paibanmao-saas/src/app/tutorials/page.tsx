import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { PublicPageShell } from "@/components/marketing/public-shell";
import { absoluteUrl, createPublicMetadata, jsonLdScript } from "@/lib/seo/metadata";
import { tutorialArticles } from "@/lib/seo/tutorials";

export const metadata: Metadata = createPublicMetadata({
  title: "微信内容增长教程",
  description: "面向公众号副业创作者的微信内容增长教程，覆盖公众号、小绿书、搜一搜、问一问和朋友圈五个入口。",
  path: "/tutorials",
  keywords: ["公众号教程", "微信内容增长", "小绿书教程", "搜一搜优化", "问一问运营"],
});

export default function TutorialsPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "微信内容增长教程",
    itemListElement: tutorialArticles.map((article, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/tutorials/${article.slug}`),
      name: article.title,
      description: article.description,
    })),
  };

  return (
    <PublicPageShell contentClassName="max-w-6xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }} />
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-sm text-emerald-700">
          <BookOpen className="size-4" />
          微信内容增长教程
        </div>
        <h1 className="mt-5 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">从一个选题，布局五个微信入口</h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">
          这里整理公众号、小绿书、搜一搜、问一问和朋友圈的实操教程。每篇文章都围绕一个具体问题，给出直接答案、操作步骤、示例和常见误区。
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {tutorialArticles.map((article) => (
          <article key={article.slug} className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm shadow-emerald-900/[0.04] transition hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-900/[0.07]">
            <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{article.category}</span>
              <span>{article.readMinutes} 分钟阅读</span>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-950">
              <Link href={`/tutorials/${article.slug}`}>{article.title}</Link>
            </h2>
            <p className="mt-3 line-clamp-3 text-base leading-7 text-slate-600">{article.description}</p>
            <Link className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-700" href={`/tutorials/${article.slug}`}>
              阅读教程
              <ArrowRight className="size-4" />
            </Link>
          </article>
        ))}
      </div>
    </PublicPageShell>
  );
}
