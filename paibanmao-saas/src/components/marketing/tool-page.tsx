import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { PublicPageShell } from "@/components/marketing/public-shell";
import { UsageStepsFlow } from "@/components/marketing/usage-steps-flow";
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

const toolActionLabels: Record<PublicToolKind, string> = {
  topic: "选题",
  green_note: "小绿书图文文案",
  search: "搜一搜关键词建议",
  question: "问一问回答草稿",
  moments: "朋友圈转发文案",
  compliance: "发布前检查结果",
};

function usageSteps(title: string, toolKind: PublicToolKind) {
  const target = toolActionLabels[toolKind];

  return [
    `输入你的主题、读者或现有内容，尽量写清楚账号方向和想达到的目标。`,
    `先生成一次免费预览，快速判断这个方向是否适合继续写。`,
    `登录排版猫后，把${target}保存进工作台，并继续生成公众号、小绿书、搜一搜、问一问和朋友圈内容包。`,
    `进入编辑器做公众号 HTML 排版、小绿书图片提示词、发布前检查和内容日历安排。`,
  ];
}

function faqs(title: string, toolKind: PublicToolKind) {
  const target = toolActionLabels[toolKind];
  const saveAnswer =
    toolKind === "compliance"
      ? "未登录可以试用一次基础预览；登录后可以把检查报告保存到内容项目，并继续按入口做发布前复核。"
      : `未登录可以试用一次预览；登录后可以保存完整${target}，并继续生成五个微信入口内容。`;

  return [
    {
      question: `${title}适合谁使用？`,
      answer: "适合公众号副业创作者、个人 IP、个体商家和小团队，用来把一个主题拆成更容易发布和复用的微信内容。",
    },
    {
      question: "免费预览和登录后的结果有什么区别？",
      answer: saveAnswer,
    },
    {
      question: "生成结果可以直接发布吗？",
      answer: "建议把结果当作初稿和结构参考。发布前仍需要结合你的真实经历、产品信息和平台规则人工修改，排版猫不承诺流量、收入、排名或审核通过。",
    },
  ];
}

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
  const steps = usageSteps(title, toolKind);
  const faqItems = faqs(title, toolKind);
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
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ];

  return (
    <PublicPageShell contentClassName="max-w-5xl" ctaHref="/register" ctaLabel="免费开始">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }} />
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <p className="mb-3 text-sm font-medium text-emerald-700">排版猫免费工具</p>
          <h1 className="text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">{title}</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">{description}</p>
          <Card className="mt-6 border-emerald-300 shadow-md shadow-emerald-900/[0.05]">
            <CardHeader>
              <CardTitle>免费试用</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToolPreviewForm kind={toolKind} placeholder={placeholder} />
            </CardContent>
          </Card>
        </div>
        <Card className="border-emerald-300 shadow-md shadow-emerald-900/[0.05]">
          <CardHeader>
            <CardTitle>登录后解锁</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-base leading-7 text-slate-600">
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
      <section className="mt-10 border-t border-emerald-200 pt-8">
        <h2 className="text-2xl font-semibold text-slate-950">怎么使用这个工具</h2>
        <UsageStepsFlow steps={steps} />
      </section>
      <section className="mt-10 border-t border-emerald-200 pt-8">
        <h2 className="text-2xl font-semibold text-slate-950">常见问题</h2>
        <div className="mt-4 space-y-3">
          {faqItems.map((item) => (
            <details key={item.question} className="rounded-lg border border-emerald-200 bg-white p-4 shadow-sm shadow-emerald-900/[0.03]">
              <summary className="cursor-pointer text-base font-semibold text-slate-950">{item.question}</summary>
              <p className="mt-3 text-base leading-7 text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="mt-10 border-t border-emerald-200 pt-8">
        <h2 className="text-2xl font-semibold text-slate-950">相关免费工具</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {relatedTools.map((tool) => (
            <Link
              key={tool.href}
              className="rounded-lg border border-emerald-200 bg-white px-4 py-3 text-base text-slate-700 shadow-sm shadow-emerald-900/[0.03] transition hover:border-emerald-400 hover:text-emerald-700"
              href={tool.href}
            >
              {tool.label}
            </Link>
          ))}
        </div>
      </section>
    </PublicPageShell>
  );
}
