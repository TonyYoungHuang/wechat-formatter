import Link from "next/link";
import type { ReactNode } from "react";

import { AccountProfileSwitcher } from "@/components/app/account-profile-switcher";
import { AppNavigation } from "@/components/app/app-nav";
import { LogoutButton } from "@/components/app/logout-button";
import { BrandMark } from "@/components/brand/brand-logo";
import { isSiteAdminEmail, type getCurrentUser } from "@/lib/auth/session";
import { getGenerationUsageSummary } from "@/lib/usage/service";

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

function formatRemaining(remaining: number | null) {
  return remaining === null ? "不限" : `${remaining} 次`;
}

export async function AppShell({ children, current }: { children: ReactNode; current: CurrentUser }) {
  const usage = await getGenerationUsageSummary(current.workspace.id, current.workspace.planCode);
  const isSiteAdmin = isSiteAdminEmail(current.user.email);

  return (
    <div className="min-h-screen bg-[#f6faf7]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-emerald-100 bg-white lg:block">
        <div className="flex h-16 items-center gap-2 border-b border-emerald-100 px-5">
          <BrandMark />
          <div>
            <div className="font-semibold text-slate-950">排版猫</div>
            <div className="text-xs text-slate-500">微信内容增长工作台</div>
          </div>
        </div>
        <AppNavigation isSiteAdmin={isSiteAdmin} />
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex min-h-16 flex-col gap-3 border-b border-emerald-100 bg-white/85 px-4 py-3 backdrop-blur md:flex-row md:items-center md:justify-between sm:px-6">
          <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-950">{current.workspace.name}</div>
              <div className="text-xs text-slate-500">
                {usage.plan.name} | 今日剩余 {formatRemaining(usage.daily.remaining)} | 本月剩余 {formatRemaining(usage.monthly.remaining)}
              </div>
            </div>
            <AccountProfileSwitcher />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LogoutButton />
            <Link href="/dashboard/generate" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              新建内容
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:pb-6">{children}</main>
      </div>
      <div className="lg:hidden">
        <AppNavigation isSiteAdmin={isSiteAdmin} mode="mobile" />
      </div>
    </div>
  );
}
