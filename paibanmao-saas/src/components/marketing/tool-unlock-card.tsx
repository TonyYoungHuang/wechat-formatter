"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStatus } from "@/components/marketing/use-auth-status";

export function ToolUnlockCard({ unlocks }: { unlocks: string[] }) {
  const { signedIn } = useAuthStatus();

  return (
    <Card className="border-emerald-300 shadow-md shadow-emerald-900/[0.05]">
      <CardHeader>
        <CardTitle>{signedIn ? "已登录，可以继续做完整内容" : "登录后解锁"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-base leading-7 text-slate-600">
        {unlocks.map((item) => (
          <p key={item} className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <span>{item}</span>
          </p>
        ))}
        <Button asChild className="mt-2 w-full">
          <Link href={signedIn ? "/dashboard/generate" : "/register"}>
            {signedIn ? "去工作台生成完整内容" : "免费注册"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
