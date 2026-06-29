export type AiProviderConfig = {
  type: "openai-compatible";
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
};

export function getDefaultAiProvider(): AiProviderConfig {
  return {
    type: "openai-compatible",
    name: process.env.AI_DEFAULT_PROVIDER || "openai-compatible",
    baseUrl: process.env.AI_OPENAI_COMPATIBLE_BASE_URL || "",
    apiKey: process.env.AI_OPENAI_COMPATIBLE_API_KEY || "",
    model: process.env.AI_DEFAULT_MODEL || "gpt-4.1-mini",
  };
}

export function assertAiProviderReady(config = getDefaultAiProvider()) {
  if (!config.baseUrl || !config.apiKey || !config.model) {
    throw new Error("AI provider is not configured.");
  }
}

