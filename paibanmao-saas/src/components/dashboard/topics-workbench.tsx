"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Plus, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AccountProfile = {
  id: string;
  name: string;
  niche: string;
};

type Topic = {
  id: string;
  accountProfileId: string;
  title: string;
  reason: string;
  status: string;
  entries: string[];
  goals: string[];
  accountProfile?: AccountProfile;
  _count?: { projects: number };
};

type Suggestion = {
  title: string;
  reason: string;
  entries: string[];
  goals: string[];
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

export function TopicsWorkbench() {
  const [profiles, setProfiles] = useState<AccountProfile[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [accountProfileId, setAccountProfileId] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [theme, setTheme] = useState("公众号副业");
  const [monetizationGoal, setMonetizationGoal] = useState("资料包和咨询转化");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      const [profileData, topicData] = await Promise.all([
        fetch("/api/account-profiles").then((response) => readJson<{ profiles: AccountProfile[] }>(response)),
        fetch("/api/topics").then((response) => readJson<{ topics: Topic[] }>(response)),
      ]);
      setProfiles(profileData.profiles);
      setTopics(topicData.topics);
      setAccountProfileId((current) => current || profileData.profiles[0]?.id || "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载选题失败。");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function createTopic(title: string, reason = "手动保存的选题。") {
    if (!accountProfileId) {
      setMessage("请先创建或选择账号档案。");
      return;
    }

    try {
      await readJson<{ topic: Topic }>(
        await fetch("/api/topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountProfileId,
            title,
            reason,
            goals: ["growth"],
            entries: ["wechat_article", "green_note", "search", "question", "moments"],
          }),
        }),
      );
      setManualTitle("");
      setMessage("选题已保存。");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败。");
    }
  }

  async function generateSuggestions() {
    if (!accountProfileId) {
      setMessage("请先创建或选择账号档案。");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const data = await readJson<{ suggestions: Suggestion[] }>(
        await fetch("/api/topics/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountProfileId, theme, monetizationGoal, count: 6 }),
        }),
      );
      setSuggestions(data.suggestions);
      setMessage("已生成选题建议，可逐条保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成失败。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">选题库</h1>
          <p className="mt-1 text-sm text-slate-600">保存可复用的微信内容选题，并一键进入五入口生成器。</p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/dashboard/account-profiles">管理账号档案</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>生成或保存选题</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[220px_1fr_1fr]">
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">账号档案</span>
            <select
              value={accountProfileId}
              onChange={(event) => setAccountProfileId(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400"
            >
              <option value="">请选择</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">本周主题</span>
            <input value={theme} onChange={(event) => setTheme(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">变现目标</span>
            <input value={monetizationGoal} onChange={(event) => setMonetizationGoal(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
          </label>
          <div className="flex flex-col gap-3 lg:col-span-3 sm:flex-row sm:items-center">
            <input
              value={manualTitle}
              onChange={(event) => setManualTitle(event.target.value)}
              placeholder="手动输入一个选题"
              className="h-10 flex-1 rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400"
            />
            <Button variant="secondary" onClick={() => createTopic(manualTitle)} disabled={manualTitle.trim().length < 2}>
              <Plus className="size-4" />
              保存选题
            </Button>
            <Button onClick={generateSuggestions} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
              AI 生成建议
            </Button>
          </div>
          {message ? <p className="text-sm text-slate-500 lg:col-span-3">{message}</p> : null}
        </CardContent>
      </Card>

      {suggestions.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {suggestions.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>{item.reason}</p>
                <div className="flex flex-wrap gap-2">
                  {item.entries.map((entry) => (
                    <span key={entry} className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                      {entryLabels[entry] || entry}
                    </span>
                  ))}
                </div>
                <Button size="sm" variant="secondary" onClick={() => createTopic(item.title, item.reason)}>
                  保存到选题库
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        {topics.map((topic) => (
          <div key={topic.id} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_160px_180px] lg:items-center">
            <div>
              <div className="font-medium text-slate-950">{topic.title}</div>
              <div className="mt-1 text-sm text-slate-500">{topic.reason || "暂无推荐理由"}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{topic.accountProfile?.name || "账号档案"}</span>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">{topic.status}</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{topic._count?.projects ?? 0} 个项目</span>
              </div>
            </div>
            <div className="text-sm text-slate-500">{topic.entries.length} 个入口</div>
            <Button asChild size="sm">
              <Link href={`/dashboard/generate?topicId=${topic.id}&accountProfileId=${topic.accountProfileId}&topic=${encodeURIComponent(topic.title)}`}>进入生成</Link>
            </Button>
          </div>
        ))}
        {!topics.length ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">还没有选题。先生成一组选题建议，或者手动保存一个选题。</div>
        ) : null}
      </div>
    </div>
  );
}
