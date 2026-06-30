import { Suspense } from "react";

import { SecurityForm } from "@/components/auth/security-form";

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <SecurityForm mode="verify-email" />
    </Suspense>
  );
}
