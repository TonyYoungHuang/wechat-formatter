import { AdminOperationsWorkbench } from "@/components/dashboard/admin-operations-workbench";
import { ActivationCodePanel } from "@/components/dashboard/activation-code-panel";
import { BillingWorkbench } from "@/components/dashboard/billing-workbench";
import { requireSiteAdmin } from "@/lib/auth/session";

export default async function AdminOperationsPage() {
  await requireSiteAdmin();
  return (
    <div className="space-y-8">
      <AdminOperationsWorkbench />
      <BillingWorkbench isSiteAdmin adminMode />
      <ActivationCodePanel isSiteAdmin adminMode />
    </div>
  );
}
