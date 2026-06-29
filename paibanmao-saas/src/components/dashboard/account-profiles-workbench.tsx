"use client";

import { useEffect, useState } from "react";
import { Copy, Plus, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AccountProfile = {
  id: string;
  name: string;
  type: string;
  niche: string;
  persona: string;
  audience: string;
  audiencePainPoints: string;
  productOrService: string;
  monetizationMethods: string[];
  tone: string;
  commonCta: string;
  forbiddenWords: string[];
  sampleText?: string | null;
  isDefault: boolean;
};

type FormState = {
  name: string;
  type: string;
  niche: string;
  persona: string;
  audience: string;
  audiencePainPoints: string;
  productOrService: string;
  monetizationMethods: string;
  tone: string;
  commonCta: string;
  forbiddenWords: string;
  sampleText: string;
};

const initialForm: FormState = {
  name: "",
  type: "wechat_official",
  niche: "",
  persona: "",
  audience: "",
  audiencePainPoints: "",
  productOrService: "",
  monetizationMethods: "",
  tone: "自然、直接、有陪伴感",
  commonCta: "",
  forbiddenWords: "",
  sampleText: "",
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}

function splitList(value: string) {
  return value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function profileCompleteness(profile: AccountProfile) {
  const fields = [
    profile.name,
    profile.niche,
    profile.persona,
    profile.audience,
    profile.audiencePainPoints,
    profile.productOrService,
    profile.tone,
    profile.commonCta,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

export function AccountProfilesWorkbench() {
  const [profiles, setProfiles] = useState<AccountProfile[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const data = await readJson<{ profiles: AccountProfile[] }>(await fetch("/api/account-profiles"));
      setProfiles(data.profiles);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载账号档案失败。");
    }
  }

  useEffect(() => {
    fetch("/api/account-profiles")
      .then((response) => readJson<{ profiles: AccountProfile[] }>(response))
      .then((data) => {
        setProfiles(data.profiles);
        setMessage("");
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  function update(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function createProfile() {
    try {
      await readJson<{ profile: AccountProfile }>(
        await fetch("/api/account-profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            monetizationMethods: splitList(form.monetizationMethods),
            forbiddenWords: splitList(form.forbiddenWords),
            isDefault: profiles.length === 0,
          }),
        }),
      );
      setForm(initialForm);
      setMessage("账号档案已保存。");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败。");
    }
  }

  async function duplicateProfile(id: string) {
    try {
      await readJson(await fetch(`/api/account-profiles/${id}/duplicate`, { method: "POST" }));
      setMessage("已复制账号档案。");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "复制失败。");
    }
  }

  async function setDefault(id: string) {
    try {
      await readJson(await fetch(`/api/account-profiles/${id}/set-default`, { method: "POST" }));
      setMessage("已设为默认档案。");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "设置失败。");
    }
  }

  async function removeProfile(id: string) {
    try {
      const response = await fetch(`/api/account-profiles/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Delete failed.");
      }
      setMessage("账号档案已删除。");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败。");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">账号档案</h1>
          <p className="mt-1 text-sm text-slate-600">为每个公众号、副业项目或问一问身份保存独立定位，生成内容时会自动带入。</p>
        </div>
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{profiles.length} 个档案</div>
      </div>

      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div> : null}

      <Card>
        <CardHeader>
          <CardTitle>新建账号档案</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">账号名称</span>
              <input value={form.name} onChange={(event) => update("name", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">账号类型</span>
              <select value={form.type} onChange={(event) => update("type", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400">
                <option value="wechat_official">公众号</option>
                <option value="green_note">小绿书方向</option>
                <option value="question_host">问一问身份</option>
                <option value="personal_ip">个人 IP</option>
                <option value="local_business">本地商家</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">内容领域</span>
              <input value={form.niche} onChange={(event) => update("niche", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">目标读者</span>
              <input value={form.audience} onChange={(event) => update("audience", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">产品/服务</span>
              <input value={form.productOrService} onChange={(event) => update("productOrService", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">变现方式</span>
              <input value={form.monetizationMethods} onChange={(event) => update("monetizationMethods", event.target.value)} placeholder="资料包，咨询，课程" className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
            </label>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">人设描述</span>
              <textarea value={form.persona} onChange={(event) => update("persona", event.target.value)} className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-400" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">读者痛点</span>
              <textarea value={form.audiencePainPoints} onChange={(event) => update("audiencePainPoints", event.target.value)} className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-400" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">语气风格</span>
              <textarea value={form.tone} onChange={(event) => update("tone", event.target.value)} className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-400" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">常用 CTA</span>
              <textarea value={form.commonCta} onChange={(event) => update("commonCta", event.target.value)} className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-400" />
            </label>
            <label className="space-y-1 text-sm lg:col-span-2">
              <span className="text-slate-600">禁用词 / 禁用表达</span>
              <input value={form.forbiddenWords} onChange={(event) => update("forbiddenWords", event.target.value)} placeholder="逗号分隔，例如：暴富，稳赚，唯一" className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
            </label>
          </div>
          <div className="flex justify-end">
            <Button onClick={createProfile} disabled={!form.name || !form.niche || !form.persona || !form.audience || !form.audiencePainPoints}>
              <Plus className="size-4" />
              保存档案
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {profiles.map((profile) => {
          const completeness = profileCompleteness(profile);
          return (
            <Card key={profile.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{profile.name}</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">{profile.niche} · {profile.audience}</p>
                </div>
                {profile.isDefault ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">默认</span> : null}
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600">
                <p>{profile.persona}</p>
                <div>
                  <div className="mb-2 flex justify-between text-xs">
                    <span>档案完整度</span>
                    <span>{completeness}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-emerald-100">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${completeness}%` }} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.monetizationMethods.map((item) => (
                    <span key={item} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{item}</span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setDefault(profile.id)}>
                    <Star className="size-4" />
                    设为默认
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => duplicateProfile(profile.id)}>
                    <Copy className="size-4" />
                    复制
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeProfile(profile.id)}>
                    <Trash2 className="size-4" />
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
