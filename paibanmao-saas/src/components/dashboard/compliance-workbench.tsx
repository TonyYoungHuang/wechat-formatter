"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, FileText, Loader2, SearchCheck } from "lucide-react";

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
  mode: "basic" | "advanced";
  entry?: string;
  summary: string;
  issues: Issue[];
  report?: { id: string };
  aiReview?: {
    verdict: "可发布" | "建议修改" | "高风险";
    editorSummary: string;
    strengths: string[];
    issues: Array<{
      category: string;
      severity: "low" | "medium" | "high";
      excerpt: string;
      problem: string;
      suggestion: string;
      replacement: string;
    }>;
    revisedTitle: string;
    revisedBody: string;
    publishChecklist: string[];
  };
  aiReviewMeta?: {
    provider: string;
    model: string;
    fallback: boolean;
    aiError?: string | null;
  } | null;
};

type ProjectVariant = {
  id: string;
  entry: string;
  title: string;
  body: string;
};

type Project = {
  id: string;
  title: string;
  variants: ProjectVariant[];
};

const entryLabels: Record<string, string> = {
  wechat_article: "公众号",
  green_note: "小绿书",
  search: "搜一搜",
  question: "问一问",
  moments: "朋友圈",
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}

function nextPaint() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("检查等待时间过长，请稍后重试，或先复制内容人工复核。");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function copyText(value: string, label: string) {
  await navigator.clipboard.writeText(value);
  return `${label}已复制。`;
}

