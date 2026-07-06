"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthStatus } from "@/components/marketing/use-auth-status";

export function AuthAwarePublicLoginLink() {
  const { signedIn } = useAuthStatus();

  return (
    <Link className="transition hover:text-emerald-700" href={signedIn ? "/dashboard" : "/login"}>
      {signedIn ? "工作台" : "登录"}
    </Link>
  );
}

export function AuthAwarePublicCta({
  ctaHref = "/dashboard",
  ctaLabel = "开始使用",
}: {
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const { signedIn } = useAuthStatus();

  return (
    <Button asChild>
      <Link href={signedIn ? "/dashboard" : ctaHref}>
        {signedIn ? "进入工作台" : ctaLabel}
        <ArrowRight className="size-4" />
      </Link>
    </Button>
  );
}
