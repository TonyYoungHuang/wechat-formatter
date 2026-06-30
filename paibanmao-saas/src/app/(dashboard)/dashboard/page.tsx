import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, FileText, Layers3, MessageSquareText, SearchCheck, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getGenerationUsageSummary } from "@/lib/usage/service";

const suggestions = [
  "普通人做公众号副业还有机会吗？",
  "小绿书适合哪些公众号创作者使用？",
  "问一问怎么给公众号带来精准关注？",
];

const actions = [
  { href: "/dashboard/account-profiles", title: "完善账号档案", desc: "让 AI 知道你是谁、写给谁、卖什么。", icon: FileText },
  { href: "/dashboard/topics", title: "生成选题", desc: "围绕一个账号生成可复用选题。", icon: Layers3 },
  { href: "/dashboard/generate", title: "五入口生成", desc: "把一个选题拆成微信五个入口。", icon: Sparkles },
  { href: "/dashboard/templates", title: "复用模板", desc: "沉淀文章结构和图文脚本。", icon: Layers3 },
  { href: "/dashboard/cta-library", title: "沉淀 CTA", desc: "保存资料包、咨询和成交话术。", icon: MessageSquareText },
  { href: "/dashboard/checks", title: "发布前检查", desc: "检查风险表达、标题和 CTA。", icon: SearchCheck },
];

const statusLabels: Record<string, string> = {
  idea: "选题",
  generated: "已生成",
  editing: "编辑中",
  ready: "待发布",
  published: "已发布",
  reviewed: "已复盘",
};

const completenessFields = [
  "name",
  "niche",
  "persona",
  "audience",
  "audiencePainPoints",
  "productOrService",
  "monetizationMethods",
  "tone",
  "commonCta",
  "forbiddenWords",
  "sampleText",
] as const;

type CompletenessProfile = Partial<Record<(typeof completenessFields)[number], string | string[] | null>> | null;

