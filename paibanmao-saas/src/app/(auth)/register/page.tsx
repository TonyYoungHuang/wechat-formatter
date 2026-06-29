import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function RegisterPage() {
  const current = await getCurrentUser();

  if (current) {
    redirect("/dashboard");
  }

  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}
