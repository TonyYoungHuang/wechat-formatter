"use client";

import { useEffect, useState } from "react";
import { BookOpen, Copy, PencilLine, Plus, Star, Trash2, X } from "lucide-react";

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
  knowledgeItems?: AccountKnowledgeItem[];
};

type AccountKnowledgeItem = {
  id: string;
  title: string;
  sourceType: string;
  content: string;
  tags: string[];
  active: boolean;
  updatedAt: string;
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

const initialKnowledgeForm = {
  title: "",
  sourceType: "wechat_article",
  content: "",
  tags: "",
  active: true,
};

const knowledgeSourceLabels: Record<string, string> = {
  wechat_article: "公众号旧文",
  product: "产品/服务",
  case: "案例/经历",
  audience: "读者反馈",
  viewpoint: "常用观点",
  note: "其他笔记",
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
  const [selectedKnowledgeProfileId, setSelectedKnowledgeProfileId] = useState("");
  const [knowledgeForm, setKnowledgeForm] = useState(initialKnowledgeForm);
  const [editingKnowledgeId, setEditingKnowledgeId] = useState("");
  const [editingProfileId, setEditingProfileId] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const data = await readJson<{ profiles: AccountProfile[] }>(await fetch("/api/account-profiles"));
      setProfiles(data.profiles);
      setSelectedKnowledgeProfileId((current) => current || data.profiles[0]?.id || "");
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
        setSelectedKnowledgeProfileId((current) => current || data.profiles[0]?.id || "");
        setMessage("");
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  function update(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateKnowledge(key: keyof typeof initialKnowledgeForm, value: string | boolean) {
    setKnowledgeForm((current) => ({ ...current, [key]: value }));
  }

  function editProfile(profile: AccountProfile) {
    setEditingProfileId(profile.id);
    setForm({
      name: profile.name,
      type: profile.type,
      niche: profile.niche,
      persona: profile.persona,
      audience: profile.audience,
      audiencePainPoints: profile.audiencePainPoints,
      productOrService: profile.productOrService,
      monetizationMethods: profile.monetizationMethods.join("，"),
      tone: profile.tone,
      commonCta: profile.commonCta,
      forbiddenWords: profile.forbiddenWords.join("，"),
      sampleText: profile.sampleText || "",
    });
    setMessage(`正在编辑：${profile.name}`);
  }

  function cancelEdit() {
    setEditingProfileId("");
    setForm(initialForm);
    setMessage("");
  }

  async function saveProfile() {
    const payload = {
      ...form,
      monetizationMethods: splitList(form.monetizationMethods),
      forbiddenWords: splitList(form.forbiddenWords),
    };

    try {
      await readJson<{ profile: AccountProfile }>(
        await fetch(editingProfileId ? `/api/account-profiles/${editingProfileId}` : "/api/account-profiles", {
          method: editingProfileId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingProfileId ? payload : { ...payload, isDefault: profiles.length === 0 }),
        }),
      );
      setEditingProfileId("");
      setForm(initialForm);
      setMessage(editingProfileId ? "账号档案已更新。" : "账号档案已保存。");
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

  const selectedKnowledgeProfile = profiles.find((profile) => profile.id === selectedKnowledgeProfileId) || profiles[0];
  const selectedKnowledgeItems = selectedKnowledgeProfile?.knowledgeItems || [];

  function editKnowledge(item: AccountKnowledgeItem) {
    setEditingKnowledgeId(item.id);
    setKnowledgeForm({
      title: item.title,
      sourceType: item.sourceType,
      content: item.content,
      tags: item.tags.join("，"),
      active: item.active,
    });
    setMessage(`正在编辑知识：${item.title}`);
  }

  function cancelKnowledgeEdit() {
    setEditingKnowledgeId("");
    setKnowledgeForm(initialKnowledgeForm);
  }

  async function saveKnowledge() {
    if (!selectedKnowledgeProfile) {
      setMessage("请先创建账号档案。");
      return;
    }

    const payload = {
      ...knowledgeForm,
      tags: splitList(knowledgeForm.tags),
    };

    try {
      await readJson<{ item: AccountKnowledgeItem }>(
        await fetch(
          editingKnowledgeId
            ? `/api/account-profiles/${selectedKnowledgeProfile.id}/knowledge/${editingKnowledgeId}`
            : `/api/account-profiles/${selectedKnowledgeProfile.id}/knowledge`,
          {
            method: editingKnowledgeId ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        ),
      );
      setEditingKnowledgeId("");
      setKnowledgeForm(initialKnowledgeForm);
      setMessage("账号知识库已更新。");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存知识失败。");
    }
  }

  async function toggleKnowledge(item: AccountKnowledgeItem) {
    if (!selectedKnowledgeProfile) return;

    try {
      await readJson(
        await fetch(`/api/account-profiles/${selectedKnowledgeProfile.id}/knowledge/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: !item.active }),
        }),
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新知识状态失败。");
    }
  }

  async function removeKnowledge(item: AccountKnowledgeItem) {
    if (!selectedKnowledgeProfile) return;

    try {
      await readJson(
        await fetch(`/api/account-profiles/${selectedKnowledgeProfile.id}/knowledge/${item.id}`, {
          method: "DELETE",
        }),
      );
      setMessage("知识已删除。");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除知识失败。");
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{editingProfileId ? "编辑账号档案" : "新建账号档案"}</CardTitle>
            {editingProfileId ? (
              <Button size="sm" variant="secondary" onClick={cancelEdit}>
                <X className="size-4" />
                取消编辑
              </Button>
            ) : null}
          </div>
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
            <Button onClick={saveProfile} disabled={!form.name || !form.niche || !form.persona || !form.audience || !form.audiencePainPoints}>
              {editingProfileId ? <PencilLine className="size-4" /> : <Plus className="size-4" />}
              {editingProfileId ? "更新档案" : "保存档案"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="size-5 text-emerald-700" />
                账号知识库
              </CardTitle>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                把公众号旧文、产品介绍、真实案例、常用观点和读者反馈放进来。生成内容时，排版猫会优先参考这些资料，让文案更像客户自己的账号。
              </p>
            </div>
            <select
              value={selectedKnowledgeProfile?.id || ""}
              onChange={(event) => {
                setSelectedKnowledgeProfileId(event.target.value);
                cancelKnowledgeEdit();
              }}
              className="h-10 rounded-lg border border-emerald-200 bg-white px-3 text-sm outline-none focus:border-emerald-400"
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profiles.length ? (
            <>
              <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
                <label className="space-y-1 text-sm">
                  <span className="text-slate-600">资料标题</span>
                  <input value={knowledgeForm.title} onChange={(event) => updateKnowledge("title", event.target.value)} placeholder="例如：我的公众号爆款文章开头写法" className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-slate-600">资料类型</span>
                  <select value={knowledgeForm.sourceType} onChange={(event) => updateKnowledge("sourceType", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400">
                    {Object.entries(knowledgeSourceLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block space-y-1 text-sm">
                <span className="text-slate-600">资料正文</span>
                <textarea value={knowledgeForm.content} onChange={(event) => updateKnowledge("content", event.target.value)} placeholder="粘贴公众号旧文片段、产品说明、真实案例、常讲观点、读者反馈等。" className="min-h-36 w-full rounded-lg border border-slate-200 px-3 py-2 leading-6 outline-none focus:border-emerald-400" />
              </label>
              <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                <label className="space-y-1 text-sm">
                  <span className="text-slate-600">标签</span>
                  <input value={knowledgeForm.tags} onChange={(event) => updateKnowledge("tags", event.target.value)} placeholder="逗号分隔，例如：开头，转化，读者痛点" className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveKnowledge} disabled={!knowledgeForm.title.trim() || knowledgeForm.content.trim().length < 10}>
                    {editingKnowledgeId ? <PencilLine className="size-4" /> : <Plus className="size-4" />}
                    {editingKnowledgeId ? "更新知识" : "添加知识"}
                  </Button>
                  {editingKnowledgeId ? <Button variant="secondary" onClick={cancelKnowledgeEdit}>取消</Button> : null}
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {selectedKnowledgeItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-950">{item.title}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {knowledgeSourceLabels[item.sourceType] || item.sourceType} · {item.active ? "已启用" : "已停用"} · {new Date(item.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs ${item.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {item.active ? "参与生成" : "不参与"}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-3 leading-6 text-slate-600">{item.content}</p>
                    {item.tags.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-white px-2 py-1 text-xs text-slate-500">{tag}</span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => editKnowledge(item)}>
                        <PencilLine className="size-4" />
                        编辑
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => toggleKnowledge(item)}>
                        {item.active ? "停用" : "启用"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeKnowledge(item)}>
                        <Trash2 className="size-4" />
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
                {!selectedKnowledgeItems.length ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600 lg:col-span-2">
                    当前账号还没有知识。先粘贴 1-3 篇公众号旧文片段，或者产品介绍、常用观点，生成内容会更贴近这个账号。
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">请先创建一个账号档案，再添加知识库。</div>
          )}
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
                  <Button size="sm" variant="secondary" onClick={() => editProfile(profile)}>
                    <PencilLine className="size-4" />
                    编辑
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
