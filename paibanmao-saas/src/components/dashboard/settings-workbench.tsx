"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProviderStatus = {
  provider: {
    type: string;
    name: string;
    baseUrlConfigured: boolean;
    apiKeyConfigured: boolean;
    baseUrl: string;
    apiKeyRef: string;
    model: string;
    modelName: string;
    source: "database" | "environment";
  };
};

type PromptConfig = {
  key: string;
  version: number;
  content: string;
  active: boolean;
  source: string;
};

type PaymentEnvVar = {
  key: string;
  configured: boolean;
  purpose: string;
};

type PaymentProviderConfig = {
  provider: "wechat" | "alipay";
  label: string;
  checkoutMode: string;
  ready: boolean;
  callbackReady: boolean;
  checkoutUrl: string;
  callbackUrl: string;
  required: PaymentEnvVar[];
  callbackRequired: PaymentEnvVar[];
  optional: PaymentEnvVar[];
};

type PaymentConfigStatus = {
  appUrl: string;
  productionReady: boolean;
  message: string;
  providers: PaymentProviderConfig[];
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
  const [paymentStatus, setPaymentStatus] = useState<PaymentConfigStatus | null>(null);
  const [prompts, setPrompts] = useState<PromptConfig[]>([]);
  const [name, setName] = useState("default-router");
  const [baseUrl, setBaseUrl] = useState("https://example-model-router.com/v1");
  const [apiKeyRef, setApiKeyRef] = useState("AI_OPENAI_COMPATIBLE_API_KEY");
  const [modelName, setModelName] = useState("GPT compatible model");
  const [modelId, setModelId] = useState("gpt-4.1-mini");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const [providerData, promptData, paymentData] = await Promise.all([
        fetch("/api/admin/ai-providers").then((response) => readJson<ProviderStatus>(response)),
        fetch("/api/admin/prompts").then((response) => readJson<{ prompts: PromptConfig[] }>(response)),
        fetch("/api/admin/payment-settings").then((response) => readJson<PaymentConfigStatus>(response)),
      ]);
      setStatus(providerData);
      setName(providerData.provider.name || "default-router");
      setBaseUrl(providerData.provider.baseUrl || "https://example-model-router.com/v1");
      setApiKeyRef(providerData.provider.apiKeyRef || "AI_OPENAI_COMPATIBLE_API_KEY");
      setModelName(providerData.provider.modelName || "GPT compatible model");
      setModelId(providerData.provider.model || "gpt-4.1-mini");
      setPrompts(promptData.prompts);
      setPaymentStatus(paymentData);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载配置失败。");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function saveProvider() {
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

  function updatePrompt(key: string, content: string) {
    setPrompts((items) => items.map((item) => (item.key === key ? { ...item, content } : item)));
  }

  async function savePrompt(prompt: PromptConfig) {
    try {
      await readJson(
        await fetch("/api/admin/prompts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompts: {
              [prompt.key]: {
                content: prompt.content,
                active: true,
              },
            },
          }),
        }),
      );
      setMessage(`${prompt.key} 模板已保存为新版本。`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存 Prompt 模板失败。");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">设置</h1>
        <p className="mt-1 text-sm text-slate-600">管理模型中转站、Prompt 模板、价格额度入口和支付配置状态。</p>
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
            <Button onClick={saveProvider}>
              <Save className="size-4" />
              保存模型配置
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prompt 模板版本</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {prompts.map((prompt) => (
            <div key={prompt.key} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-slate-950">{prompt.key}</div>
                  <div className="text-xs text-slate-500">当前版本：v{prompt.version} · 来源：{prompt.source}</div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => savePrompt(prompt)}>
                  <Save className="size-4" />
                  保存新版本
                </Button>
              </div>
              <textarea value={prompt.content} onChange={(event) => updatePrompt(prompt.key, event.target.value)} className="min-h-40 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6 outline-none focus:border-emerald-400" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>支付与商业化参数</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-slate-950">当前站点地址：{paymentStatus?.appUrl || "加载中"}</p>
                <p className="mt-1 text-xs text-slate-500">{paymentStatus?.message || "正在读取支付环境变量状态。"}</p>
              </div>
              <StatusPill ready={Boolean(paymentStatus?.productionReady)} label={paymentStatus?.productionReady ? "生产配置已就绪" : "仍有缺失项"} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {paymentStatus?.providers.map((provider) => (
              <div key={provider.provider} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-950">{provider.label}</h2>
                    <p className="mt-1 text-xs text-slate-500">{provider.checkoutMode}</p>
                  </div>
                  <div className="flex gap-2">
                    <StatusPill ready={provider.ready} label={provider.ready ? "下单就绪" : "下单缺配置"} />
                    <StatusPill ready={provider.callbackReady} label={provider.callbackReady ? "回调就绪" : "回调缺配置"} />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <ConfigGroup title="下单必填" items={provider.required} />
                  <ConfigGroup title="回调验签" items={provider.callbackRequired} />
                  <ConfigGroup title="可选配置" items={provider.optional} />
                </div>

                <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3 text-xs">
                  <p className="break-all">
                    <span className="font-medium text-slate-700">下单接口：</span>
                    {provider.checkoutUrl}
                  </p>
                  <p className="break-all">
                    <span className="font-medium text-slate-700">回调地址：</span>
                    {provider.callbackUrl}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusPill({ ready, label }: { ready: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
      {ready ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
      {label}
    </span>
  );
}

function ConfigGroup({ title, items }: { title: string; items: PaymentEnvVar[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-slate-500">{title}</p>
      <div className="grid gap-2">
        {items.map((item) => (
          <div key={`${title}-${item.key}`} className="flex items-start gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2">
            {item.configured ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />}
            <div className="min-w-0">
              <p className="font-medium text-slate-800">{item.key}</p>
              <p className="mt-0.5 leading-5 text-slate-500">{item.purpose}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
