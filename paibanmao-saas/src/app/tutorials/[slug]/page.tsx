import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { PublicPageShell } from "@/components/marketing/public-shell";
import { Button } from "@/components/ui/button";
import { absoluteUrl, createPublicMetadata, jsonLdScript, siteUrl } from "@/lib/seo/metadata";
import { getRelatedTutorials, getTutorialBySlug, tutorialArticles } from "@/lib/seo/tutorials";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return tutorialArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getTutorialBySlug(slug);

  if (!article) {
    return {};
  }

  return createPublicMetadata({
    title: article.title,
    description: article.description,
    path: `/tutorials/${article.slug}`,
    keywords: [article.category, "公众号教程", "微信内容增长", "排版猫"],
    type: "article",
  });
}

export default async function TutorialDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const article = getTutorialBySlug(slug);

  if (!article) {
    notFound();
  }

  const related = getRelatedTutorials(article);
  const canonicalUrl = absoluteUrl(`/tutorials/${article.slug}`);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.description,
      articleSection: article.category,
      inLanguage: "zh-CN",
      mainEntityOfPage: canonicalUrl,
      author: {
        "@type": "Organization",
        name: "排版猫",
        url: siteUrl(),
      },
      publisher: {
        "@type": "Organization",
        name: "排版猫",
        url: siteUrl(),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "首页",
          item: siteUrl(),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "教程",
          item: absoluteUrl("/tutorials"),
        },
        {
          "@type": "ListItem",
          position: 3,
          name: article.title,
          item: canonicalUrl,
        },
      ],
    },
  ];

  return (
    <PublicPageShell contentClassName="max-w-4xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }} />
      <Link className="text-sm text-emerald-700" href="/tutorials">
        返回教程列表
      </Link>

      <article className="mt-5">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{article.category}</span>
          <span>{article.readMinutes} 分钟阅读</span>
        </div>
        <h1 className="mt-5 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">{article.title}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">{article.description}</p>

        <section className="mt-10 rounded-lg border border-emerald-300 bg-white p-6 shadow-sm shadow-emerald-900/[0.04]">
          <h2 className="text-2xl font-semibold text-slate-950">直接答案</h2>
          <p className="mt-3 text-lg leading-8 text-slate-700">{article.answer}</p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-slate-950">操作步骤</h2>
          <ol className="mt-4 space-y-3">
            {article.steps.map((step, index) => (
              <li key={step} className="grid grid-cols-[32px_1fr] gap-3 rounded-lg border border-emerald-200 bg-white p-4 shadow-sm shadow-emerald-900/[0.03]">
                <span className="flex size-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">{index + 1}</span>
                <span className="text-base leading-7 text-slate-700">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-slate-950">示例</h2>
          <p className="mt-3 rounded-lg border border-emerald-200 bg-white p-5 text-lg leading-8 text-slate-700 shadow-sm shadow-emerald-900/[0.03]">{article.example}</p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-slate-950">常见误区</h2>
          <ul className="mt-4 space-y-3">
            {article.pitfalls.map((pitfall) => (
              <li key={pitfall} className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-base leading-7 text-amber-900">
                {pitfall}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 rounded-lg border border-emerald-300 bg-white p-6 shadow-md shadow-emerald-900/[0.05]">
          <h2 className="text-2xl font-semibold text-slate-950">用排版猫生成</h2>
          <p className="mt-3 text-base leading-7 text-slate-700">你可以把这个问题直接交给排版猫，生成公众号、小绿书、搜一搜、问一问和朋友圈的完整内容包。</p>
          <Button asChild className="mt-5">
            <Link href={article.toolHref}>
              {article.toolLabel}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>

        {related.length ? (
          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-slate-950">相关教程</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {related.map((item) => (
                <Link key={item.slug} className="rounded-lg border border-emerald-200 bg-white p-4 text-base font-medium leading-7 text-slate-800 transition hover:border-emerald-400 hover:text-emerald-700" href={`/tutorials/${item.slug}`}>
                  {item.title}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </PublicPageShell>
  );
}
