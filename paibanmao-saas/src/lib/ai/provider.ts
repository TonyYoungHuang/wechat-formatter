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
  const model = process.env.REQUESTY_TEXT_MODEL || process.env.AI_DEFAULT_MODEL || "openai/gpt-4o-mini";

  return {
    type: "openai-compatible",
    name: process.env.AI_DEFAULT_PROVIDER || "requesty",
    baseUrl: process.env.REQUESTY_BASE_URL || process.env.AI_OPENAI_COMPATIBLE_BASE_URL || "https://router.requesty.ai/v1",
    apiKey: process.env.REQUESTY_API_KEY || process.env.AI_OPENAI_COMPATIBLE_API_KEY || "",
    model,
    modelName: model,
    apiKeyRef: process.env.REQUESTY_API_KEY ? "REQUESTY_API_KEY" : "AI_OPENAI_COMPATIBLE_API_KEY",
    source: "environment",
  };
}

export function assertAiProviderReady(config = getDefaultAiProvider()) {
  if (!config.baseUrl || !config.apiKey || !config.model) {
    throw new Error("AI provider is not configured.");
  }
}

export async function getActiveAiProvider(purpose = "content"): Promise<AiProviderConfig> {
  const [candidate] = await getAiProviderCandidates(purpose);
  return candidate ?? getDefaultAiProvider();
}

export async function getAiProviderCandidates(purpose = "content"): Promise<AiProviderConfig[]> {
  const candidates: AiProviderConfig[] = [];

  try {
    const providers = await prisma.aiProvider.findMany({
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

    for (const provider of providers) {
      const preferredModels = provider.models.filter((model) => model.purpose === purpose);
      const fallbackModels = provider.models.filter((model) => model.purpose !== purpose);

      for (const model of [...preferredModels, ...fallbackModels]) {
        candidates.push({
          type: "openai-compatible",
          name: provider.name,
          baseUrl: provider.baseUrl,
          apiKey: process.env[provider.apiKeyRef] || "",
          model: model.modelId,
          modelName: model.name,
          apiKeyRef: provider.apiKeyRef,
          source: "database",
        });
      }
    }
  } catch {
    return [getDefaultAiProvider()];
  }

  const environmentFallback = getDefaultAiProvider();
  const hasSameEnvironmentProvider = candidates.some(
    (candidate) =>
      candidate.source === "environment" ||
      (candidate.baseUrl === environmentFallback.baseUrl &&
        candidate.apiKeyRef === environmentFallback.apiKeyRef &&
        candidate.model === environmentFallback.model),
  );

  if (!hasSameEnvironmentProvider) {
    candidates.push(environmentFallback);
  }

  return candidates;
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
