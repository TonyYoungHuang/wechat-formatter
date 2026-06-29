"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, CheckCircle2, Clock3, ExternalLink, RefreshCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AccountProfile = {
  id: string;
  name: string;
  niche: string;
};

type Topic = {
  id: string;
  title: string;
  accountProfileId: string;
};

type ContentEntry = "wechat_article" | "green_note" | "search" | "question" | "moments";

type Project = {
  id: string;
  title: string;
  status: string;
  accountProfileId: string;
  topicId?: string | null;
  variants?: Array<{
    id: string;
    entry: ContentEntry;
    title: string;
  }>;
};

type CalendarStatus = "idea" | "generated" | "editing" | "ready" | "published" | "reviewed";

type CalendarItem = {
  id: string;
  title: string;
  entry: ContentEntry;
  status: CalendarStatus;
  scheduledFor: string;
  publishedAt?: string | null;
  note?: string | null;
  accountProfile?: AccountProfile | null;
  topic?: { id: string; title: string } | null;
  project?: { id: string; title: string; status: string } | null;
};

const entryLabels: Record<ContentEntry, string> = {
  wechat_article: "公众号",
  green_note: "小绿书",
  search: "搜一搜",
  question: "问一问",
  moments: "朋友圈",
};

const statusLabels: Record<CalendarStatus, string> = {
  idea: "想法",
  generated: "已生成",
  editing: "编辑中",
  ready: "待发布",
  published: "已发布",
  reviewed: "已复盘",
};

const entries = Object.entries(entryLabels) as Array<[ContentEntry, string]>;
const statuses = Object.entries(statusLabels) as Array<[CalendarStatus, string]>;

function pickProjectEntry(project: Project | null | undefined, currentEntry: ContentEntry): ContentEntry {
  if (!project?.variants?.length) {
    return currentEntry;
  }

  return project.variants.some((variant) => variant.entry === currentEntry) ? currentEntry : project.variants[0].entry;
}

function canReplaceTitle(currentTitle: string, project: Project | null | undefined) {
  const title = currentTitle.trim();
  if (!title || title === project?.title) {
    return true;
  }

  return Boolean(project?.variants?.some((variant) => variant.title === title));
}

function projectTitleForEntry(project: Project | null | undefined, entry: ContentEntry, currentTitle: string) {
  if (!project || !canReplaceTitle(currentTitle, project)) {
    return currentTitle;
  }

  return project.variants?.find((variant) => variant.entry === entry)?.title || project.title || currentTitle;
}

function projectEntrySummary(project: Project | null | undefined) {
  return project?.variants?.map((variant) => entryLabels[variant.entry]).join("、") || "";
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}

function toDatetimeLocal(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function defaultScheduledFor() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return toDatetimeLocal(date);
}

