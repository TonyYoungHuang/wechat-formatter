import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Layers3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { publicTemplates, templateEntryLabels } from "@/lib/seo/public-templates";

export const metadata: Metadata = {
  title: "公众号内容模板库",
  description:
    "排版猫公开模板库，提供公众号长文、小绿书图文、微信搜一搜、问一问和朋友圈转发模板，适合微信副业创作者搭建内容矩阵。",
};

const scenarios = ["公众号副业新手", "个人 IP 创作者", "本地服务商家", "知识付费和咨询账号"];

export default function PublicTemplatesPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-emerald-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <Link className="text-sm text-emerald-700" href="/">
            返回首页
          </Link>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-sm text-emerald-700">
                <Layers3 className="size-4" />
                微信内容模板库
              </div>
              <h1 className="mt-5 max-w-3xl text-3xl font-semibold text-slate-950 sm:text-4xl">
                公众号、小绿书、搜一搜、问一问和朋友圈都能复用的内容模板
              </h1>
              <p className="mt-4 max-w-3xl leading-7 text-slate-600">
                这里整理排版猫的公开模板样例。你可以先看结构，登录后把模板保存到自己的账号档案里，再让 AI 按你的定位、读者和变现方式生成完整内容。
              </p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-5">
              <h2 className="font-semibold text-slate-950">适合这些创作者</h2>
              <div className="mt-4 grid gap-3 text-sm text-slate-700">
                {scenarios.map((scenario) => (
                  <p key={scenario} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    {scenario}
                  </p>
                ))}
              </div>
              <Button asChild className="mt-5 w-full">
                <Link href="/register">
                  保存到我的模板库
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          {publicTemplates.map((template) => (
            <article key={template.slug} className="rounded-lg border border-slate-100 bg-white p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{templateEntryLabels[template.entry]}</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{template.category}</span>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-950">{template.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{template.suitableFor}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{template.preview}</p>
              <div className="mt-4 grid gap-2">
                {template.sections.map((section, index) => (
                  <div key={section} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-emerald-700">
                      {index + 1}
                    </span>
                    {section}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-lg border border-emerald-100 bg-white p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">想把模板变成自己的账号风格？</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                登录后可以为不同公众号、小绿书方向、问一问身份分别保存模板，并和五入口生成器、发布前检查一起使用。
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/templates">
                进入模板库
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
