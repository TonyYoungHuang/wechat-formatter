import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LoginPage() {
  const current = await getCurrentUser();

  if (current) {
    redirect("/dashboard");
  }

  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