function getInitialProjectId() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("projectId") || "";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayLabel(value: string) {
  return new Date(value).toLocaleDateString("zh-CN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function CalendarWorkbench() {
  const [profiles, setProfiles] = useState<AccountProfile[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [nowTs, setNowTs] = useState(0);
  const [filterEntry, setFilterEntry] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [form, setForm] = useState({
    accountProfileId: "",
    topicId: "",
    projectId: getInitialProjectId(),
    entry: "wechat_article" as ContentEntry,
    title: "",
    scheduledFor: defaultScheduledFor(),
    note: "",
  });

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const entryMatched = filterEntry ? item.entry === filterEntry : true;
      const statusMatched = filterStatus ? item.status === filterStatus : true;
      return entryMatched && statusMatched;
    });
  }, [filterEntry, filterStatus, items]);

  const selectedProject = useMemo(() => projects.find((project) => project.id === form.projectId), [form.projectId, projects]);

  const groupedItems = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of filteredItems) {
      const key = new Date(item.scheduledFor).toDateString();
      map.set(key, [...(map.get(key) || []), item]);
    }
    return Array.from(map.entries()).map(([key, dayItems]) => ({
      key,
      label: dayLabel(dayItems[0].scheduledFor),
      items: dayItems,
    }));
  }, [filteredItems]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      ready: items.filter((item) => item.status === "ready").length,
      published: items.filter((item) => item.status === "published").length,
      thisWeek: items.filter((item) => {
        const date = new Date(item.scheduledFor).getTime();
        const now = nowTs;
        return date >= now - 24 * 60 * 60 * 1000 && date <= now + 7 * 24 * 60 * 60 * 1000;
      }).length,
    };
  }, [items, nowTs]);

  async function load() {
    setLoading(true);
    setNowTs(Date.now());
    try {
      const [profileData, topicData, projectData, calendarData] = await Promise.all([
        fetch("/api/account-profiles").then((response) => readJson<{ profiles: AccountProfile[] }>(response)),
        fetch("/api/topics").then((response) => readJson<{ topics: Topic[] }>(response)),
        fetch("/api/projects").then((response) => readJson<{ projects: Project[] }>(response)),
        fetch("/api/calendar-items").then((response) => readJson<{ items: CalendarItem[] }>(response)),
      ]);

      setProfiles(profileData.profiles);
      setTopics(topicData.topics);
      setProjects(projectData.projects);
      setItems(calendarData.items);
      setForm((current) => {
        const initialProject = current.projectId ? projectData.projects.find((project) => project.id === current.projectId) : null;
        const nextEntry = pickProjectEntry(initialProject, current.entry);

        return {
          ...current,
          entry: nextEntry,
          title: projectTitleForEntry(initialProject, nextEntry, current.title),
          accountProfileId: initialProject?.accountProfileId || current.accountProfileId || profileData.profiles[0]?.id || "",
          topicId: initialProject?.topicId || current.topicId || "",
        };
      });
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载内容日历失败。");
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

  function updateForm(key: keyof typeof form, value: string) {
    if (key === "projectId") {
      const project = projects.find((item) => item.id === value);
      setForm((current) => {
        const nextEntry = pickProjectEntry(project, current.entry);
        return {
          ...current,
          projectId: value,
          entry: nextEntry,
          title: projectTitleForEntry(project, nextEntry, current.title),
          accountProfileId: project?.accountProfileId || current.accountProfileId,
          topicId: project?.topicId || current.topicId,
        };
      });
      return;
    }

    if (key === "entry") {
      const nextEntry = value as ContentEntry;
      setForm((current) => ({
        ...current,
        entry: nextEntry,
        title: projectTitleForEntry(projects.find((project) => project.id === current.projectId), nextEntry, current.title),
      }));
      return;
    }

    setForm((current) => ({ ...current, [key]: value }));
  }

  async function createItem() {
    if (!form.title.trim()) {
      setMessage("请先填写排期标题。");
      return;
    }

    try {
      await readJson<{ item: CalendarItem }>(
        await fetch("/api/calendar-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            scheduledFor: new Date(form.scheduledFor).toISOString(),
            status: "ready",
          }),
        }),
      );
      setMessage("已加入内容日历。");
      setForm((current) => ({
        ...current,
        title: "",
        note: "",
        scheduledFor: defaultScheduledFor(),
      }));
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存排期失败。");
    }
  }

  async function updateStatus(item: CalendarItem, status: CalendarStatus) {
    try {
      await readJson<{ item: CalendarItem }>(
        await fetch(`/api/calendar-items/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            publishedAt: status === "published" ? new Date().toISOString() : item.publishedAt,
          }),
        }),
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新状态失败。");
    }
  }

  async function removeItem(id: string) {
    try {
      const response = await fetch(`/api/calendar-items/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "删除失败。");
      }
      setItems((current) => current.filter((item) => item.id !== id));
      setMessage("已删除排期。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除排期失败。");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">内容日历</h1>
          <p className="mt-1 text-sm text-slate-600">把公众号、小绿书、搜一搜、问一问和朋友圈排进一周发布节奏。</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCcw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
          <Button asChild>
            <Link href="/dashboard/generate">生成内容</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">全部排期</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{stats.total}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">本周任务</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{stats.thisWeek}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">待发布</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-700">{stats.ready}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">已发布</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{stats.published}</div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新增发布排期</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_1fr_160px]">
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">关联项目</span>
            <select value={form.projectId} onChange={(event) => updateForm("projectId", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400">
              <option value="">不关联项目</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">账号档案</span>
            <select value={form.accountProfileId} onChange={(event) => updateForm("accountProfileId", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400">
              <option value="">请选择账号</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">发布入口</span>
            <select value={form.entry} onChange={(event) => updateForm("entry", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400">
              {entries.map(([entry, label]) => (
                <option key={entry} value={entry}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {selectedProject ? (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 lg:col-span-3">
              已关联项目「{selectedProject.title}」，可排期入口：{projectEntrySummary(selectedProject) || "暂无生成入口"}。
            </div>
          ) : null}
          <label className="space-y-1 text-sm lg:col-span-2">
            <span className="text-slate-600">排期标题</span>
            <input value={form.title} onChange={(event) => updateForm("title", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">发布时间</span>
            <input type="datetime-local" value={form.scheduledFor} onChange={(event) => updateForm("scheduledFor", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
          </label>
          <label className="space-y-1 text-sm lg:col-span-2">
            <span className="text-slate-600">选题</span>
            <select value={form.topicId} onChange={(event) => updateForm("topicId", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400">
              <option value="">不关联选题</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.title}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">备注</span>
            <input value={form.note} onChange={(event) => updateForm("note", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
          </label>
          <div className="flex items-end lg:col-span-3">
            <Button onClick={createItem} disabled={!form.accountProfileId || !form.title.trim()}>
              <CalendarPlus className="size-4" />
              加入日历
            </Button>
          </div>
          {message ? <p className="text-sm text-slate-500 lg:col-span-3">{message}</p> : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row">
        <select value={filterEntry} onChange={(event) => setFilterEntry(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400">
          <option value="">全部入口</option>
          {entries.map(([entry, label]) => (
            <option key={entry} value={entry}>
              {label}
            </option>
          ))}
        </select>
        <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400">
          <option value="">全部状态</option>
          {statuses.map(([status, label]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {groupedItems.map((group) => (
          <section key={group.key} className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Clock3 className="size-4 text-emerald-600" />
              {group.label}
            </div>
            <div className="grid gap-3">
              {group.items.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_180px_220px] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">{entryLabels[item.entry]}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{statusLabels[item.status]}</span>
                      <span className="text-xs text-slate-500">{formatDateTime(item.scheduledFor)}</span>
                    </div>
                    <div className="mt-2 font-medium text-slate-950">{item.title}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {item.accountProfile?.name || "账号未绑定"} {item.topic ? `· ${item.topic.title}` : ""} {item.note ? `· ${item.note}` : ""}
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">
                    {item.project ? (
                      <Link className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800" href={`/dashboard/editor?projectId=${item.project.id}`}>
                        {item.project.title}
                        <ExternalLink className="size-3" />
                      </Link>
                    ) : (
                      "未关联内容项目"
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {item.status !== "published" ? (
                      <Button size="sm" variant="secondary" onClick={() => updateStatus(item, "published")}>
                        <CheckCircle2 className="size-4" />
                        发布
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => updateStatus(item, "reviewed")}>
                        复盘
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => removeItem(item.id)} title="删除排期">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {!filteredItems.length && !loading ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="font-medium text-slate-800">还没有发布排期</p>
          <p className="mt-1 text-sm text-slate-500">先从五入口生成器保存内容项目，再把关键入口加入日历。</p>
        </div>
      ) : null}
    </div>
  );
}
