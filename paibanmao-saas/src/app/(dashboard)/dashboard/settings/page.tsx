import { SettingsWorkbench } from "@/components/dashboard/settings-workbench";
import { getCurrentUser, isSiteAdminEmail } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const current = await getCurrentUser();

  if (!current || !isSiteAdminEmail(current.user.email)) {
    redirect("/dashboard");
  }

  return <SettingsWorkbench />;
}
