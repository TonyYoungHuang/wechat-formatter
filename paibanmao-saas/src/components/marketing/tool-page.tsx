import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToolPreviewForm } from "@/components/marketing/tool-preview-form";
import type { PublicToolKind } from "@/lib/tools/public-tool-preview";
import { absoluteUrl, jsonLdScript, siteUrl } from "@/lib/seo/metadata";

const relatedTools = [
  { href: "/templates", label: "微信内容模板库" },
  { href: "/tools/wechat-title-generator", label: "公众号标题生成器" },
  { href: "/tools/topic-generator", label: "公众号选题生成器" },
  { href: "/tools/green-note-generator", label: "小绿书文案生成器" },
  { href: "/tools/search-keyword-helper", label: "微信搜一搜关键词助手" },
  { href: "/tools/question-answer-generator", label: "微信问一问回答生成器" },
  { href: "/tools/moments-copy-generator", label: "朋友圈转发文案生成器" },
  { href: "/tools/compliance-checker", label: "公众号发布前检查" },
];

const toolPaths: Record<PublicToolKind, string> = {
  topic: "/tools/topic-generator",
  green_note: "/tools/green-note-generator",
  search: "/tools/search-keyword-helper",
  question: "/tools/question-answer-generator",
  moments: "/tools/moments-copy-generator",
  compliance: "/tools/compliance-checker",
};

export function ToolPage({
  title,
  description,
  placeholder,
  unlocks,
  toolKind,
}: {
  title: string;
  description: string;
  placeholder: string;
  unlocks: string[];
  toolKind: PublicToolKind;
}) {
  const canonicalUrl = absoluteUrl(toolPaths[toolKind]);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: title,
      description,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: canonicalUrl,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "CNY",
      },
      provider: {
        "@type": "Organization",
        name: "排版猫",
        url: siteUrl(),
      },
      featureList: unlocks,
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
          name: title,
          item: canonicalUrl,
        },
      ],
    },
  ];

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-12 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }} />
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
              <ToolPreviewForm kind={toolKind} placeholder={placeholder} />
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
      <section className="mt-10 border-t border-slate-100 pt-8">
        <h2 className="text-xl font-semibold text-slate-950">相关免费工具</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {relatedTools.map((tool) => (
            <Link
              key={tool.href}
              className="rounded-lg border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
              href={tool.href}
            >
              {tool.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
