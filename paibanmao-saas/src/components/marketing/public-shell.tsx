import Link from "next/link";
import type { ReactNode } from "react";

import { AuthAwarePublicCta, AuthAwarePublicLoginLink } from "@/components/marketing/auth-aware-public-actions";
import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/tools/topic-generator", label: "免费工具" },
  { href: "/templates", label: "模板库" },
  { href: "/use-cases", label: "场景" },
  { href: "/pricing", label: "价格" },
  { href: "/tutorials", label: "教程" },
];

export function PublicHeader({
  ctaHref = "/dashboard",
  ctaLabel = "开始使用",
  className,
}: {
  ctaHref?: string;
  ctaLabel?: string;
  className?: string;
}) {
  return (
    <header className={cn("sticky top-0 z-30 border-b border-emerald-200 bg-white/92 backdrop-blur", className)}>
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
        <BrandLogo />
        <nav className="hidden items-center gap-7 text-base font-medium text-slate-600 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} className="transition hover:text-emerald-700" href={item.href}>
              {item.label}
            </Link>
          ))}
          <AuthAwarePublicLoginLink />
        </nav>
        <AuthAwarePublicCta ctaHref={ctaHref} ctaLabel={ctaLabel} />
      </div>
    </header>
  );
}

export function PublicPageShell({
  children,
  contentClassName,
  ctaHref,
  ctaLabel,
}: {
  children: ReactNode;
  contentClassName?: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <main className="min-h-screen bg-[#f5fbf7]">
      <PublicHeader ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <div className={cn("mx-auto max-w-7xl px-4 py-12 sm:px-6", contentClassName)}>{children}</div>
      <PublicFooter />
    </main>
  );
}

export function PublicShell({
  children,
  ctaHref,
  ctaLabel,
}: {
  children: ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <main className="min-h-screen bg-[#f5fbf7]">
      <PublicHeader ctaHref={ctaHref} ctaLabel={ctaLabel} />
      {children}
      <PublicFooter />
    </main>
  );
}

export function PublicFooter() {
  const icpRecordNumber = process.env.NEXT_PUBLIC_ICP_RECORD_NUMBER || "辽ICP备2026005406号-1";
  const psbRecordNumber = process.env.NEXT_PUBLIC_PSB_RECORD_NUMBER || "辽公网安备21011202001240号";
  const psbRecordUrl = process.env.NEXT_PUBLIC_PSB_RECORD_URL || "https://beian.mps.gov.cn/#/query/webSearch";

  return (
    <footer className="border-t border-emerald-200 bg-white/85">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:px-6 md:flex-row">
        <div>© 2026 排版猫</div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {icpRecordNumber ? (
            <a className="transition hover:text-emerald-700" href="https://beian.miit.gov.cn/" rel="noreferrer" target="_blank">
              {icpRecordNumber}
            </a>
          ) : (
            <span>ICP备案号待配置</span>
          )}
          {psbRecordNumber ? (
            <a className="transition hover:text-emerald-700" href={psbRecordUrl} rel="noreferrer" target="_blank">
              {psbRecordNumber}
            </a>
          ) : (
            <span>公安联网备案号待配置</span>
          )}
        </div>
      </div>
    </footer>
  );
}
