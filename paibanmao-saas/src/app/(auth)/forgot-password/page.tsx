import { Suspense } from "react";

import { SecurityForm } from "@/components/auth/security-form";

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <SecurityForm mode="forgot-password" />
    </Suspense>
  );
}
