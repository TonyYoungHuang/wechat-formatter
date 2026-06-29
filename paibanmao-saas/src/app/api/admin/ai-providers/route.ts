import { NextResponse } from "next/server";
import { getDefaultAiProvider } from "@/lib/ai/provider";

export async function GET() {
  const provider = getDefaultAiProvider();

  return NextResponse.json({
    provider: {
      type: provider.type,
      name: provider.name,
      baseUrlConfigured: Boolean(provider.baseUrl),
      apiKeyConfigured: Boolean(provider.apiKey),
      model: provider.model,
    },
    status: "placeholder",
    message: "OpenAI-compatible provider configuration is reserved; API keys are never returned here.",
  });
}
