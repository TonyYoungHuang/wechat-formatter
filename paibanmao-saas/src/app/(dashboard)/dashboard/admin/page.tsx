import { AdminOperationsWorkbench } from "@/components/dashboard/admin-operations-workbench";
import { requireSiteAdmin } from "@/lib/auth/session";

export default async function AdminOperationsPage() {
  await requireSiteAdmin();
  return <AdminOperationsWorkbench />;
}
