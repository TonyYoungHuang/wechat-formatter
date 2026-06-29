import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const current = await getCurrentUser();

  if (!current) {
    redirect("/login");
  }

  return <AppShell current={current}>{children}</AppShell>;
}
