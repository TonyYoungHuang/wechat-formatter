import { Suspense } from "react";

import { SecurityForm } from "@/components/auth/security-form";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <SecurityForm mode="reset-password" />
    </Suspense>
  );
}
