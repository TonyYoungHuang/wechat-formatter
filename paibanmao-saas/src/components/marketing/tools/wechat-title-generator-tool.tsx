"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Copy, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WechatTitleSuggestion } from "@/lib/tools/wechat-title-generator";

const goals = [
  { value: "growth", label: "涨粉" },
  { value: "search", label: "搜一搜" },
  { value: "conversion", label: "转化" },
  { value: "trust", label: "信任" },
  { value: "interaction", label: "互动" },
];

export function WechatTitleGeneratorTool() {
  const [topic, setTopic] = useState("普通人做公众号副业还有机会吗");
  const [audience, setAudience] = useState("公众号副业新手");
  const [goal, setGoal] = useState("growth");
  const [tone, setTone] = useState("清晰、具体、有点击欲望");
  const [suggestions, setSuggestions] = useState<WechatTitleSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const trimmedTopic = topic.trim();
  const continuationHref = buildContinuationHref(trimmedTopic);
  const canSubmit = useMemo(() => trimmedTopic.length >= 2 && !loading, [loading, trimmedTopic]);

  async function generatePreview() {
    if (!canSubmit) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tools/wechat-title-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmedTopic, audience, goal, tone }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "生成失败，请稍后再试。");
      }

      setSuggestions(data.suggestions);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "生成失败，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  async function copyTitle(title: string) {
    await navigator.clipboard?.writeText(title);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-emerald-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <Link className="text-sm text-emerald-700" href="/">
            返回首页
          </Link>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 px-3 py-1 text-sm text-emerald-700">
                <Sparkles className="size-4" />
                公众号免费工具
              </div>
              <h1 className="max-w-2xl text-3xl font-semibold text-slate-950 sm:text-4xl">
                公众号标题生成器
              </h1>
              <p className="mt-4 max-w-2xl leading-7 text-slate-600">
                输入一个选题，快速生成适合公众号头条、搜一搜、小绿书、问一问和朋友圈转发的标题角度。适合副业创作者、个人 IP 和小团队做选题冷启动。
              </p>
            </div>
            <Card className="border-emerald-100 bg-emerald-50/60">
              <CardHeader>
                <CardTitle className="text-base">登录排版猫后可以继续做什么</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <p>把标题保存为选题，一键扩写成公众号正文。</p>
                <p>同步生成小绿书、搜一搜、问一问和朋友圈版本。</p>
                <p>进入发布前检查，减少标题党、AI 味和转化突兀问题。</p>
                <Button asChild className="w-full">
                  <Link href={continuationHref}>
                    免费注册
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>生成标题预览</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              <span>公众号选题</span>
              <textarea
                className="min-h-28 w-full rounded-lg border border-slate-200 bg-white p-3 font-normal outline-none transition focus:border-emerald-400"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="例如：普通人做公众号副业还有机会吗"
              />
            </label>
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              <span>目标读者</span>
              <input
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none transition focus:border-emerald-400"
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                placeholder="例如：公众号副业新手"
              />
            </label>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">内容目标</p>
              <div className="grid grid-cols-5 gap-2">
                {goals.map((item) => (
                  <button
                    key={item.value}
                    className={`h-10 rounded-lg border text-sm transition ${
                      goal === item.value
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
                    }`}
                    type="button"
                    onClick={() => setGoal(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              <span>标题语气</span>
              <input
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none transition focus:border-emerald-400"
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                placeholder="例如：清晰、具体、有点击欲望"
              />
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button className="w-full" disabled={!canSubmit} onClick={generatePreview}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              生成 12 个标题
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {suggestions.length === 0 ? (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>标题结果会显示在这里</CardTitle>
              </CardHeader>
              <CardContent className="leading-7 text-slate-600">
                公开工具先给预览标题，登录后可以把标题继续扩写成完整公众号文章、小绿书图文脚本、搜一搜关键词、问一问回答和朋友圈文案。
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-emerald-100 bg-emerald-50/70">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-950">选好标题后，继续生成完整五入口内容</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      注册后会带着当前选题进入工作台，继续生成公众号正文、小绿书图文、搜一搜关键词、问一问回答和朋友圈文案。
                    </p>
                  </div>
                  <Button asChild className="shrink-0">
                    <Link href={continuationHref}>
                      生成完整内容包
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              {suggestions.map((item, index) => (
              <Card key={`${item.title}-${index}`} className="border-slate-100">
                <CardContent className="flex gap-4 p-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-sm font-semibold text-emerald-700">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2 py-1">{item.angle}</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{item.entryFit}</span>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold leading-7 text-slate-950">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.reason}</p>
                  </div>
                  <Button
                    aria-label="复制标题"
                    className="h-10 w-10 px-0"
                    variant="secondary"
                    onClick={() => copyTitle(item.title)}
                  >
                    <Copy className="size-4" />
                  </Button>
                </CardContent>
              </Card>
              ))}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function buildContinuationHref(topic: string) {
  const next = topic ? `/dashboard/generate?topic=${encodeURIComponent(topic)}` : "/dashboard/generate";
  const params = new URLSearchParams({ next });
  return `/register?${params.toString()}`;
}
