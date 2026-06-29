"use client";

import { useState } from "react";
import { Loader2, SearchCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Issue = {
  category: string;
  severity: "low" | "medium" | "high";
  excerpt: string;
  message: string;
  suggestion: string;
};

type CheckResult = {
  score: number;
  level: string;
  summary: string;
  issues: Issue[];
  report?: { id: string };
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}

function getInitialProjectId() {
  if (typeof window === "undefined") {
    return "";
  }
  return new URLSearchParams(window.location.search).get("projectId") || "";
}

export function ComplianceWorkbench() {
  const [projectId, setProjectId] = useState(getInitialProjectId);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function runCheck() {
    setLoading(true);
    setMessage("");
    try {
      const data = await readJson<CheckResult>(
        await fetch("/api/compliance/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: projectId || undefined,
            title: title || undefined,
            content,
          }),
        }),
      );
      setResult(data);
      setMessage(data.report ? "检查完成，报告已保存到项目。" : "检查完成。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "检查失败。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">发布前检查</h1>
        <p className="mt-1 text-sm text-slate-600">检查合规风险、标题风险、AI 味、搜一搜优化和 CTA 自然度。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>待检查内容</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">标题</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">项目 ID（可选）</span>
              <input value={projectId} onChange={(event) => setProjectId(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
            </label>
          </div>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="min-h-64 w-full rounded-lg border border-slate-200 p-4 outline-none focus:border-emerald-400"
            placeholder="粘贴公众号正文、小绿书文案或问一问回答"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">{message || "排版猫提供发布前辅助检查，不构成法律意见，也不保证平台审核结果。"}</p>
            <Button onClick={runCheck} disabled={loading || content.trim().length < 1}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <SearchCheck className="size-4" />}
              运行检查
            </Button>
          </div>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>检查结果：{result.level}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-3xl font-semibold text-slate-950">{result.score}</div>
                <div className="text-sm text-slate-500">综合分</div>
              </div>
              <p className="text-sm leading-6 text-slate-600">{result.summary}</p>
            </div>
            <div className="space-y-3">
              {result.issues.map((issue, index) => (
                <div key={`${issue.category}-${index}`} className="rounded-lg border border-slate-100 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-950">{issue.category}</span>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">{issue.severity}</span>
                  </div>
                  {issue.excerpt ? <p className="mt-2 rounded bg-slate-50 px-3 py-2 text-sm text-slate-500">原文片段：{issue.excerpt}</p> : null}
                  <p className="mt-2 text-sm text-slate-600">{issue.message}</p>
                  <p className="mt-2 text-sm text-emerald-700">{issue.suggestion}</p>
                </div>
              ))}
              {!result.issues.length ? <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">未发现明显风险，仍建议人工复核。</div> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
