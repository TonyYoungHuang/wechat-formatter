"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, Copy, FolderOpen, HelpCircle, History, Loader2, PencilLine, Save, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { contentEntries, type ContentEntry } from "@/lib/content/entries";

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

const statusLabels: Record<GenerationJob["status"], string> = {
  pending: "等待中",
  running: "生成中",
  succeeded: "已完成",
  failed: "失败",
  cancelled: "已取消",
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(normalizeErrorMessage(payload.message || "Request failed."));
  }
  return payload;
}

function normalizeErrorMessage(message: string) {
  const labels: Record<string, string> = {
    "Create an account profile first.": "请先创建一个账号档案。账号档案会告诉 AI：你是谁、写给谁、用什么语气写。",
    "A valid topic is required.": "请先输入一个明确的选题。",
    "Request failed.": "请求失败，请稍后重试。",
  };
  return labels[message] || message;
}

function HelpTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        aria-label="查看说明"
        className="inline-flex size-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700 focus:outline-none"
        type="button"
      >
        <HelpCircle className="size-4" />
      </button>
      <span className="pointer-events-none absolute left-1/2 top-7 z-20 w-64 -translate-x-1/2 rounded-lg border border-emerald-100 bg-white px-3 py-2 text-xs leading-5 text-slate-600 opacity-0 shadow-lg shadow-emerald-900/10 transition group-focus-within:opacity-100 group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
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
      throw new Error("生成等待时间过长，请稍后查看最近生成记录，或改用后台生成。");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
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

function getEntrySummary(entry: ContentEntry) {
  return contentEntries.find((item) => item.id === entry)?.summary || "";
}

const entryGuides: Record<ContentEntry, string> = {
  wechat_article: "公众号会生成长文正文、标题摘要、结尾 CTA 和可复制到公众号后台的排版内容。",
  green_note: "小绿书会生成短图文文案、分页脚本和图片提示词，适合后续配图发布。",
  search: "搜一搜会生成关键词、搜索型标题、摘要和问答结构，偏微信搜索流量。",
  question: "问一问会生成问题和回答稿，适合做微信问一问、评论区和私域答疑。",
  moments: "朋友圈会生成转发理由、个人视角文案、互动话术和私域 CTA。",
};

