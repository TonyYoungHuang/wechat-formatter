import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, CreditCard, FileText, SearchCheck, Sparkles, UserRoundCog } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getGenerationUsageSummary } from "@/lib/usage/service";

const starterTopics = [
  "普通人做公众号副业还有机会吗？",
  "小绿书适合哪些公众号创作者使用？",
  "问一问怎么给公众号带来精准关注？",
];

const quickActions = [
  {
    href: "/dashboard/account-profiles",
    title: "账号档案",
    desc: "先写清楚你的定位、读者和产品。",
    icon: UserRoundCog,
  },
  {
    href: "/dashboard/generate",
    title: "五入口生成",
    desc: "一个选题生成公众号、小绿书、搜一搜、问一问和朋友圈。",
    icon: Sparkles,
  },
  {
    href: "/dashboard/editor",
    title: "公众号编辑",
    desc: "整理公众号 HTML，复制到微信公众平台。",
    icon: FileText,
  },
  {
    href: "/dashboard/checks",
    title: "发布检查",
    desc: "检查标题风险、AI 味和 CTA 突兀感。",
    icon: SearchCheck,
  },
];

function quotaText(used: number, limit: number | null) {
  if (limit === null) return `${used} / 不限`;
  return `${used} / ${limit}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(date);
}

export default async function DashboardPage() {
  const current = await getCurrentUser();

  if (!current) {
    redirect("/login");
  }

  const [accountProfileCount, usage, recentProjects] = await Promise.all([
    prisma.accountProfile.count({ where: { workspaceId: current.workspace.id } }),
    getGenerationUsageSummary(current.workspace.id, current.workspace.planCode),
    prisma.contentProject.findMany({
      where: { workspaceId: current.workspace.id },
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: {
        accountProfile: { select: { name: true } },
        variants: { select: { entry: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-emerald-200 bg-white p-6 shadow-sm shadow-emerald-950/[0.04]">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-emerald-700">排版猫工作台</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">从一个选题，生成微信五个入口</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              这里主要做三件事：建立账号档案、生成五入口内容、检查并复制到公众号。其他素材库和运营管理入口先收起来，避免影响普通用户上手。
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard/generate" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white transition hover:bg-emerald-700">
                开始五入口生成
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/dashboard/account-profiles" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50">
                完善账号档案
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-[#f5fbf7] p-4">
            <div className="text-sm font-medium text-slate-600">当前套餐</div>
            <div className="mt-2 text-2xl font-semibold text-slate-950">{usage.plan.name}</div>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="rounded-lg bg-white p-3">
                <div className="text-slate-500">今日生成</div>
                <div className="mt-1 font-semibold text-slate-950">{quotaText(usage.daily.used, usage.daily.limit)}</div>
              </div>
              <div className="rounded-lg bg-white p-3">
                <div className="text-slate-500">本月生成</div>
                <div className="mt-1 font-semibold text-slate-950">{quotaText(usage.monthly.used, usage.monthly.limit)}</div>
              </div>
            </div>
            <Link href="/dashboard/billing" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800">
              套餐、激活码和额度
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/[0.03] transition hover:border-emerald-300 hover:bg-emerald-50">
              <Icon className="mb-4 size-6 text-emerald-600" />
              <div className="text-lg font-semibold text-slate-950">{action.title}</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">{action.desc}</div>
            </Link>
          );
        })}
      </section>

      {accountProfileCount === 0 ? (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-amber-600" />
              第一次使用，建议先建账号档案
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm leading-6 text-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <p>账号档案会告诉 AI：你是谁、写给谁、用什么语气、引导读者做什么。建好后生成内容会稳定很多。</p>
            <Link href="/dashboard/account-profiles" className="inline-flex shrink-0 items-center gap-1 font-medium text-emerald-700 hover:text-emerald-800">
              去创建
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>可以直接试的选题</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {starterTopics.map((topic) => (
              <Link
                key={topic}
                href={`/dashboard/generate?topic=${encodeURIComponent(topic)}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50"
              >
                <span>{topic}</span>
                <ArrowRight className="size-4 shrink-0 text-emerald-600" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近生成</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentProjects.length ? (
              recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/editor?projectId=${project.id}`}
                  className="block rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-emerald-200 hover:bg-emerald-50"
                >
                  <div className="truncate text-sm font-medium text-slate-950">{project.title}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {project.accountProfile.name} · {project.variants.length} 个入口 · {formatDate(project.updatedAt)}
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm leading-6 text-slate-600">
                还没有生成内容。点击“五入口生成”，先跑一套公众号、小绿书、搜一搜、问一问和朋友圈。
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/dashboard/billing" className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm shadow-emerald-950/[0.03] transition hover:border-emerald-300 hover:bg-emerald-50">
          <CreditCard className="mb-3 size-5 text-emerald-600" />
          <div className="font-semibold text-slate-950">激活码、套餐和生图额度</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">购买激活码后，在会员额度页输入，即可绑定当前邮箱账号。</p>
        </Link>
        <Link href="/dashboard/checks" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/[0.03] transition hover:border-emerald-300 hover:bg-emerald-50">
          <SearchCheck className="mb-3 size-5 text-emerald-600" />
          <div className="font-semibold text-slate-950">发之前检查一下</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">检查标题风险、AI 味、表达是否太硬，适合最后发布前看一眼。</p>
        </Link>
      </section>
    </div>
  );
}
