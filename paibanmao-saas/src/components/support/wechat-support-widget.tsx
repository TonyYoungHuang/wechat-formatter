"use client";

import Image from "next/image";
import { MessageCircle, Copy, Check, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const supportName = process.env.NEXT_PUBLIC_WECHAT_SUPPORT_NAME || "排版猫客服";
const supportId = process.env.NEXT_PUBLIC_WECHAT_SUPPORT_ID || "";
const qrUrl = process.env.NEXT_PUBLIC_WECHAT_SUPPORT_QR_URL || "";
const supportHours = process.env.NEXT_PUBLIC_WECHAT_SUPPORT_HOURS || "工作日 9:00-22:00";
const supportNote = process.env.NEXT_PUBLIC_WECHAT_SUPPORT_NOTE || "添加时备注：排版猫";

export function WechatSupportWidget() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyWechatId() {
    if (!supportId) {
      return;
    }

    await navigator.clipboard.writeText(supportId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="fixed bottom-5 right-4 z-50 sm:bottom-7 sm:right-7">
      <div
        className={cn(
          "mb-3 w-[min(calc(100vw-32px),340px)] rounded-2xl border border-emerald-200 bg-white shadow-2xl shadow-emerald-950/12 transition duration-200",
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-emerald-100 px-4 py-3">
          <div>
            <div className="text-base font-bold text-slate-950">{supportName}</div>
            <div className="text-xs text-slate-500">{supportHours}</div>
          </div>
          <button
            aria-label="关闭微信客服"
            className="inline-flex size-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
            onClick={() => setOpen(false)}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm leading-6 text-slate-700">
            有问题可以添加微信客服，适合咨询套餐、支付、发票、内容生成和账号使用问题。
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-500">客服微信</div>
              <div className="mt-1 text-base font-semibold text-slate-950">{supportId || "待配置微信号"}</div>
            </div>
            <button
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!supportId}
              onClick={copyWechatId}
              title={supportId ? "复制微信号" : "微信号待配置"}
              type="button"
            >
              {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
            </button>
          </div>

          <div className="flex gap-4">
            <div className="flex size-32 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-2">
              {qrUrl ? (
                <Image alt="排版猫微信客服二维码" className="rounded-lg object-contain" height={112} src={qrUrl} width={112} />
              ) : (
                <div className="px-2 text-center text-xs leading-5 text-slate-500">二维码待配置</div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2 text-sm leading-6 text-slate-600">
              <p>扫码或复制微信号添加客服。</p>
              <p>{supportNote}</p>
              <p className="text-xs text-slate-500">客服不会主动索要密码、验证码或支付密钥。</p>
            </div>
          </div>
        </div>
      </div>

      <button
        aria-expanded={open}
        aria-label="打开微信客服"
        className="ml-auto flex h-14 items-center gap-2 rounded-full border border-emerald-300 bg-emerald-600 px-5 text-sm font-bold text-white shadow-xl shadow-emerald-900/20 transition hover:bg-emerald-700"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <MessageCircle className="size-5" />
        微信客服
      </button>
    </div>
  );
}
