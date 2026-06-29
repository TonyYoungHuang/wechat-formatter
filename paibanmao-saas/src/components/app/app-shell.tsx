import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, CreditCard, FileText, Home, Layers3, MessageSquareText, SearchCheck, Settings, Sparkles, UserRoundCog } from "lucide-react";

import { LogoutButton } from "@/components/app/logout-button";
import { isSiteAdminEmail, type getCurrentUser } from "@/lib/auth/session";
import { getGenerationUsageSummary } from "@/lib/usage/service";

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

const navItems = [
  { href: "/dashboard", label: "工作台", icon: Home },
  { href: "/dashboard/account-profiles", label: "账号档案", icon: UserRoundCog },
  { href: "/dashboard/topics", label: "选题库", icon: Layers3 },
  { href: "/dashboard/generate", label: "五入口生成", icon: Sparkles },
  { href: "/dashboard/editor", label: "公众号编辑", icon: FileText },
  { href: "/dashboard/projects", label: "内容项目", icon: FileText },
  { href: "/dashboard/calendar", label: "内容日历", icon: CalendarDays },
  { href: "/dashboard/templates", label: "模板库", icon: Layers3 },
  { href: "/dashboard/cta-library", label: "CTA 库", icon: MessageSquareText },
  { href: "/dashboard/checks", label: "发布检查", icon: SearchCheck },
  { href: "/dashboard/billing", label: "会员额度", icon: CreditCard },
  { href: "/dashboard/settings", label: "设置", icon: Settings, adminOnly: true },
];

const mobileNavHrefs = new Set(["/dashboard", "/dashboard/topics", "/dashboard/generate", "/dashboard/projects", "/dashboard/billing"]);

function formatRemaining(remaining: number | null) {
  return remaining === null ? "不限" : `${remaining} 次`;
}

export async function AppShell({ children, current }: { children: ReactNode; current: CurrentUser }) {
  const usage = await getGenerationUsageSummary(current.workspace.id, current.workspace.planCode);
  const isSiteAdmin = isSiteAdminEmail(current.user.email);
  const visibleNavItems = navItems.filter((item) => !("adminOnly" in item) || !item.adminOnly || isSiteAdmin);

  return (
    <div className="min-h-screen bg-[#f6faf7]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-emerald-100 bg-white lg:block">
        <div className="flex h-16 items-center gap-2 border-b border-emerald-100 px-5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500 text-sm font-semibold text-white">排</span>
          <div>
            <div className="font-semibold text-slate-950">排版猫</div>
            <div className="text-xs text-slate-500">微信内容增长工作台</div>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-emerald-100 bg-white/85 px-4 backdrop-blur sm:px-6">
          <div>
            <div className="text-sm font-medium text-slate-950">{current.workspace.name}</div>
            <div className="text-xs text-slate-500">
              {usage.plan.name} | 今日剩余 {formatRemaining(usage.daily.remaining)} | 本月剩余 {formatRemaining(usage.monthly.remaining)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LogoutButton />
            <Link href="/dashboard/generate" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              新建内容
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:pb-6">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-emerald-100 bg-white/95 px-2 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {visibleNavItems
            .filter((item) => mobileNavHrefs.has(item.href))
            .map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-xs text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700">
                  <Icon className="size-4" />
                  <span className="max-w-full truncate">{item.label}</span>
                </Link>
              );
            })}
        </div>
      </nav>
    </div>
  );
}
