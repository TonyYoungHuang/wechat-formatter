import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { absoluteUrl, createPublicMetadata, jsonLdScript } from "@/lib/seo/metadata";
import { getUseCasePage, useCasePages } from "@/lib/seo/use-cases";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return useCasePages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const page = getUseCasePage(slug);

  if (!page) {
    return {};
  }

  return createPublicMetadata({
    title: page.metaTitle,
    description: page.description,
    path: `/use-cases/${page.slug}`,
    keywords: page.keywords,
  });
}

export default async function UseCaseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getUseCasePage(slug);

  if (!page) {
    notFound();
  }

  const url = absoluteUrl(`/use-cases/${page.slug}`);
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "微信内容增长场景", item: absoluteUrl("/use-cases") },
      { "@type": "ListItem", position: 3, name: page.title, item: url },
    ],
  };

  return (
    <main className="min-h-screen bg-[#f6faf7]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbLd) }} />

      <header className="border-b border-emerald-100 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <BrandLogo />
          <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <Link href="/use-cases">场景</Link>
            <Link href="/tools/topic-generator">免费工具</Link>
            <Link href="/templates">模板库</Link>
            <Link href="/tutorials">教程</Link>
          </nav>
          <Button asChild size="sm">
            <Link href="/register">免费开始</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_360px]">
        <div>
          <Link href="/use-cases" className="text-sm font-medium text-emerald-700">微信内容增长场景</Link>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal text-slate-950 md:text-5xl">{page.title}</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">{page.description}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/register">
                建立账号档案
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/tools/topic-generator">先试免费选题</Link>
            </Button>
          </div>
        </div>
        <Card className="border-emerald-100">
          <CardHeader>
            <CardTitle>适合谁</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-slate-600">{page.audience}</CardContent>
        </Card>
      </section>

      <section className="border-y border-emerald-100 bg-white py-12">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-3">
          <InfoBlock title="常见问题" items={page.painPoints} />
          <InfoBlock title="发布前检查" items={page.checklist} />
          <InfoBlock title="推荐流程" items={page.workflow} ordered />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-950">五个微信入口怎么分工</h2>
          <p className="mt-2 text-slate-600">同一个选题不需要重复创作五遍，关键是每个入口承担不同任务。</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {page.entries.map((entry) => (
            <Card key={entry.name} className="border-slate-100">
              <CardHeader>
                <CardTitle className="text-base">{entry.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-slate-600">{entry.value}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-emerald-100 bg-white py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold text-slate-950">常见问题</h2>
          <div className="mt-6 space-y-4">
            {page.faq.map((item) => (
              <div key={item.question} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-950">{item.question}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-6 md:flex md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">用排版猫生成你的第一套五入口内容</h2>
            <p className="mt-2 text-slate-700">从账号档案开始，让 AI 知道你是谁、写给谁、卖什么、哪些话不能说。</p>
          </div>
          <Button asChild className="mt-5 md:mt-0">
            <Link href="/register">开始使用</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

function InfoBlock({ title, items, ordered = false }: { title: string; items: string[]; ordered?: boolean }) {
  const ListTag = ordered ? "ol" : "ul";

  return (
    <Card className="border-slate-100">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ListTag className="space-y-3 text-sm leading-6 text-slate-600">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <span>{item}</span>
            </li>
          ))}
        </ListTag>
      </CardContent>
    </Card>
  );
}
