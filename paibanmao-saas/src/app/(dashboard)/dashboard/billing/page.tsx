import { ActivationCodePanel } from "@/components/dashboard/activation-code-panel";
import { BillingWorkbench } from "@/components/dashboard/billing-workbench";

export default async function BillingPage() {
  return (
    <>
      <BillingWorkbench />
      <ActivationCodePanel isSiteAdmin={false} />
    </>
  );
}
