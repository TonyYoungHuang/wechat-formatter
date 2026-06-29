"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, RefreshCcw, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ContentEntry = "wechat_article" | "green_note" | "search" | "question" | "moments";

type AccountProfile = {
  id: string;
  name: string;
  niche: string;
};

type CtaSnippet = {
  id: string;
  accountProfileId?: string | null;
  title: string;
  category: string;
  entry?: ContentEntry | null;
  content: string;
  tags: string[];
  accountProfile?: AccountProfile | null;
  updatedAt: string;
};

type CtaForm = {
  id: string;
  accountProfileId: string;
  title: string;
  category: string;
  entry: string;
  content: string;
  tags: string;
};

const entryLabels: Record<string, string> = {
  all: "全部入口",
  wechat_article: "公众号",
  green_note: "小绿书",
  search: "搜一搜",
  question: "问一问",
  moments: "朋友圈",
};

const emptyForm: CtaForm = {
  id: "",
  accountProfileId: "",
  title: "",
  category: "资料包领取",
  entry: "",
  content: "",
  tags: "",
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}

function parseTags(value: string) {
  return value
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function CtaLibraryWorkbench() {
  const [snippets, setSnippets] = useState<CtaSnippet[]>([]);
  const [profiles, setProfiles] = useState<AccountProfile[]>([]);
  const [form, setForm] = useState<CtaForm>(emptyForm);
  const [query, setQuery] = useState("");
  const [entryFilter, setEntryFilter] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (entryFilter) params.set("entry", entryFilter);
      const [snippetData, profileData] = await Promise.all([
        fetch(`/api/cta-snippets?${params.toString()}`).then((response) => readJson<{ snippets: CtaSnippet[] }>(response)),
        fetch("/api/account-profiles").then((response) => readJson<{ profiles: AccountProfile[] }>(response)),
      ]);
      setSnippets(snippetData.snippets);
      setProfiles(profileData.profiles);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载 CTA 库失败。");
    } finally {
      setLoading(false);
    }
  }, [entryFilter, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  function edit(snippet: CtaSnippet) {
    setForm({
      id: snippet.id,
      accountProfileId: snippet.accountProfileId || "",
      title: snippet.title,
      category: snippet.category,
      entry: snippet.entry || "",
      content: snippet.content,
      tags: snippet.tags.join("，"),
    });
  }

  async function save() {
    try {
      const payload = {
        accountProfileId: form.accountProfileId || null,
        title: form.title,
        category: form.category,
        entry: form.entry || null,
        content: form.content,
        tags: parseTags(form.tags),
      };
      const url = form.id ? `/api/cta-snippets/${form.id}` : "/api/cta-snippets";
      const method = form.id ? "PATCH" : "POST";
      await readJson<{ snippet: CtaSnippet }>(
        await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );
      setMessage(form.id ? "CTA 已更新。" : "CTA 已保存。");
      setForm(emptyForm);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存 CTA 失败。");
    }
  }

  async function remove(id: string) {
    try {
      await fetch(`/api/cta-snippets/${id}`, { method: "DELETE" });
      setMessage("CTA 已归档。");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "归档 CTA 失败。");
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setMessage("CTA 已复制到剪贴板。");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">变现 CTA 库</h1>
          <p className="mt-1 text-sm text-slate-600">沉淀资料包、咨询、课程、社群和私域成交话术，生成内容时可复用。</p>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}>
          <RefreshCcw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div> : null}

      <Card>
        <CardHeader>
          <CardTitle>{form.id ? "编辑 CTA" : "新增 CTA"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">标题</span>
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">分类</span>
              <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">账号档案</span>
              <select value={form.accountProfileId} onChange={(event) => setForm({ ...form, accountProfileId: event.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400">
                <option value="">通用</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">适用入口</span>
              <select value={form.entry} onChange={(event) => setForm({ ...form, entry: event.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400">
                <option value="">全部入口</option>
                {Object.entries(entryLabels)
                  .filter(([key]) => key !== "all")
                  .map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <textarea
            value={form.content}
            onChange={(event) => setForm({ ...form, content: event.target.value })}
            className="min-h-28 w-full rounded-lg border border-slate-200 p-4 outline-none focus:border-emerald-400"
            placeholder="例如：如果你也想把公众号副业从零跑起来，可以私信我关键词「起号」，我把一页起步清单发你。"
          />
          <label className="block space-y-1 text-sm">
            <span className="text-slate-600">标签</span>
            <input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="资料包，咨询，私域" className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
          </label>
          <div className="flex justify-end gap-2">
            {form.id ? (
              <Button variant="secondary" onClick={() => setForm(emptyForm)}>
                取消编辑
              </Button>
            ) : null}
            <Button onClick={save} disabled={form.title.trim().length < 1 || form.content.trim().length < 1}>
              <Save className="size-4" />
              保存 CTA
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-[1fr_180px_120px]">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、分类或话术" className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
        <select value={entryFilter} onChange={(event) => setEntryFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400">
          <option value="">全部入口</option>
          {Object.entries(entryLabels)
            .filter(([key]) => key !== "all")
            .map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
        </select>
        <Button variant="secondary" onClick={load}>
          筛选
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {snippets.map((snippet) => (
          <Card key={snippet.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{snippet.title}</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  {snippet.category} · {entryLabels[snippet.entry || "all"]} · {snippet.accountProfile?.name || "通用"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button className="h-9 w-9 px-0" size="sm" variant="secondary" onClick={() => copy(snippet.content)} title="复制">
                  <Copy className="size-4" />
                </Button>
                <Button className="h-9 w-9 px-0" size="sm" variant="secondary" onClick={() => remove(snippet.id)} title="归档">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{snippet.content}</p>
              <div className="flex flex-wrap gap-2">
                {snippet.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex justify-end">
                <Button size="sm" variant="secondary" onClick={() => edit(snippet)}>
                  编辑
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!snippets.length && !message ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="font-medium text-slate-800">还没有 CTA</p>
          <p className="mt-1 text-sm text-slate-500">先保存一条资料包、咨询或社群引导话术。</p>
        </div>
      ) : null}
    </div>
  );
}
