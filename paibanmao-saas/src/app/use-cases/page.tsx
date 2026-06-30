import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PublicShell } from "@/components/marketing/public-shell";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { useCasePages } from "@/lib/seo/use-cases";

export const metadata = createPublicMetadata({
  title: "微信内容增长场景",
  description: "排版猫整理公众号副业、个人 IP、多账号矩阵、小绿书、搜一搜和问一问等微信内容增长场景，帮助创作者一题多发。",
  path: "/use-cases",
  keywords: ["微信内容增长", "公众号内容矩阵", "小绿书生成", "搜一搜关键词", "问一问回答"],
});

export default function UseCasesPage() {
  return (
    <PublicShell ctaHref="/register" ctaLabel="开始使用">
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-emerald-700">微信内容增长场景</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal text-slate-950 md:text-5xl">一个选题，覆盖更多微信入口</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            排版猫把公众号、小绿书、搜一搜、问一问和朋友圈整理成可执行的内容工作流，适合副业创作者、个人 IP 和多账号小团队。
          </p>
        </div>
      </section>

      <section className="border-y border-emerald-200 bg-[#f5fbf7] py-12">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3">
          {useCasePages.map((item) => (
            <Link key={item.slug} href={`/use-cases/${item.slug}`} className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm shadow-emerald-900/[0.04] transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-900/[0.07]">
              <div className="text-sm font-medium text-emerald-700">{item.audience}</div>
              <h2 className="mt-3 text-xl font-semibold text-slate-950">{item.title}</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">{item.description}</p>
              <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
                查看场景方案
                <ArrowRight className="size-4" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
