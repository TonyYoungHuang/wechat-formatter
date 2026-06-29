import { prisma } from "@/lib/db/prisma";

export type AiProviderConfig = {
  type: "openai-compatible";
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  modelName: string;
  apiKeyRef: string;
  source: "database" | "environment";
};

export function getDefaultAiProvider(): AiProviderConfig {
  const model = process.env.AI_DEFAULT_MODEL || "gpt-4.1-mini";

  return {
    type: "openai-compatible",
    name: process.env.AI_DEFAULT_PROVIDER || "openai-compatible",
    baseUrl: process.env.AI_OPENAI_COMPATIBLE_BASE_URL || "",
    apiKey: process.env.AI_OPENAI_COMPATIBLE_API_KEY || "",
    model,
    modelName: model,
    apiKeyRef: "AI_OPENAI_COMPATIBLE_API_KEY",
    source: "environment",
  };
}

export function assertAiProviderReady(config = getDefaultAiProvider()) {
  if (!config.baseUrl || !config.apiKey || !config.model) {
    throw new Error("AI provider is not configured.");
  }
}

export async function getActiveAiProvider(purpose = "content"): Promise<AiProviderConfig> {
  try {
    const provider = await prisma.aiProvider.findFirst({
      where: {
        active: true,
        type: "openai-compatible",
      },
      include: {
        models: {
          where: { active: true },
          orderBy: { updatedAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const model = provider?.models.find((item) => item.purpose === purpose) ?? provider?.models[0];

    if (provider && model) {
      return {
        type: "openai-compatible",
        name: provider.name,
        baseUrl: provider.baseUrl,
        apiKey: process.env[provider.apiKeyRef] || "",
        model: model.modelId,
        modelName: model.name,
        apiKeyRef: provider.apiKeyRef,
        source: "database",
      };
    }
  } catch {
    return getDefaultAiProvider();
  }

  return getDefaultAiProvider();
}

export async function getAiProviderStatus(purpose = "content") {
  const provider = await getActiveAiProvider(purpose);

  return {
    provider: {
      type: provider.type,
      name: provider.name,
      baseUrl: provider.baseUrl,
      baseUrlConfigured: Boolean(provider.baseUrl),
      apiKeyConfigured: Boolean(provider.apiKey),
      apiKeyRef: provider.apiKeyRef,
      model: provider.model,
      modelName: provider.modelName,
      source: provider.source,
    },
    status: provider.source,
    message:
      provider.source === "database"
        ? "OpenAI-compatible provider is loaded from the saved admin configuration; API keys are never returned here."
        : "OpenAI-compatible provider is loaded from environment fallback; API keys are never returned here.",
  };
}