function quotaText(used: number, limit: number | null) {
  return limit === null ? `${used} / 不限` : `${used} / ${limit}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(date);
}

function profileCompleteness(profile: CompletenessProfile) {
  if (!profile) {
    return 0;
  }

  const filled = completenessFields.filter((field) => {
    const value = profile[field];

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return typeof value === "string" && value.trim().length > 0;
  }).length;

  return Math.round((filled / completenessFields.length) * 100);
}

export default async function DashboardPage() {
  const current = await getCurrentUser();

  if (!current) {
    redirect("/login");
  }

  const [accountProfileCount, projectCount, pendingCalendarCount, usage, defaultProfile, recentProjects, upcomingItems] = await Promise.all([
    prisma.accountProfile.count({ where: { workspaceId: current.workspace.id } }),
    prisma.contentProject.count({ where: { workspaceId: current.workspace.id } }),
    prisma.contentCalendarItem.count({ where: { workspaceId: current.workspace.id, status: { in: ["ready", "editing", "generated"] } } }),
    getGenerationUsageSummary(current.workspace.id, current.workspace.planCode),
    prisma.accountProfile.findFirst({
      where: { workspaceId: current.workspace.id, isDefault: true },
      include: { _count: { select: { projects: true, topics: true } } },
    }),
    prisma.contentProject.findMany({
      where: { workspaceId: current.workspace.id },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: {
        accountProfile: { select: { name: true } },
        variants: { select: { entry: true } },
      },
    }),
    prisma.contentCalendarItem.findMany({
      where: { workspaceId: current.workspace.id, status: { in: ["ready", "editing", "generated"] } },
      orderBy: { scheduledFor: "asc" },
      take: 4,
      include: {
        accountProfile: { select: { name: true } },
        project: { select: { id: true, title: true } },
      },
    }),
  ]);

  const completeness = profileCompleteness(defaultProfile);

  const stats = [
    ["账号档案", `${accountProfileCount} / ${usage.plan.accountProfileLimit}`],
    ["今日生成", quotaText(usage.daily.used, usage.daily.limit)],
    ["本月生成", quotaText(usage.monthly.used, usage.monthly.limit)],
    ["待发布", String(pendingCalendarCount)],
    ["内容项目", String(projectCount)],
  ];
  const onboardingSteps = [
    { done: accountProfileCount > 0, title: "建立账号档案", desc: "先让 AI 记住你的定位、读者、产品和禁用词。", href: "/dashboard/account-profiles" },
    { done: projectCount > 0, title: "生成第一套五入口内容", desc: "用一个选题生成公众号、小绿书、搜一搜、问一问和朋友圈。", href: "/dashboard/generate" },
    { done: pendingCalendarCount > 0, title: "加入发布日历", desc: "把半自动发布动作排进日历，形成稳定更新节奏。", href: "/dashboard/calendar" },
  ];
  const showOnboarding = onboardingSteps.some((step) => !step.done);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">工作台</h1>
        <p className="mt-1 text-sm text-slate-600">从一个选题开始，生成五个微信入口的内容包。</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="text-sm text-slate-500">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-slate-950">{value}</CardContent>
          </Card>
        ))}
      </div>
      {showOnboarding ? (
        <Card className="border-emerald-100 bg-white">
          <CardHeader>
            <CardTitle>首次使用引导</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {onboardingSteps.map((step, index) => (
              <Link
                key={step.title}
                href={step.href}
                className="rounded-lg border border-slate-100 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-emerald-50"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs text-slate-500">{index + 1}</span>
                  {step.done ? <CheckCircle2 className="size-4 text-emerald-600" /> : null}
                  {step.title}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{step.desc}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>今日建议选题</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map((item) => (
              <Link
                key={item}
                href={`/dashboard/generate?topic=${encodeURIComponent(item)}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50"
              >
                <span>{item}</span>
                <ArrowRight className="size-4 shrink-0 text-emerald-600" />
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>当前套餐</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-slate-950">{usage.plan.name}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              今日已用 {usage.daily.used} 次，本月已用 {usage.monthly.used} 次。套餐额度从后台配置读取，支付成功后立即更新。
            </p>
            <Link href="/dashboard/billing" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800">
              查看套餐与支付
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href} className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-200 hover:bg-emerald-50">
              <Icon className="mb-3 size-5 text-emerald-600" />
              <div className="font-medium text-slate-950">{action.title}</div>
              <div className="mt-1 text-sm leading-6 text-slate-600">{action.desc}</div>
            </Link>
          );
        })}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>最近内容项目</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentProjects.length ? (
              recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/editor?projectId=${project.id}`}
                  className="block rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-emerald-200 hover:bg-emerald-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-950">{project.title}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {project.accountProfile.name} · {project.variants.length} 个入口 · {formatDate(project.updatedAt)}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs text-slate-600">{statusLabels[project.status] || project.status}</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm leading-6 text-slate-600">
                还没有内容项目。先从一个选题生成公众号、小绿书、搜一搜、问一问和朋友圈内容。
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>待发布内容</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingItems.length ? (
              upcomingItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.project?.id ? `/dashboard/editor?projectId=${item.project.id}` : "/dashboard/calendar"}
                  className="block rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-emerald-200 hover:bg-emerald-50"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-white p-2 text-emerald-700">
                      <CalendarDays className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-950">{item.title}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatDate(item.scheduledFor)} · {item.accountProfile?.name || "通用账号"} · {statusLabels[item.status] || item.status}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm leading-6 text-slate-600">
                还没有排期内容。生成内容后可以加入内容日历，形成固定发布节奏。
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>账号档案完整度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-3xl font-semibold text-slate-950">{completeness}%</div>
                <div className="mt-1 text-sm text-slate-500">{defaultProfile?.name || "暂无默认账号"}</div>
              </div>
              <Link href="/dashboard/account-profiles" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800">
                去完善
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-4 h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${completeness}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-slate-500">关联选题</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">{defaultProfile?._count.topics ?? 0}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-slate-500">内容项目</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">{defaultProfile?._count.projects ?? 0}</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">档案越完整，AI 越能稳定复用你的定位、语气、读者痛点和成交动作。</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
