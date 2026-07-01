import { ActivationCodePanel } from "@/components/dashboard/activation-code-panel";
import { BillingWorkbench } from "@/components/dashboard/billing-workbench";
import { getCurrentUser, isSiteAdminEmail } from "@/lib/auth/session";

export default async function BillingPage() {
  const current = await getCurrentUser();
  const isSiteAdmin = current ? isSiteAdminEmail(current.user.email) : false;

  return (
    <>
      <BillingWorkbench isSiteAdmin={isSiteAdmin} />
      <ActivationCodePanel isSiteAdmin={isSiteAdmin} />
    </>
  );
}
