"use client";

import { useEffect, useState } from "react";
import { Save, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProviderStatus = {
  provider: {
    type: string;
    name: string;
    baseUrlConfigured: boolean;
    apiKeyConfigured: boolean;
    model: string;
  };
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}

export function SettingsWorkbench() {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [name, setName] = useState("default-router");
  const [baseUrl, setBaseUrl] = useState("https://example-model-router.com/v1");
  const [apiKeyRef, setApiKeyRef] = useState("AI_OPENAI_COMPATIBLE_API_KEY");
  const [modelName, setModelName] = useState("GPT compatible model");
  const [modelId, setModelId] = useState("gpt-4.1-mini");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const data = await readJson<ProviderStatus>(await fetch("/api/admin/ai-providers"));
      setStatus(data);
      setName(data.provider.name || "default-router");
      setModelId(data.provider.model || "gpt-4.1-mini");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载配置失败。");
    }
  }

  useEffect(() => {
    fetch("/api/admin/ai-providers")
      .then((response) => readJson<ProviderStatus>(response))
      .then((data) => {
        setStatus(data);
        setName(data.provider.name || "default-router");
        setModelId(data.provider.model || "gpt-4.1-mini");
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  async function save() {
    try {
      await readJson(
        await fetch("/api/admin/ai-providers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            type: "openai-compatible",
            baseUrl,
            apiKeyRef,
            active: true,
            models: [{ name: modelName, modelId, purpose: "content", active: true }],
          }),
        }),
      );
      setMessage("模型中转站配置已保存。");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败。");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">设置</h1>
        <p className="mt-1 text-sm text-slate-600">管理模型中转站、价格额度入口和支付参数占位。</p>
      </div>

      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div> : null}

      <Card>
        <CardHeader>
          <CardTitle>OpenAI-compatible 模型中转站</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">配置名称</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">API Key 环境变量名</span>
              <input value={apiKeyRef} onChange={(event) => setApiKeyRef(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-slate-600">Base URL</span>
              <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">模型名称</span>
              <input value={modelName} onChange={(event) => setModelName(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">模型 ID</span>
              <input value={modelId} onChange={(event) => setModelId(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
            </label>
          </div>
          <div className="flex flex-col gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              当前环境变量状态：Base URL {status?.provider.baseUrlConfigured ? "已配置" : "未配置"}，API Key {status?.provider.apiKeyConfigured ? "已配置" : "未配置"}
            </span>
            <Button onClick={save}>
              <Save className="size-4" />
              保存模型配置
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>支付与商业化参数</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
          {["WECHAT_PAY_APP_ID", "WECHAT_PAY_MCH_ID", "WECHAT_PAY_API_V3_KEY", "ALIPAY_APP_ID", "ALIPAY_PRIVATE_KEY_PEM", "ALIPAY_PUBLIC_KEY_PEM"].map((key) => (
            <div key={key} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <Settings2 className="size-4 text-emerald-600" />
              <span>{key}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
