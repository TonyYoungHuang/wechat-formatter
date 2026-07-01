"use client";

import Link from "next/link";
import { ArrowRight, KeyRound, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ActivationCodeRedeemCard() {
  const [opened, setOpened] = useState(false);

  return (
    <div className="rounded-lg border border-emerald-300 bg-[#f5fbf7] p-5 shadow-sm shadow-emerald-950/[0.05]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <KeyRound className="size-4" />
            已有激活码
          </div>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">输入激活码，直接开通入门版或专业版</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">激活码需要绑定邮箱账号。请先登录或注册排版猫账号，进入会员页后再输入激活码。</p>
        </div>
        <Button size="lg" onClick={() => setOpened((value) => !value)} className="min-w-40">
          使用激活码开通
          <ArrowRight className="size-4" />
        </Button>
      </div>

      {opened ? (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-white p-4">
          <p className="text-sm leading-6 text-slate-700">
            激活码会在兑换成功时绑定到当前登录的邮箱账号和工作区。未登录用户请先登录或注册，完成后系统会进入会员页，再显示激活码输入框。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Button asChild>
              <Link href="/login?next=/dashboard/billing">
                <LogIn className="size-4" />
                登录后输入
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/register?next=/dashboard/billing">
                <UserPlus className="size-4" />
                注册后输入
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/dashboard/billing">
                我已登录
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