export function FiveEntryGenerator() {
  const [profiles, setProfiles] = useState<AccountProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [accountProfileId, setAccountProfileId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("growth");
  const [activeEntry, setActiveEntry] = useState<ContentEntry>("wechat_article");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [queuedJobId, setQueuedJobId] = useState("");
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);
  const queueButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      setTopic((current) => current || params.get("topic") || "");
      setTopicId((current) => current || params.get("topicId") || "");
      setAccountProfileId((current) => current || params.get("accountProfileId") || "");
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetch("/api/account-profiles")
      .then((response) => readJson<{ profiles: AccountProfile[] }>(response))
      .then((data) => {
        setProfiles(data.profiles);
        setAccountProfileId((current) => current || data.profiles[0]?.id || "");
      })
      .catch((error: Error) => setMessage(error.message))
      .finally(() => setProfilesLoading(false));
    void loadJobs();
  }, []);

  async function loadJobs() {
    try {
      const data = await readJson<{ jobs: GenerationJob[] }>(await fetch("/api/generation-jobs"));
      setJobs(data.jobs);
    } catch {
      // 生成器本身仍可使用，历史记录失败不阻断主流程。
    }
  }

  const activeVariant = useMemo(
    () => result?.project.variants.find((variant) => variant.entry === activeEntry),
    [activeEntry, result],
  );
  const activeImagePrompts = useMemo(() => getStringList(activeVariant?.metadata?.imagePrompts), [activeVariant]);
  const activeKeywords = useMemo(() => getStringList(activeVariant?.metadata?.keywords), [activeVariant]);
  const missingProfile = !profilesLoading && profiles.length === 0;
  const canSubmit = !missingProfile && !loading && !queueing && !queuedJobId && topic.trim().length >= 2;

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
    if (loading || queueing || queuedJobId) {
      return;
    }
    if (topic.trim().length < 2) {
      setMessage("请先输入一个明确的选题，至少 2 个字。");
      return;
    }
    if (missingProfile) {
      setMessage("请先创建账号档案，再生成五入口内容。账号档案用于告诉 AI 你的定位、读者和语气。");
      return;
    }

    setLoading(true);
    setResult(null);
    setMessage("正在生成公众号、小绿书、搜一搜、问一问和朋友圈内容，请先别关闭页面。");
    await nextPaint();
    try {
      const data = await readJson<GenerationResult>(
        await fetchWithTimeout("/api/generate/five-entry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountProfileId: accountProfileId || undefined,
            topicId: topicId || undefined,
            topic,
            goal,
          }),
        }, 90000),
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
    if (loading || queueing || queuedJobId) {
      return;
    }
    if (topic.trim().length < 2) {
      setMessage("请先输入一个明确的选题，至少 2 个字。");
      return;
    }
    if (missingProfile) {
      setMessage("请先创建账号档案，再提交后台生成。建好后这里会自动选择默认档案。");
      return;
    }

    setQueueing(true);
    setResult(null);
    setMessage("正在提交后台生成任务，提交成功后会自动刷新结果。");
    await nextPaint();
    try {
      const data = await readJson<QueuedGenerationResult>(
        await fetchWithTimeout("/api/generate/five-entry/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountProfileId: accountProfileId || undefined,
            topicId: topicId || undefined,
            topic,
            goal,
          }),
        }, 20000),
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

  useEffect(() => {
    const submitButton = submitButtonRef.current;
    const queueButton = queueButtonRef.current;
    if (!submitButton && !queueButton) {
      return;
    }

    const handleSubmitClick = (event: MouseEvent) => {
      event.preventDefault();
      void submit();
    };
    const handleQueueClick = (event: MouseEvent) => {
      event.preventDefault();
      void queueSubmit();
    };

    submitButton?.addEventListener("click", handleSubmitClick);
    queueButton?.addEventListener("click", handleQueueClick);

    return () => {
      submitButton?.removeEventListener("click", handleSubmitClick);
      queueButton?.removeEventListener("click", handleQueueClick);
    };
    // Native listeners are a fallback for the primary action buttons; rebind when the submitted values change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountProfileId, goal, loading, queueing, queuedJobId, topic, topicId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">五入口生成器</h1>
        <p className="mt-1 text-sm text-slate-600">选择账号档案，输入一个选题，一次生成公众号、小绿书、搜一搜、问一问和朋友圈内容包。</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {[
          ["1", "先建账号档案", "账号档案会告诉 AI：你是谁、写给谁、用什么语气和 CTA。"],
          ["2", "输入一个选题", "把你想写的主题填进来，再选择这次更偏涨粉、搜索、转化还是信任。"],
          ["3", "生成后去编辑", "点生成后分别查看五个入口，公众号内容可以去编辑器一键排版。"],
        ].map(([step, title, description]) => (
          <div className="rounded-lg border border-emerald-100 bg-white p-4" key={step}>
            <div className="mb-3 flex size-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">{step}</div>
            <div className="font-semibold text-slate-950">{title}</div>
            <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>输入选题</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[220px_1fr_180px]">
          <label className="space-y-1 text-sm">
            <span className="inline-flex items-center gap-1 text-slate-600">
              账号档案
              <HelpTip text="账号档案相当于你的公众号人设和知识库入口。建好后，生成内容会更像你的账号，而不是通用模板。" />
            </span>
            <select
              className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400"
              value={accountProfileId}
              onChange={(event) => setAccountProfileId(event.target.value)}
              title="选择这次内容使用哪个账号档案。没有档案时需要先创建一个。"
            >
              <option value="">{missingProfile ? "还没有账号档案，请先创建" : "自动选择默认档案"}</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="inline-flex items-center gap-1 text-slate-600">
              选题
              <HelpTip text="这里填你想写的主题。建议用一句自然的话，比如：普通人做公众号副业还有机会吗？" />
            </span>
            <input
              className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="例如：普通人做公众号副业还有机会吗"
              title="输入一个你想生成内容的主题。"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="inline-flex items-center gap-1 text-slate-600">
              内容目标
              <HelpTip text="涨粉会写关注理由；搜索会输出关键词、长尾词、搜索型标题和摘要；转化会写痛点、解决路径和克制 CTA；信任会写边界、适合谁/不适合谁和真实判断；互动会写问题钩子、讨论话术和评论/私信 CTA。" />
            </span>
            <select
              className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              title="选择这次内容更想达成什么目标。不同目标会调用不同后台提示词策略。"
            >
              {goals.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {missingProfile ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 lg:col-span-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2">
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
                  <div>
                    <div className="font-semibold">还没有账号档案，暂时不能生成。</div>
                    <p className="text-amber-800">先用 1 分钟建立公众号定位、读者、语气和常用 CTA。建好后，回到这里会自动选择默认档案。</p>
                  </div>
                </div>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/dashboard/account-profiles">
                    去创建账号档案
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
          <div className="flex flex-col gap-3 lg:col-span-3 sm:flex-row sm:items-center sm:justify-between">
            <p aria-live="polite" data-testid="five-entry-message" className="text-sm text-slate-500">
              {message || (missingProfile ? "请先创建账号档案，再生成五入口内容。" : "生成会消耗 1 次额度，结果会自动保存到内容项目。")}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                ref={submitButtonRef}
                data-testid="five-entry-submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white shadow-sm shadow-emerald-900/10 transition hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-60"
                disabled={!canSubmit}
                title="立即生成五个入口内容：公众号、小绿书、搜一搜、问一问和朋友圈。生成后会自动保存为内容项目。"
                type="button"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {loading ? "生成中..." : "生成五入口内容"}
              </button>
              <button
                ref={queueButtonRef}
                data-testid="five-entry-queue-submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 disabled:pointer-events-none disabled:opacity-60"
                disabled={!canSubmit}
                title="把生成任务放到后台执行，适合长内容或不想停在当前页面等待时使用。"
                type="button"
              >
                {queueing || queuedJobId ? <Loader2 className="size-4 animate-spin" /> : <Clock3 className="size-4" />}
                {queueing || queuedJobId ? "后台生成中..." : "后台生成"}
              </button>
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
              onClick={() => {
                setActiveEntry(entry.id);
                setMessage(result ? `已切换到${entry.label}结果。${entryGuides[entry.id]}` : entryGuides[entry.id]);
              }}
              title={entryGuides[entry.id]}
              type="button"
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
              <p className="mt-1 text-sm text-slate-500">{getEntrySummary(activeEntry)}</p>
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
                  {statusLabels[job.status]}
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