export function ComplianceWorkbench() {
  const [projectId, setProjectId] = useState("");
  const [project, setProject] = useState<Project | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [projectLoading, setProjectLoading] = useState(false);
  const checkButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const initialProjectId = params.get("projectId") || "";

      setProjectId((current) => current || initialProjectId);
      setTitle((current) => current || params.get("title") || "");
      setContent((current) => current || params.get("content") || "");
      if (initialProjectId) {
        void loadProject(initialProjectId);
      }
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (projectId) {
      void loadProject(projectId);
    }
    // Load only the project carried by the initial URL. Manual project ID edits use the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyVariant(nextProject: Project, variant: ProjectVariant) {
    setSelectedVariantId(variant.id);
    setTitle(variant.title || nextProject.title);
    setContent(variant.body);
    setResult(null);
  }

  async function loadProject(id = projectId) {
    if (!id.trim()) {
      setMessage("请输入项目 ID。");
      return;
    }

    setProjectLoading(true);
    setMessage("");
    try {
      const data = await readJson<{ project: Project }>(await fetch(`/api/projects/${id.trim()}`));
      const preferred =
        data.project.variants.find((variant) => variant.entry === "wechat_article") ||
        data.project.variants[0];

      setProject(data.project);
      setProjectId(data.project.id);

      if (preferred) {
        applyVariant(data.project, preferred);
        setMessage(`已载入项目：${data.project.title}`);
      } else {
        setTitle(data.project.title);
        setContent("");
        setSelectedVariantId("");
        setMessage("项目已载入，但还没有可检查的入口内容。");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "载入项目失败。");
    } finally {
      setProjectLoading(false);
    }
  }

  function changeVariant(variantId: string) {
    const variant = project?.variants.find((item) => item.id === variantId);
    if (project && variant) {
      applyVariant(project, variant);
      setMessage(`已切换到${entryLabels[variant.entry] || variant.entry}内容。`);
    }
  }

  async function runCheck() {
    if (loading) {
      return;
    }
    if (content.trim().length < 1) {
      setMessage("请先粘贴要检查的标题或正文。");
      return;
    }

    setLoading(true);
    setResult(null);
    setMessage("AI 主编正在检查标题风险、AI 味、搜一搜适配、CTA 自然度和可替换稿。");
    await nextPaint();
    try {
      const selectedVariant = project?.variants.find((item) => item.id === selectedVariantId);
      const data = await readJson<CheckResult>(
        await fetchWithTimeout("/api/compliance/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: projectId || undefined,
            entry: selectedVariant?.entry,
            title: title || undefined,
            content,
          }),
        }, 90000),
      );
      setResult(data);
      setMessage(data.aiReview ? (data.report ? "AI 审稿完成，报告已保存到项目。" : "AI 审稿完成。") : data.report ? "检查完成，报告已保存到项目。" : "检查完成。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "检查失败。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const button = checkButtonRef.current;
    if (!button) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      event.preventDefault();
      void runCheck();
    };

    button.addEventListener("click", handleClick);
    return () => button.removeEventListener("click", handleClick);
    // Native listener is a fallback for this primary action button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, loading, projectId, selectedVariantId, title]);

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
              <div className="flex gap-2">
                <input value={projectId} onChange={(event) => setProjectId(event.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
                <Button size="sm" variant="secondary" onClick={() => loadProject()} disabled={projectLoading || !projectId.trim()}>
                  {projectLoading ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                  载入
                </Button>
              </div>
            </label>
          </div>
          {project?.variants.length ? (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <div className="grid gap-3 md:grid-cols-[1fr_260px] md:items-center">
                <p className="text-sm text-emerald-900">正在检查项目：{project.title}</p>
                <label className="space-y-1 text-sm">
                  <span className="text-emerald-900">检查入口</span>
                  <select
                    className="h-10 w-full rounded-lg border border-emerald-200 bg-white px-3 outline-none focus:border-emerald-400"
                    value={selectedVariantId}
                    onChange={(event) => changeVariant(event.target.value)}
                  >
                    {project.variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {entryLabels[variant.entry] || variant.entry} - {variant.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ) : null}
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="min-h-64 w-full rounded-lg border border-slate-200 p-4 outline-none focus:border-emerald-400"
            placeholder="粘贴公众号正文、小绿书文案或问一问回答"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p aria-live="polite" data-testid="compliance-message" className="text-sm text-slate-500">
              {message || "排版猫提供发布前辅助检查，不构成法律意见，也不保证平台审核结果。"}
            </p>
            <button
              ref={checkButtonRef}
              data-testid="compliance-submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white shadow-sm shadow-emerald-900/10 transition hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-60"
              disabled={loading || content.trim().length < 1}
              type="button"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <SearchCheck className="size-4" />}
              {loading ? "AI 审稿中..." : "运行 AI 审稿"}
            </button>
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
                <div className="text-sm text-slate-500">
                  综合分 · {result.mode === "advanced" ? "高级检查" : "基础检查"}
                  {result.entry ? ` · ${result.entry}` : ""}
                </div>
              </div>
              <p className="text-sm leading-6 text-slate-600">{result.summary}</p>
            </div>
            {result.aiReview ? (
              <div className="space-y-4 rounded-lg border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-emerald-900">AI 主编建议：{result.aiReview.verdict}</div>
                    <p className="mt-1 text-sm leading-6 text-emerald-900">{result.aiReview.editorSummary}</p>
                    {result.aiReviewMeta ? (
                      <p className="mt-1 text-xs text-emerald-700">
                        {result.aiReviewMeta.fallback ? "本地规则审稿" : `${result.aiReviewMeta.provider} · ${result.aiReviewMeta.model}`}
                        {result.aiReviewMeta.aiError ? ` · ${result.aiReviewMeta.aiError}` : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
                {result.aiReview.strengths.length ? (
                  <div>
                    <div className="text-sm font-medium text-emerald-950">值得保留的地方</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {result.aiReview.strengths.map((item) => (
                        <span key={item} className="rounded-full bg-white px-2 py-1 text-xs text-emerald-800">{item}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-lg border border-emerald-100 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-slate-950">建议标题</div>
                      <Button
                        size="sm"
                        type="button"
                        variant="secondary"
                        onClick={async () => setMessage(await copyText(result.aiReview?.revisedTitle || "", "建议标题"))}
                      >
                        <Copy className="size-4" />
                        复制
                      </Button>
                    </div>
                    <p className="text-sm leading-6 text-slate-700">{result.aiReview.revisedTitle || "标题无需明显调整。"}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-100 bg-white p-3">
                    <div className="text-sm font-medium text-slate-950">发布前清单</div>
                    <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                      {result.aiReview.publishChecklist.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-slate-950">可替换稿</div>
                    <Button
                      size="sm"
                      type="button"
                      variant="secondary"
                      onClick={async () => setMessage(await copyText(result.aiReview?.revisedBody || "", "可替换稿"))}
                    >
                      <Copy className="size-4" />
                      复制
                    </Button>
                  </div>
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-7 text-slate-700">{result.aiReview.revisedBody || "正文无需明显调整。"}</pre>
                </div>
              </div>
            ) : null}
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
