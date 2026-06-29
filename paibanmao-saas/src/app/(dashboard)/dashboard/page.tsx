import Link from "next/link";
import { ArrowRight, FileText, Layers3, MessageSquareText, SearchCheck, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/session";
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
  { href: "/dashboard/cta-library", title: "沉淀 CTA", desc: "保存资料包、咨询和成交话术。", icon: MessageSquareText },
  { href: "/dashboard/checks", title: "发布前检查", desc: "检查风险表达、标题和 CTA。", icon: SearchCheck },
];

function quotaText(used: number, limit: number | null) {
  return limit === null ? `${used} / 不限` : `${used} / ${limit}`;
}

export default async function DashboardPage() {
  const current = await requireCurrentUser();
  const [accountProfileCount, projectCount, pendingCalendarCount, usage] = await Promise.all([
    prisma.accountProfile.count({ where: { workspaceId: current.workspace.id } }),
    prisma.contentProject.count({ where: { workspaceId: current.workspace.id } }),
    prisma.contentCalendarItem.count({ where: { workspaceId: current.workspace.id, status: { in: ["ready", "editing", "generated"] } } }),
    getGenerationUsageSummary(current.workspace.id, current.workspace.planCode),
  ]);

  const stats = [
    ["账号档案", `${accountProfileCount} / ${usage.plan.accountProfileLimit}`],
    ["今日生成", quotaText(usage.daily.used, usage.daily.limit)],
    ["本月生成", quotaText(usage.monthly.used, usage.monthly.limit)],
    ["待发布", String(pendingCalendarCount)],
    ["内容项目", String(projectCount)],
  ];

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
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50"
              >
                <span>{item}</span>
                <ArrowRight className="size-4 text-emerald-600" />
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
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
    </div>
  );
}
