"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, Copy, FolderOpen, History, Loader2, PencilLine, Save, Sparkles } from "lucide-react";

import { contentEntries, type ContentEntry } from "@/lib/content/entries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AccountProfile = {
  id: string;
  name: string;
  niche: string;
};

type GeneratedVariant = {
  id?: string;
  entry: ContentEntry;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

type GenerationResult = {
  project: {
    id: string;
    title: string;
    variants: GeneratedVariant[];
  };
};

type QueuedGenerationResult = {
  job: {
    id: string;
    status: "pending" | "running" | "succeeded" | "failed" | "cancelled";
    error?: string | null;
  };
  project?: GenerationResult["project"] | null;
  queued?: boolean;
  fallback?: "sync";
};

type GenerationJob = {
  id: string;
  type: string;
  status: "pending" | "running" | "succeeded" | "failed" | "cancelled";
  output?: Record<string, unknown> | null;
  error?: string | null;
  tokenInput: number;
  tokenOutput: number;
  createdAt: string;
  promptTemplate?: {
    key: string;
    version: number;
  } | null;
};

const goals = [
  { value: "growth", label: "涨粉" },
  { value: "search", label: "搜索" },
  { value: "conversion", label: "转化" },
  { value: "trust", label: "信任" },
  { value: "interaction", label: "互动" },
];

function getInitialSearchParam(key: string) {
  if (typeof window === "undefined") {
    return "";
  }
  return new URLSearchParams(window.location.search).get(key) || "";
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}

function getStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function getJobSource(job: GenerationJob) {
  const source = job.output?.source;
  if (typeof source === "string") {
    return source;
  }

  const provider = job.output?.provider;
  const model = job.output?.model;
  if (typeof provider === "string" && typeof model === "string") {
    return `${provider}:${model}`;
  }

  return "-";
}

function getJobProjectId(job: GenerationJob) {
  const projectId = job.output?.projectId;
  return typeof projectId === "string" ? projectId : "";
}

function formatJobType(type: string) {
  const labels: Record<string, string> = {
    five_entry_generation: "五入口生成",
    topic_generation: "选题生成",
    image_prompt_generation: "图片提示词",
    ai_tone_rewrite: "自然改写",
  };
  return labels[type] || type;
}

export function FiveEntryGenerator() {
  const [profiles, setProfiles] = useState<AccountProfile[]>([]);
  const [accountProfileId, setAccountProfileId] = useState(() => getInitialSearchParam("accountProfileId"));
  const [topicId] = useState(() => getInitialSearchParam("topicId"));
  const [topic, setTopic] = useState(() => getInitialSearchParam("topic"));
  const [goal, setGoal] = useState("growth");
  const [activeEntry, setActiveEntry] = useState<ContentEntry>("wechat_article");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [queuedJobId, setQueuedJobId] = useState("");
  const [jobs, setJobs] = useState<GenerationJob[]>([]);

  useEffect(() => {
    fetch("/api/account-profiles")
      .then((response) => readJson<{ profiles: AccountProfile[] }>(response))
      .then((data) => {
        setProfiles(data.profiles);
        setAccountProfileId((current) => current || data.profiles[0]?.id || "");
      })
      .catch((error: Error) => setMessage(error.message));
    void loadJobs();
  }, []);

  async function loadJobs() {
    try {
      const data = await readJson<{ jobs: GenerationJob[] }>(await fetch("/api/generation-jobs"));
      setJobs(data.jobs);
    } catch {
      // The generator remains usable even if history fails to load.
    }
  }

  const activeVariant = useMemo(
    () => result?.project.variants.find((variant) => variant.entry === activeEntry),
    [activeEntry, result],
  );
  const activeImagePrompts = useMemo(() => getStringList(activeVariant?.metadata?.imagePrompts), [activeVariant]);
  const activeKeywords = useMemo(() => getStringList(activeVariant?.metadata?.keywords), [activeVariant]);

  useEffect(() => {
    if (!queuedJobId) {
      return;
    }

    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const data = await readJson<QueuedGenerationResult>(await fetch(`/api/generation-jobs/${queuedJobId}`));

        if (cancelled) {
          return;
        }

        if (data.job.status === "succeeded" && data.project) {
          setResult({ project: data.project });
          setQueuedJobId("");
          setMessage("后台生成已完成，并保存为内容项目。");
          void loadJobs();
        } else if (data.job.status === "failed") {
          setQueuedJobId("");
          setMessage(data.job.error || "后台生成失败。");
          void loadJobs();
        } else {
          setMessage(data.job.status === "running" ? "后台正在生成中..." : "已加入后台队列，等待生成...");
        }
      } catch (error) {
        if (!cancelled) {
          setQueuedJobId("");
          setMessage(error instanceof Error ? error.message : "查询生成任务失败。");
        }
      }
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [queuedJobId]);

  async function submit() {
    setLoading(true);
    setMessage("");
    try {
      const data = await readJson<GenerationResult>(
        await fetch("/api/generate/five-entry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountProfileId: accountProfileId || undefined,
            topicId: topicId || undefined,
            topic,
            goal,
          }),
        }),
      );
      setResult(data);
      setMessage("已生成并保存为内容项目。");
      void loadJobs();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成失败。");
    } finally {
      setLoading(false);
    }
  }

  async function queueSubmit() {
    setQueueing(true);
    setMessage("");
    try {
      const data = await readJson<QueuedGenerationResult>(
        await fetch("/api/generate/five-entry/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountProfileId: accountProfileId || undefined,
            topicId: topicId || undefined,
            topic,
            goal,
          }),
        }),
      );
      if (data.queued === false && data.project) {
        setResult({ project: data.project });
        setQueuedJobId("");
        setMessage("后台队列不可用，已改为同步生成并保存为内容项目。");
        void loadJobs();
        return;
      }

      setQueuedJobId(data.job.id);
      void loadJobs();
      setMessage("已加入后台队列，稍后自动刷新结果。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "后台生成提交失败。");
    } finally {
      setQueueing(false);
    }
  }

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
    setMessage("已复制到剪贴板。");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">五入口生成器</h1>
        <p className="mt-1 text-sm text-slate-600">选择账号档案，输入一个选题，一次生成公众号、小绿书、搜一搜、问一问和朋友圈内容包。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>输入选题</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[220px_1fr_180px]">
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">账号档案</span>
            <select
              className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400"
              value={accountProfileId}
              onChange={(event) => setAccountProfileId(event.target.value)}
            >
              <option value="">自动选择默认档案</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">选题</span>
            <input
              className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="例如：普通人做公众号副业还有机会吗"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">内容目标</span>
            <select
              className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
            >
              {goals.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-3 lg:col-span-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">{message || "生成会消耗 1 次额度，结果会自动保存到内容项目。"}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={submit} disabled={loading || queueing || Boolean(queuedJobId) || topic.trim().length < 2}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                生成五入口内容
              </Button>
              <Button
                variant="secondary"
                onClick={queueSubmit}
                disabled={loading || queueing || Boolean(queuedJobId) || topic.trim().length < 2}
              >
                {queueing || queuedJobId ? <Loader2 className="size-4 animate-spin" /> : <Clock3 className="size-4" />}
                后台生成
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="space-y-2">
          {contentEntries.map((entry) => (
            <button
              key={entry.id}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left text-sm transition ${
                activeEntry === entry.id ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              onClick={() => setActiveEntry(entry.id)}
            >
              <span>{entry.label}</span>
              <span className="text-xs">{result ? "已生成" : "待生成"}</span>
            </button>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{activeVariant?.title || contentEntries.find((item) => item.id === activeEntry)?.label}</CardTitle>
              <p className="mt-1 text-sm text-slate-500">{contentEntries.find((item) => item.id === activeEntry)?.summary}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {result ? (
                <>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/dashboard/editor?projectId=${result.project.id}`}>
                      <PencilLine className="size-4" />
                      去编辑
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/dashboard/checks?projectId=${result.project.id}`}>
                      <CheckCircle2 className="size-4" />
                      发布检查
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href="/dashboard/projects">
                      <FolderOpen className="size-4" />
                      项目
                    </Link>
                  </Button>
                </>
              ) : null}
              {activeVariant ? (
                <Button size="sm" variant="secondary" onClick={() => copyText(`${activeVariant.title}\n\n${activeVariant.body}`)}>
                  <Copy className="size-4" />
                  复制
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {activeVariant ? (
              <div className="space-y-4">
                <pre className="min-h-80 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-7 text-slate-700">{activeVariant.body}</pre>
                {activeImagePrompts.length ? (
                  <div className="space-y-3 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-medium text-slate-950">小绿书图片提示词</h3>
                        <p className="mt-1 text-xs text-slate-600">生成结果里的逐页图片建议，可直接复制给后续图片模型或设计工具。</p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => copyText(activeImagePrompts.join("\n\n"))}>
                        <Copy className="size-4" />
                        复制全部
                      </Button>
                    </div>
                    <div className="grid gap-2">
                      {activeImagePrompts.map((prompt, index) => (
                        <div key={`${prompt}-${index}`} className="flex flex-col gap-2 rounded-lg bg-white p-3 text-sm leading-6 text-slate-700 sm:flex-row sm:items-start sm:justify-between">
                          <p>
                            <span className="font-medium text-slate-950">第 {index + 1} 页：</span>
                            {prompt}
                          </p>
                          <button className="shrink-0 text-sm font-medium text-emerald-700" onClick={() => copyText(prompt)} type="button">
                            复制
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {activeKeywords.length ? (
                  <div className="rounded-lg border border-slate-100 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-medium text-slate-950">搜一搜关键词</h3>
                      <Button size="sm" variant="secondary" onClick={() => copyText(activeKeywords.join("、"))}>
                        <Copy className="size-4" />
                        复制关键词
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeKeywords.map((keyword) => (
                        <button key={keyword} className="rounded-full bg-slate-50 px-3 py-1 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => copyText(keyword)} type="button">
                          {keyword}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center">
                <Save className="mb-3 size-8 text-emerald-500" />
                <p className="font-medium text-slate-800">等待生成结果</p>
                <p className="mt-1 text-sm text-slate-500">生成后可以逐个入口复制，并在内容项目中继续管理。</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <History className="size-5 text-emerald-600" />
            最近生成记录
          </CardTitle>
          <Button size="sm" variant="secondary" onClick={loadJobs}>
            刷新
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {jobs.slice(0, 8).map((job) => {
            const projectId = getJobProjectId(job);
            return (
              <div key={job.id} className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm lg:grid-cols-[150px_120px_1fr_160px] lg:items-center">
                <div>
                  <div className="font-medium text-slate-950">{formatJobType(job.type)}</div>
                  <div className="mt-1 text-xs text-slate-500">{new Date(job.createdAt).toLocaleString()}</div>
                </div>
                <span className={`w-fit rounded-full px-2 py-1 text-xs ${job.status === "succeeded" ? "bg-emerald-50 text-emerald-700" : job.status === "failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                  {job.status}
                </span>
                <div className="min-w-0 text-slate-600">
                  <div className="truncate">来源：{getJobSource(job)}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Prompt：{job.promptTemplate ? `${job.promptTemplate.key} v${job.promptTemplate.version}` : "-"} · Token：{job.tokenInput}/{job.tokenOutput}
                  </div>
                  {job.error ? <div className="mt-1 truncate text-xs text-red-600">{job.error}</div> : null}
                </div>
                <div className="flex gap-2 lg:justify-end">
                  {projectId ? (
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/dashboard/editor?projectId=${projectId}`}>去编辑</Link>
                    </Button>
                  ) : null}
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/api/generation-jobs/${job.id}`}>详情</Link>
                  </Button>
                </div>
              </div>
            );
          })}
          {!jobs.length ? <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">还没有生成记录。完成一次选题、五入口、图片提示词或改写后会出现在这里。</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
