import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
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

  return {
    title: article.title,
    description: article.description,
    alternates: {
      canonical: `/tutorials/${article.slug}`,
    },
  };
}

export default async function TutorialDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const article = getTutorialBySlug(slug);

  if (!article) {
    notFound();
  }

  const related = getRelatedTutorials(article);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-12 sm:px-6">
      <Link className="text-sm text-emerald-700" href="/tutorials">
        返回教程列表
      </Link>

      <article className="mt-5">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{article.category}</span>
          <span>{article.readMinutes} 分钟阅读</span>
        </div>
        <h1 className="mt-5 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">{article.title}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">{article.description}</p>

        <section className="mt-10 rounded-lg border border-emerald-100 bg-white p-6">
          <h2 className="text-xl font-semibold text-slate-950">直接答案</h2>
          <p className="mt-3 leading-8 text-slate-700">{article.answer}</p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-950">操作步骤</h2>
          <ol className="mt-4 space-y-3">
            {article.steps.map((step, index) => (
              <li key={step} className="grid grid-cols-[32px_1fr] gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <span className="flex size-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">{index + 1}</span>
                <span className="leading-7 text-slate-700">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-950">示例</h2>
          <p className="mt-3 rounded-lg border border-slate-200 bg-white p-5 leading-8 text-slate-700">{article.example}</p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-950">常见误区</h2>
          <ul className="mt-4 space-y-3">
            {article.pitfalls.map((pitfall) => (
              <li key={pitfall} className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 leading-7 text-amber-900">
                {pitfall}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 rounded-lg border border-emerald-100 bg-emerald-50 p-6">
          <h2 className="text-xl font-semibold text-slate-950">用排版猫生成</h2>
          <p className="mt-3 leading-7 text-slate-700">你可以把这个问题直接交给排版猫，生成公众号、小绿书、搜一搜、问一问和朋友圈的完整内容包。</p>
          <Button asChild className="mt-5">
            <Link href={article.toolHref}>
              {article.toolLabel}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>

        {related.length ? (
          <section className="mt-10">
            <h2 className="text-xl font-semibold text-slate-950">相关教程</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {related.map((item) => (
                <Link key={item.slug} className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium leading-6 text-slate-800 hover:border-emerald-200 hover:text-emerald-700" href={`/tutorials/${item.slug}`}>
                  {item.title}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </main>
  );
}
