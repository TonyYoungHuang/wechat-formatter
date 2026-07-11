"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AccountProfileSwitcher } from "@/components/app/account-profile-switcher";
import { LogoutButton } from "@/components/app/logout-button";

export function AppHeaderProfileTools() {
  const pathname = usePathname();

  if (pathname.startsWith("/dashboard/admin")) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
        后台运营管理平台
      </div>
    );
  }

  return <AccountProfileSwitcher />;
}

export function AppHeaderActions({ isSiteAdmin }: { isSiteAdmin: boolean }) {
  const pathname = usePathname();

  if (pathname.startsWith("/dashboard/admin")) {
    return (
      <>
        <Link href="/dashboard" className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100">
          返回客户工作台
        </Link>
        <LogoutButton />
      </>
    );
  }

  return (
    <>
      {isSiteAdmin ? (
        <Link href="/dashboard/admin" className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100">
          进入运营后台
        </Link>
      ) : null}
      <LogoutButton />
      <Link href="/dashboard/generate" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
        新建内容
      </Link>
    </>
  );
}
