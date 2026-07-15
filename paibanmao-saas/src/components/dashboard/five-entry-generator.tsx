"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, Copy, FileText, FolderOpen, HelpCircle, History, Lightbulb, Link2, Loader2, PencilLine, Save, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { contentEntries, type ContentEntry } from "@/lib/content/entries";
import { copyPlainText, copyWechatRichHtml } from "@/lib/wechat-layout";

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

type InputMode = "topic" | "material" | "url";
type AdaptationMode = "adapt" | "rewrite" | "original";

type ExtractedSource = {
  url: string;
  title: string;
  description: string;
  text: string;
  charCount: number;
  truncated: boolean;
};

type QueuedGenerationResult = {
  job: {
    id: string;
    type?: string;
    status: "pending" | "running" | "succeeded" | "failed" | "cancelled";
    error?: string | null;
    output?: JobOutput | null;
  };
  project?: GenerationResult["project"] | null;
  queued?: boolean;
  fallback?: "sync";
};

type JobOutput = {
  projectId?: string;
  projectTitle?: string | null;
  title?: string | null;
  html?: string | null;
  text?: string | null;
  body?: string | null;
  suggestions?: Array<{
    title?: string;
    reason?: string;
    entries?: string[];
  }>;
  prompts?: string[];
  images?: Array<{
    prompt?: string;
    revisedPrompt?: string;
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
  hasHtml?: boolean;
  hasImages?: boolean;
  imageCount?: number;
};

type RecentJobPreview = {
  title: string;
  html?: string;
  text: string;
  sections?: Array<{ title: string; body: string }>;
  images?: Array<{
    prompt?: string;
    revisedPrompt?: string;
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

type GenerationJob = {
  id: string;
  type: string;
  status: "pending" | "running" | "succeeded" | "failed" | "cancelled";
  output?: JobOutput | null;
  createdAt: string;
};

const goals = [
  { value: "growth", label: "涨粉" },
  { value: "search", label: "搜索" },
  { value: "conversion", label: "转化" },
  { value: "trust", label: "信任" },
  { value: "interaction", label: "互动" },
];

const inputModes = [
  { value: "topic" as const, label: "输入选题", description: "从一句话开始原创", icon: Lightbulb },
  { value: "material" as const, label: "粘贴文稿", description: "长文、播客或视频转写稿", icon: FileText },
  { value: "url" as const, label: "读取链接", description: "提取公开网页正文", icon: Link2 },
];

const adaptationOptions = [
  { value: "adapt" as const, label: "改编成微信内容", description: "保留精华，重新组织五入口" },
  { value: "rewrite" as const, label: "深度改写", description: "保留信息，重做标题和结构" },
  { value: "original" as const, label: "原创发挥", description: "只吸收洞察，从账号角度重写" },
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

function getJobProjectId(job: GenerationJob) {
  const projectId = job.output?.projectId;
  return typeof projectId === "string" ? projectId : "";
}

function getWechatArticleVariant(project?: GenerationResult["project"] | null) {
  return project?.variants.find((variant) => variant.entry === "wechat_article") ?? null;
}

function htmlToPlainText(html?: string | null) {
  if (!html) {
    return "";
  }
  if (typeof window === "undefined") {
    return html.replace(/<[^>]*>/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  const container = document.createElement("div");
  container.innerHTML = html;
  return (container.textContent || container.innerText || "").replace(/\n{3,}/g, "\n\n").trim();
}

function getImageSrc(image: NonNullable<RecentJobPreview["images"]>[number]) {
  if (image.url) {
    return image.url;
  }
  if (image.b64Json) {
    return `data:${image.mimeType || "image/png"};base64,${image.b64Json}`;
  }
  return "";
}

function buildGenericPreview(job: QueuedGenerationResult["job"]): RecentJobPreview | null {
  const output = job.output;
  if (!output) {
    return null;
  }

  if (output.html) {
    const title = output.title || "公众号排版结果";
    return { title, html: output.html, text: output.text || htmlToPlainText(output.html) };
  }

  if (output.suggestions?.length) {
    const sections = output.suggestions.map((item, index) => ({
      title: item.title || `选题建议 ${index + 1}`,
      body: [item.reason, item.entries?.length ? `适合入口：${item.entries.join("、")}` : ""].filter(Boolean).join("\n"),
    }));
    return {
      title: "AI 选题建议",
      sections,
      text: sections.map((item) => `${item.title}\n${item.body}`.trim()).join("\n\n"),
    };
  }

  if (output.prompts?.length) {
    return {
      title: output.title || "图片提示词",
      sections: output.prompts.map((prompt, index) => ({ title: `第 ${index + 1} 条提示词`, body: prompt })),
      text: output.prompts.join("\n\n"),
    };
  }

  if (output.images?.length) {
    const sections = output.images.map((image, index) => ({
      title: `第 ${index + 1} 张图`,
      body: image.revisedPrompt || image.prompt || "图片已生成",
    }));
    return {
      title: "Gemini 生图结果",
      sections,
      images: output.images,
      text: sections.map((item) => `${item.title}\n${item.body}`).join("\n\n"),
    };
  }

  if (output.body || output.text || output.title) {
    const title = output.title || "生成结果";
    const text = [output.title, output.body || output.text].filter(Boolean).join("\n\n");
    return { title, text };
  }

  return null;
}

function getJobUserMessage(job: GenerationJob) {
  if (job.status === "succeeded") {
    if (job.type === "wechat_layout_generation") {
      return "排版结果已生成。点右侧“查看排版”可以直接查看和复制。";
    }
    if (job.type !== "five_entry_generation") {
      return "结果已生成。点右侧“查看结果”可以直接打开和复制。";
    }
    return "内容已生成。点右侧“查看文章”可在本页打开，点“去编辑复制”可进入排版复制页面。";
  }
  if (job.status === "failed") {
    return "这次生成没有完成，请稍后重试；如果多次失败，可以联系微信客服。";
  }
  if (job.status === "running") {
    return "正在生成，请稍等片刻。";
  }
  return "任务已提交，等待开始生成。";
}

function formatJobType(type: string) {
  const labels: Record<string, string> = {
    five_entry_generation: "五入口生成",
    topic_generation: "选题生成",
    image_prompt_generation: "图片提示词",
    ai_tone_rewrite: "自然改写",
    wechat_layout_generation: "公众号 AI 排版",
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
  const [inputMode, setInputMode] = useState<InputMode>("topic");
  const [adaptationMode, setAdaptationMode] = useState<AdaptationMode>("adapt");
  const [sourceText, setSourceText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceInstructions, setSourceInstructions] = useState("");
  const [sourcePreview, setSourcePreview] = useState<ExtractedSource | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [goal, setGoal] = useState("growth");
  const [activeEntry, setActiveEntry] = useState<ContentEntry>("wechat_article");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [queuedJobId, setQueuedJobId] = useState("");
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [recentPreview, setRecentPreview] = useState<RecentJobPreview | null>(null);
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

  async function openJobResult(jobId: string) {
    try {
      setMessage("正在打开这次生成的文章...");
      const data = await readJson<QueuedGenerationResult>(await fetch(`/api/generation-jobs/${jobId}`));

      if (data.project) {
        setRecentPreview(null);
        setResult({ project: data.project });
        setActiveEntry("wechat_article");
        setMessage("已打开历史生成结果。下方可以查看公众号正文，也可以点“去编辑复制”进入排版复制页面。");
        window.setTimeout(() => {
          document.getElementById("five-entry-result-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
        return;
      }

      const preview = buildGenericPreview(data.job);
      if (preview) {
        setRecentPreview(preview);
        setMessage(data.job.type === "wechat_layout_generation" ? "已打开公众号排版结果。下方可以预览，也可以复制 HTML 粘贴到微信公众平台。" : "已打开历史生成结果。下方可以查看和复制。");
        window.setTimeout(() => {
          document.getElementById("recent-job-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
        return;
      }

      setMessage("这条记录没有关联到可打开的内容。可以重新生成一次，或联系微信客服帮你排查。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "打开历史文章失败。");
    }
  }

  async function copyJobWechatArticle(jobId: string) {
    try {
      setMessage("正在读取公众号正文...");
      const data = await readJson<QueuedGenerationResult>(await fetch(`/api/generation-jobs/${jobId}`));
      const article = getWechatArticleVariant(data.project);

      if (!article) {
        setMessage("这条记录里没有找到公众号正文。可以点“查看文章”检查其他入口内容。");
        return;
      }

      await copyText(`${article.title}\n\n${article.body}`);
      setMessage("公众号正文已复制。下一步：打开微信公众平台图文编辑器，在正文区域粘贴；需要排版可点“去编辑复制”。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "复制公众号正文失败。");
    }
  }

  async function copyJobLayout(jobId: string, mode: "html" | "text") {
    try {
      setMessage(mode === "html" ? "正在读取排版 HTML..." : "正在读取排版纯文本...");
      const data = await readJson<QueuedGenerationResult>(await fetch(`/api/generation-jobs/${jobId}`));
      const html = data.job.output?.html || "";

      if (!html) {
        setMessage("这条记录里没有找到可复制的排版结果。可以重新排版一次，或联系微信客服帮你排查。");
        return;
      }

      if (mode === "html") {
        await copyWechatRichHtml(html, data.job.output?.text || htmlToPlainText(html));
      } else {
        await copyText(data.job.output?.text || htmlToPlainText(html));
      }
      setMessage(mode === "html" ? "公众号排版 HTML 已复制。下一步：打开微信公众平台图文编辑器，在正文区域粘贴。" : "公众号纯文本已复制。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "复制排版结果失败。");
    }
  }

  async function copyRecentPreviewLayout() {
    if (!recentPreview?.html) return;
    try {
      await copyWechatRichHtml(recentPreview.html, recentPreview.text);
      setMessage("公众号富文本排版已复制。下一步：打开微信公众平台图文编辑器，在正文区域粘贴。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "公众号富文本复制失败，请进入编辑器后重试。");
    }
  }

  const activeVariant = useMemo(
    () => result?.project.variants.find((variant) => variant.entry === activeEntry),
    [activeEntry, result],
  );
  const activeImagePrompts = useMemo(() => getStringList(activeVariant?.metadata?.imagePrompts), [activeVariant]);
  const activeKeywords = useMemo(() => getStringList(activeVariant?.metadata?.keywords), [activeVariant]);
  const missingProfile = !profilesLoading && profiles.length === 0;
  const hasValidInput =
    inputMode === "topic"
      ? topic.trim().length >= 2
      : inputMode === "material"
        ? sourceText.trim().length >= 50
        : /^https?:\/\//i.test(sourceUrl.trim());
  const canSubmit = !missingProfile && !loading && !queueing && !queuedJobId && !sourceLoading && hasValidInput;

  function generationPayload() {
    return {
      accountProfileId: accountProfileId || undefined,
      topicId: topicId || undefined,
      topic,
      goal,
      inputMode,
      adaptationMode,
      sourceText: inputMode === "topic" ? "" : inputMode === "url" && !sourcePreview ? "" : sourceText,
      sourceUrl: inputMode === "url" ? sourceUrl : "",
      sourceTitle: inputMode === "topic" ? "" : sourceTitle,
      sourceInstructions: inputMode === "topic" ? "" : sourceInstructions,
    };
  }

  function validateGenerationInput() {
    if (inputMode === "topic" && topic.trim().length < 2) return "请先输入一个明确的选题，至少 2 个字。";
    if (inputMode === "material" && sourceText.trim().length < 50) return "请粘贴至少 50 个字的文稿或转写内容。";
    if (inputMode === "url" && !/^https?:\/\//i.test(sourceUrl.trim())) return "请输入完整的公开网页链接，以 http:// 或 https:// 开头。";
    return "";
  }

  async function extractSourceUrl() {
    if (!/^https?:\/\//i.test(sourceUrl.trim())) {
      setMessage("请输入完整的公开网页链接，以 http:// 或 https:// 开头。");
      return;
    }

    setSourceLoading(true);
    setSourcePreview(null);
    setMessage("正在读取网页正文...");
    try {
      const data = await readJson<{ source: ExtractedSource }>(
        await fetchWithTimeout(
          "/api/sources/extract",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: sourceUrl }),
          },
          20000,
        ),
      );
      setSourcePreview(data.source);
      setSourceText(data.source.text);
      setSourceTitle(data.source.title);
      setSourceUrl(data.source.url);
      setMessage(`已读取《${data.source.title}》，共 ${data.source.charCount.toLocaleString()} 字。可以补充创作要求后生成。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "读取链接失败，请直接粘贴文稿内容。");
    } finally {
      setSourceLoading(false);
    }
  }

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
    const validationMessage = validateGenerationInput();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }
    if (missingProfile) {
      setMessage("请先创建账号档案，再生成五入口内容。账号档案用于告诉 AI 你的定位、读者和语气。");
      return;
    }

    setLoading(true);
    setResult(null);
    setMessage("生成任务正在提交到后台队列。提交成功后可以停留等待，也可以稍后在最近生成记录里查看。");
    await nextPaint();
    try {
      const data = await readJson<QueuedGenerationResult>(
        await fetchWithTimeout("/api/generate/five-entry/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(generationPayload()),
        }, 15000),
      );
      if (data.project) {
        setResult({ project: data.project });
        setQueuedJobId("");
        setMessage("五入口内容已生成，并保存为内容项目。");
        void loadJobs();
        return;
      }

      if (data.job.status === "failed") {
        setQueuedJobId("");
        setMessage(data.job.error || "后台生成队列暂时不可用，请稍后重试或联系微信客服。");
        void loadJobs();
        return;
      }

      setQueuedJobId(data.job.id);
      setMessage("任务已提交，预计 1-3 分钟完成。完成后这里会自动显示结果，并提供去编辑、发布检查和项目入口。");
      void loadJobs();
      return;
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
    const validationMessage = validateGenerationInput();
    if (validationMessage) {
      setMessage(validationMessage);
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
          body: JSON.stringify(generationPayload()),
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
    try {
      await copyPlainText(value);
      setMessage("已复制到剪贴板。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "复制失败，请长按内容手动复制。");
    }
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
  }, [accountProfileId, adaptationMode, goal, inputMode, loading, queueing, queuedJobId, sourceInstructions, sourcePreview, sourceText, sourceTitle, sourceUrl, topic, topicId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">五入口生成器</h1>
        <p className="mt-1 text-sm text-slate-600">可以从一个选题开始，也可以粘贴文稿或读取公开链接，再生成公众号、小绿书、搜一搜、问一问和朋友圈内容包。</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {[
          ["1", "先建账号档案", "账号档案会告诉 AI：你是谁、写给谁、用什么语气和 CTA。"],
          ["2", "选择创作素材", "输入选题，或粘贴播客、视频转写稿和长文；公开网页也可以直接读取。"],
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
          <CardTitle>这次从哪里开始写</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3" role="tablist" aria-label="创作输入方式">
            {inputModes.map((mode) => {
              const Icon = mode.icon;
              const active = inputMode === mode.value;
              return (
                <button
                  aria-selected={active}
                  className={`flex min-h-20 items-center gap-3 rounded-lg border p-3 text-left transition ${active ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40"}`}
                  key={mode.value}
                  onClick={() => {
                    setInputMode(mode.value);
                    setMessage(mode.value === "topic" ? "输入一句明确选题即可开始。" : mode.value === "material" ? "粘贴完整文稿后，选择改编方式。" : "先读取公开链接；如果平台不提供正文，请改为粘贴转写稿。");
                  }}
                  role="tab"
                  type="button"
                >
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{mode.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">{mode.description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
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
          </div>

          {inputMode === "topic" ? (
            <label className="block space-y-1 text-sm">
              <span className="inline-flex items-center gap-1 text-slate-600">
                选题
                <HelpTip text="建议写成一个具体问题或判断，例如：普通人做公众号副业还有机会吗？" />
              </span>
              <input
                className="h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="例如：普通人做公众号副业还有机会吗"
                title="输入一个你想生成内容的主题。"
              />
            </label>
          ) : (
            <div className="space-y-4 rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
              {inputMode === "url" ? (
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                    公开网页链接
                    <HelpTip text="支持能够公开访问的图文网页。B 站和播客页面如果没有公开全文，通常只能读到简介，建议直接粘贴转写稿。" />
                  </span>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400"
                      value={sourceUrl}
                      onChange={(event) => {
                        setSourceUrl(event.target.value);
                        setSourcePreview(null);
                      }}
                      placeholder="https://..."
                      title="粘贴公开网页链接"
                    />
                    <Button disabled={sourceLoading} onClick={() => void extractSourceUrl()} type="button" variant="secondary">
                      {sourceLoading ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
                      {sourceLoading ? "读取中" : "读取正文"}
                    </Button>
                  </div>
                  {sourcePreview ? (
                    <div className="rounded-lg border border-emerald-200 bg-white p-3 text-sm">
                      <div className="font-semibold text-slate-950">已读取：{sourcePreview.title}</div>
                      <p className="mt-1 text-slate-600">正文 {sourcePreview.charCount.toLocaleString()} 字{sourcePreview.truncated ? "，已截取前 50,000 字" : ""}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {inputMode === "material" || (inputMode === "url" && sourcePreview) ? (
                <label className="block space-y-1 text-sm">
                  <span className="flex items-center justify-between gap-3 text-slate-600">
                    <span>{inputMode === "material" ? "文稿或转写内容" : "读取到的正文（可补充或修改）"}</span>
                    <span>{sourceText.length.toLocaleString()} / 50,000 字</span>
                  </span>
                  <textarea
                    className="min-h-56 w-full resize-y rounded-lg border border-slate-200 bg-white p-3 leading-7 outline-none focus:border-emerald-400"
                    maxLength={50000}
                    onChange={(event) => setSourceText(event.target.value)}
                    placeholder="粘贴播客转写稿、视频文稿、采访记录、文章正文或你的读书笔记。内容越完整，生成越有依据。"
                    value={sourceText}
                  />
                </label>
              ) : null}

              <div>
                <div className="mb-2 text-sm text-slate-600">希望怎么使用这份素材</div>
                <div className="grid gap-2 md:grid-cols-3">
                  {adaptationOptions.map((option) => (
                    <button
                      className={`min-h-20 rounded-lg border p-3 text-left transition ${adaptationMode === option.value ? "border-emerald-500 bg-white shadow-sm" : "border-slate-200 bg-white/70 hover:border-emerald-300"}`}
                      key={option.value}
                      onClick={() => setAdaptationMode(option.value)}
                      type="button"
                    >
                      <span className="block text-sm font-semibold text-slate-950">{option.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-slate-600">创作方向（可选）</span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-emerald-400"
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="例如：重点写给刚开始做副业的人"
                    value={topic}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-slate-600">补充要求（可选）</span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-emerald-400"
                    maxLength={500}
                    onChange={(event) => setSourceInstructions(event.target.value)}
                    placeholder="例如：不要谈变现，保留其中三个案例"
                    value={sourceInstructions}
                  />
                </label>
              </div>
              <p className="text-xs leading-5 text-slate-500">系统会提取观点和事实后重新组织，不会逐句替换同义词。生成完成后不把整篇参考素材写入账号知识库。</p>
            </div>
          )}

          {missingProfile ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
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
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p aria-live="polite" data-testid="five-entry-message" className="text-sm text-slate-500">
              {message || (missingProfile ? "请先创建账号档案，再生成五入口内容。" : inputMode === "topic" ? "生成会消耗 1 次额度，结果会自动保存到内容项目。" : "素材会先做观点拆解，再生成五入口；完成后只保留来源摘要，不长期保存参考正文。")}
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

      <div id="five-entry-result-panel" className="grid gap-4 lg:grid-cols-[220px_1fr]">
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

      {recentPreview ? (
        <Card id="recent-job-preview">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>历史排版结果</CardTitle>
              <p className="mt-1 text-sm text-slate-500">这里就是刚才生成的公众号排版内容。可以先预览，再复制到微信公众平台。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentPreview.html ? (
                <Button size="sm" variant="secondary" onClick={() => void copyRecentPreviewLayout()}>
                  复制公众号排版
                </Button>
              ) : null}
              <Button size="sm" variant="secondary" onClick={() => void copyText(recentPreview.text).then(() => setMessage("历史生成结果已复制。"))}>
                复制全部文本
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-emerald-100 bg-white p-5">
              <h2 className="mb-4 text-xl font-semibold text-slate-950">{recentPreview.title}</h2>
              {recentPreview.html ? (
                <div className="prose prose-slate max-w-none whitespace-normal text-base leading-8" dangerouslySetInnerHTML={{ __html: recentPreview.html }} />
              ) : null}
              {recentPreview.sections?.length ? (
                <div className="space-y-3">
                  {recentPreview.sections.map((section, index) => (
                    <div key={`${section.title}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                      <div className="font-semibold text-slate-950">{section.title}</div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{section.body}</p>
                    </div>
                  ))}
                </div>
              ) : !recentPreview.html ? (
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{recentPreview.text}</p>
              ) : null}
              {recentPreview.images?.length ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {recentPreview.images.map((image, index) => {
                    const src = getImageSrc(image);
                    return (
                      <div key={`${image.prompt || "image"}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        {src ? <Image alt={`生成图片 ${index + 1}`} className="h-auto w-full rounded-md border border-slate-100" height={480} src={src} unoptimized width={360} /> : null}
                        <p className="mt-2 text-xs leading-5 text-slate-600">{image.revisedPrompt || image.prompt || "图片已生成"}</p>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="size-5 text-emerald-600" />
              最近生成记录
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">生成完成后，从这里点“查看文章”打开正文，或点“去编辑复制”进入公众号排版和复制页面。</p>
          </div>
          <Button size="sm" variant="secondary" onClick={loadJobs}>
            刷新
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {jobs.slice(0, 8).map((job) => {
            const projectId = getJobProjectId(job);
            const canOpen = job.status === "succeeded" && job.type === "five_entry_generation";
            const canOpenLayout = job.status === "succeeded" && job.type === "wechat_layout_generation";
            const canOpenGeneric = job.status === "succeeded" && !canOpen && !canOpenLayout;
            return (
              <div key={job.id} className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm lg:grid-cols-[160px_100px_1fr_320px] lg:items-center">
                <div>
                  <div className="font-medium text-slate-950">{job.output?.projectTitle || job.output?.title || formatJobType(job.type)}</div>
                  <div className="mt-1 text-xs text-slate-500">{new Date(job.createdAt).toLocaleString()}</div>
                </div>
                <span className={`w-fit rounded-full px-2 py-1 text-xs ${job.status === "succeeded" ? "bg-emerald-50 text-emerald-700" : job.status === "failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                  {statusLabels[job.status]}
                </span>
                <div className="min-w-0 text-slate-600">
                  <div className={job.status === "failed" ? "text-red-600" : "text-slate-600"}>{getJobUserMessage(job)}</div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {canOpen ? (
                    <Button size="sm" variant="secondary" onClick={() => void openJobResult(job.id)}>
                      查看文章
                    </Button>
                  ) : null}
                  {canOpenLayout ? (
                    <Button size="sm" variant="secondary" onClick={() => void openJobResult(job.id)}>
                      查看排版
                    </Button>
                  ) : null}
                  {canOpenGeneric ? (
                    <Button size="sm" variant="secondary" onClick={() => void openJobResult(job.id)}>
                      查看结果
                    </Button>
                  ) : null}
                  {canOpen ? (
                    <Button size="sm" variant="secondary" onClick={() => void copyJobWechatArticle(job.id)}>
                      复制公众号正文
                    </Button>
                  ) : null}
                  {canOpenLayout ? (
                    <Button size="sm" variant="secondary" onClick={() => void copyJobLayout(job.id, "html")}>
                      复制公众号 HTML
                    </Button>
                  ) : null}
                  {projectId ? (
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/dashboard/editor?projectId=${projectId}`}>去编辑复制</Link>
                    </Button>
                  ) : canOpen ? (
                    <Button size="sm" variant="secondary" onClick={() => void openJobResult(job.id)}>
                      打开结果
                    </Button>
                  ) : null}
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
