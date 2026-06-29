import { getDefaultAiProvider } from "@/lib/ai/provider";

export async function GET() {
  const provider = getDefaultAiProvider();

  return Response.json({
    provider: {
      type: provider.type,
      name: provider.name,
      baseUrlConfigured: Boolean(provider.baseUrl),
      apiKeyConfigured: Boolean(provider.apiKey),
      model: provider.model,
    },
    status: "placeholder",
    message: "首版预留 OpenAI-compatible 中转站配置，不在接口中返回密钥明文。",
  });
}

