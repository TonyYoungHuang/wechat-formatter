"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, CircleDollarSign, Loader2, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicToolPreview } from "@/lib/tools/public-tool-preview";

const sampleOutputs = [
  "公众号长文：普通人做公众号副业，真正的机会在哪里？",
  "小绿书：3 张图讲清普通人做号的第一步",
  "搜一搜：公众号副业怎么赚钱、公众号新手怎么起步",
  "问一问：现在做公众号还来得及吗？",
  "朋友圈：我把这个问题拆成了一套微信内容打法",
];

export function HomeHeroGenerator() {
  const [topic, setTopic] = useState("");
  const [preview, setPreview] = useState<PublicToolPreview | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const registerHref = useMemo(() => {
    const params = new URLSearchParams();
    if (topic.trim()) {
      params.set("next", `/dashboard/generate?topic=${encodeURIComponent(topic.trim())}`);
    }
    return params.size ? `/register?${params.toString()}` : "/register";
  }, [topic]);

  async function generatePreview() {
    const input = topic.trim();
    if (input.length < 2 || loading) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/tools/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "topic", input }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "生成预览失败。");
      }

      setPreview(data.preview);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成预览失败。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col justify-center">
        <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-sm text-emerald-700">
          <Sparkles className="size-4" />
          微信副业创作者的内容增长工作台
        </div>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">一个选题，布局微信五个入口</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          用排版猫把公众号文章、小绿书、搜一搜、问一问和朋友圈一次性生成出来，适合副业号主、个人 IP 和小团队做微信内容矩阵。
        </p>

        <div className="mt-8 rounded-lg border border-emerald-100 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="min-h-12 flex-1 rounded-lg border border-slate-200 px-4 text-base outline-none transition focus:border-emerald-400"
              onChange={(event) => setTopic(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void generatePreview();
                }
              }}
              placeholder="输入一个选题，例如：普通人做公众号副业还有机会吗"
              value={topic}
            />
            <Button size="lg" disabled={topic.trim().length < 2 || loading} onClick={generatePreview}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              生成五入口预览
              {!loading ? <ArrowRight className="size-4" /> : null}
            </Button>
          </div>
          {message ? <p className="mt-3 text-sm text-amber-700">{message}</p> : null}
        </div>

        <div className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600" />
            免费版每天 1 次生成
          </div>
          <div className="flex items-center gap-2">
            <Search className="size-4 text-emerald-600" />
            支持搜一搜关键词
          </div>
          <div className="flex items-center gap-2">
            <CircleDollarSign className="size-4 text-emerald-600" />
            预留付费和额度配置
          </div>
        </div>
      </div>

      <Card className="border-emerald-100 shadow-sm">
        <CardHeader>
          <CardTitle>{preview ? preview.title : "生成结果预览"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {preview ? (
            <>
              <p className="text-sm leading-6 text-slate-600">{preview.summary}</p>
              {preview.blocks.map((block) => (
                <div key={`${block.label}-${block.content}`} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                  <div className="font-medium text-emerald-700">{block.label}</div>
                  <div className="mt-1 leading-6 text-slate-700">{block.content}</div>
                </div>
              ))}
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
                {preview.loginHint}
              </div>
              <Button asChild className="w-full">
                <Link href={registerHref}>注册后生成完整内容包</Link>
              </Button>
            </>
          ) : (
            sampleOutputs.map((item) => (
              <div key={item} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {item}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
