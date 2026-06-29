"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, Save, Sparkles } from "lucide-react";

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

  useEffect(() => {
    fetch("/api/account-profiles")
      .then((response) => readJson<{ profiles: AccountProfile[] }>(response))
      .then((data) => {
        setProfiles(data.profiles);
        setAccountProfileId((current) => current || data.profiles[0]?.id || "");
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  const activeVariant = useMemo(
    () => result?.project.variants.find((variant) => variant.entry === activeEntry),
    [activeEntry, result],
  );

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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成失败。");
    } finally {
      setLoading(false);
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
            <Button onClick={submit} disabled={loading || topic.trim().length < 2}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              生成五入口内容
            </Button>
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
            {activeVariant ? (
              <Button variant="secondary" onClick={() => copyText(`${activeVariant.title}\n\n${activeVariant.body}`)}>
                <Copy className="size-4" />
                复制
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {activeVariant ? (
              <pre className="min-h-80 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-7 text-slate-700">{activeVariant.body}</pre>
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
    </div>
  );
}
