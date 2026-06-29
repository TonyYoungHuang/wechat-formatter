import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, CreditCard, FileText, Home, Layers3, SearchCheck, Settings, Sparkles, UserRoundCog } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "工作台", icon: Home },
  { href: "/dashboard/account-profiles", label: "账号档案", icon: UserRoundCog },
  { href: "/dashboard/topics", label: "选题库", icon: Layers3 },
  { href: "/dashboard/generate", label: "五入口生成", icon: Sparkles },
  { href: "/dashboard/projects", label: "内容项目", icon: FileText },
  { href: "/dashboard/calendar", label: "内容日历", icon: CalendarDays },
  { href: "/dashboard/checks", label: "发布检查", icon: SearchCheck },
  { href: "/dashboard/billing", label: "会员额度", icon: CreditCard },
  { href: "/dashboard/settings", label: "设置", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6faf7]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-emerald-100 bg-white lg:block">
        <div className="flex h-16 items-center gap-2 border-b border-emerald-100 px-5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500 text-sm font-semibold text-white">
            排
          </span>
          <div>
            <div className="font-semibold text-slate-950">排版猫</div>
            <div className="text-xs text-slate-500">微信内容增长工作台</div>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
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
            <div className="text-sm font-medium text-slate-950">默认账号档案</div>
            <div className="text-xs text-slate-500">免费版 · 今日剩余 1 次生成</div>
          </div>
          <Link
            href="/dashboard/generate"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            新建内容
          </Link>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
