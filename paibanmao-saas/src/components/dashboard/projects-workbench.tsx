"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RefreshCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Project = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  reviewNote?: string | null;
  accountProfile?: { name: string; niche: string };
  topic?: { title: string } | null;
  variants: Array<{ id: string; entry: string; title: string }>;
  metrics?: Metric[];
  _count?: { reports: number; metrics: number };
};

type Metric = {
  id: string;
  entry?: string | null;
  readCount: number;
  likeCount: number;
  watchCount: number;
  favoriteCount: number;
  commentCount: number;
  followerGain: number;
  consultationCount: number;
  dealCount: number;
  note?: string | null;
  recordedAt: string;
};

type MetricForm = {
  readCount: string;
  likeCount: string;
  watchCount: string;
  favoriteCount: string;
  commentCount: string;
  followerGain: string;
  consultationCount: string;
  dealCount: string;
  note: string;
  reviewNote: string;
};

const entryLabels: Record<string, string> = {
  wechat_article: "公众号",
  green_note: "小绿书",
  search: "搜一搜",
  question: "问一问",
  moments: "朋友圈",
};

const emptyMetricForm: MetricForm = {
  readCount: "",
  likeCount: "",
  watchCount: "",
  favoriteCount: "",
  commentCount: "",
  followerGain: "",
  consultationCount: "",
  dealCount: "",
  note: "",
  reviewNote: "",
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}

function toCount(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export function ProjectsWorkbench() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeReviewProjectId, setActiveReviewProjectId] = useState("");
  const [metricForms, setMetricForms] = useState<Record<string, MetricForm>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await readJson<{ projects: Project[] }>(await fetch("/api/projects"));
      setProjects(data.projects);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载内容项目失败。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function getMetricForm(project: Project) {
    return metricForms[project.id] || { ...emptyMetricForm, reviewNote: project.reviewNote || "" };
  }

  function updateMetricForm(projectId: string, patch: Partial<MetricForm>) {
    setMetricForms((current) => ({
      ...current,
      [projectId]: {
        ...(current[projectId] || emptyMetricForm),
        ...patch,
      },
    }));
  }

  async function saveMetric(project: Project) {
    const form = getMetricForm(project);

    try {
      await readJson<{ metric: Metric }>(
        await fetch(`/api/projects/${project.id}/metrics`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            readCount: toCount(form.readCount),
            likeCount: toCount(form.likeCount),
            watchCount: toCount(form.watchCount),
            favoriteCount: toCount(form.favoriteCount),
            commentCount: toCount(form.commentCount),
            followerGain: toCount(form.followerGain),
            consultationCount: toCount(form.consultationCount),
            dealCount: toCount(form.dealCount),
            note: form.note || undefined,
            reviewNote: form.reviewNote || undefined,
          }),
        }),
      );
      setMessage(`${project.title} 的复盘数据已保存。`);
      setActiveReviewProjectId("");
      setMetricForms((current) => ({ ...current, [project.id]: emptyMetricForm }));
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存复盘失败。");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">内容项目</h1>
          <p className="mt-1 text-sm text-slate-600">一个项目保存同一选题下的五入口内容、检查报告和发布复盘。</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCcw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
          <Button asChild>
            <Link href="/dashboard/generate">新建内容</Link>
          </Button>
        </div>
      </div>

      {message ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{message}</div> : null}

      <div className="grid gap-4">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{project.title}</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  {project.accountProfile?.name || "账号档案"} · {project.topic?.title || "独立选题"} · {new Date(project.updatedAt).toLocaleString()}
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{project.status}</span>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.metrics?.[0] ? (
                <div className="grid gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900 sm:grid-cols-4">
                  <span>阅读 {project.metrics[0].readCount}</span>
                  <span>收藏 {project.metrics[0].favoriteCount}</span>
                  <span>新增关注 {project.metrics[0].followerGain}</span>
                  <span>成交 {project.metrics[0].dealCount}</span>
                </div>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {project.variants.map((variant) => (
                  <div key={variant.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">{entryLabels[variant.entry] || variant.entry}</div>
                    <div className="mt-1 line-clamp-2 text-sm font-medium text-slate-800">{variant.title}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {project._count?.reports ?? 0} 份发布检查报告 · {project._count?.metrics ?? 0} 条复盘记录
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setActiveReviewProjectId((current) => (current === project.id ? "" : project.id))}>
                    记录复盘
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/dashboard/checks?projectId=${project.id}`}>发布检查</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/dashboard/editor?projectId=${project.id}`}>去编辑</Link>
                  </Button>
                </div>
              </div>
              {activeReviewProjectId === project.id ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["readCount", "阅读量"],
                      ["likeCount", "点赞"],
                      ["watchCount", "在看"],
                      ["favoriteCount", "收藏"],
                      ["commentCount", "评论"],
                      ["followerGain", "新增关注"],
                      ["consultationCount", "咨询数"],
                      ["dealCount", "成交数"],
                    ].map(([key, label]) => (
                      <label key={key} className="space-y-1 text-sm">
                        <span className="text-slate-600">{label}</span>
                        <input
                          inputMode="numeric"
                          value={getMetricForm(project)[key as keyof MetricForm]}
                          onChange={(event) => updateMetricForm(project.id, { [key]: event.target.value })}
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-emerald-400"
                        />
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <span className="text-slate-600">复盘备注</span>
                      <textarea
                        value={getMetricForm(project).reviewNote}
                        onChange={(event) => updateMetricForm(project.id, { reviewNote: event.target.value })}
                        className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-emerald-400"
                        placeholder="这次内容为什么有效或无效？下次要调整什么？"
                      />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="text-slate-600">指标说明</span>
                      <textarea
                        value={getMetricForm(project).note}
                        onChange={(event) => updateMetricForm(project.id, { note: event.target.value })}
                        className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-emerald-400"
                        placeholder="例如：朋友圈转发后新增 3 个咨询，搜一搜带来长尾阅读。"
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" onClick={() => saveMetric(project)}>
                      <Save className="size-4" />
                      保存复盘
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {!projects.length && !message ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="font-medium text-slate-800">还没有内容项目</p>
          <p className="mt-1 text-sm text-slate-500">从五入口生成器保存第一个内容包。</p>
        </div>
      ) : null}
    </div>
  );
}
