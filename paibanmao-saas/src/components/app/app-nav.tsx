"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, FileText, Home, SearchCheck, Settings, ShieldCheck, Sparkles, UserRoundCog } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "工作台", icon: Home },
  { href: "/dashboard/account-profiles", label: "账号档案", icon: UserRoundCog },
  { href: "/dashboard/generate", label: "五入口生成", icon: Sparkles },
  { href: "/dashboard/editor", label: "公众号编辑", icon: FileText },
  { href: "/dashboard/checks", label: "发布检查", icon: SearchCheck },
  { href: "/dashboard/billing", label: "会员额度", icon: CreditCard },
  { href: "/dashboard/admin", label: "运营后台", icon: ShieldCheck, adminOnly: true },
  { href: "/dashboard/settings", label: "设置", icon: Settings, adminOnly: true },
];

const mobileNavHrefs = new Set(["/dashboard", "/dashboard/account-profiles", "/dashboard/generate", "/dashboard/checks", "/dashboard/billing"]);

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation({ isSiteAdmin, mode = "desktop" }: { isSiteAdmin: boolean; mode?: "desktop" | "mobile" }) {
  const pathname = usePathname();
  const visibleNavItems = navItems.filter((item) => !("adminOnly" in item) || !item.adminOnly || isSiteAdmin);

  if (mode === "mobile") {
    return (
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-emerald-200 bg-white/95 px-2 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {visibleNavItems
            .filter((item) => mobileNavHrefs.has(item.href))
            .map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  aria-current={active ? "page" : undefined}
                  href={item.href}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-xs transition",
                    active ? "bg-emerald-600 font-medium text-white shadow-sm shadow-emerald-900/10" : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="max-w-full truncate">{item.label}</span>
                </Link>
              );
            })}
        </div>
      </nav>
    );
  }

  return (
    <nav className="space-y-1 p-3">
      {visibleNavItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            aria-current={active ? "page" : undefined}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
              active ? "bg-emerald-600 font-medium text-white shadow-sm shadow-emerald-900/10" : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
