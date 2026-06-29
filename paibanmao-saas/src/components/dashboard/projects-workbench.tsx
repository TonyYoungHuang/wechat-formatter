"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Project = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  accountProfile?: { name: string; niche: string };
  topic?: { title: string } | null;
  variants: Array<{ id: string; entry: string; title: string }>;
  _count?: { reports: number };
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

export function ProjectsWorkbench() {
  const [projects, setProjects] = useState<Project[]>([]);
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
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {project.variants.map((variant) => (
                  <div key={variant.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">{entryLabels[variant.entry] || variant.entry}</div>
                    <div className="mt-1 line-clamp-2 text-sm font-medium text-slate-800">{variant.title}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>{project._count?.reports ?? 0} 份发布检查报告</span>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/dashboard/checks?projectId=${project.id}`}>发布检查</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/dashboard/editor?projectId=${project.id}`}>去编辑</Link>
                  </Button>
                </div>
              </div>
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
