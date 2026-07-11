import { z } from "zod";

import type { AiProviderConfig } from "./provider";
import { fetchWithTimeout } from "../async/timeout";

export type ChatJsonResult<T> = {
  object: T;
  tokenInput: number;
  tokenOutput: number;
};

export class AiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AiRequestError";
    this.status = status;
  }
}

export function isFatalAiRequestError(error: unknown) {
  return error instanceof AiRequestError && [401, 402, 403].includes(error.status);
}

export function getFriendlyAiErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const status = error instanceof AiRequestError ? error.status : 0;

  if (status === 402 || /insufficient balance|top up|余额不足/i.test(message)) {
    return "Claude 服务余额不足，请联系管理员补充 API 额度后重试。本次不扣生成额度。";
  }
  if ([401, 403].includes(status) || /unauthorized|invalid api key|authentication/i.test(message)) {
    return "Claude 服务认证失败，请联系管理员检查 API 配置。本次不扣生成额度。";
  }
  if (status === 429 || /rate limit|too many requests/i.test(message)) {
    return "Claude 服务当前请求较多，请稍后重试。本次不扣生成额度。";
  }
  if (/timed out|timeout|aborted/i.test(message)) {
    return "Claude 精排响应超时，请稍后重试。本次不扣生成额度。";
  }
  return "Claude 精排暂未完成，请稍后重试。本次不扣生成额度。";
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, "");
}

function extractTextContent(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item !== null && "text" in item) {
          const text = (item as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("");
  }
  return "";
}

function parseJsonFromModelText(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    // Some providers still wrap JSON despite explicit instructions.
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced) {
    try {
      return JSON.parse(fenced) as unknown;
    } catch {
      // Fall through to brace slicing.
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as unknown;
  }

  throw new Error("AI response did not contain JSON.");
}

export async function generateJsonWithChat<TSchema extends z.ZodTypeAny>(input: {
  config: AiProviderConfig;
  schema: TSchema;
  system: string;
  prompt: string;
  temperature: number;
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  autoCache?: boolean;
}): Promise<ChatJsonResult<z.infer<TSchema>>> {
  const response = await fetchWithTimeout(
    `${normalizeBaseUrl(input.config.baseUrl)}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.config.apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Paibanmao",
        ...(process.env.APP_URL ? { "HTTP-Referer": process.env.APP_URL } : {}),
      },
      body: JSON.stringify({
        model: input.config.model,
        messages: [
          {
            role: "system",
            content: [
              input.system,
              "",
              "你必须只输出一段合法 JSON，不要 markdown，不要解释，不要在 JSON 前后添加任何文字。",
              "JSON 必须满足用户要求的字段结构；字符串内容必须使用中文。",
            ].join("\n"),
          },
          {
            role: "user",
            content: input.prompt,
          },
        ],
        temperature: input.temperature,
        max_tokens: input.maxTokens,
        ...(input.autoCache === undefined ? {} : { requesty: { auto_cache: input.autoCache } }),
      }),
      signal: input.signal,
    },
    input.timeoutMs ?? Number(process.env.AI_TEXT_REQUEST_TIMEOUT_MS || 120000),
  );
  const payload = (await response.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: unknown } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      input_tokens?: number;
      output_tokens?: number;
    };
    error?: { message?: string };
    message?: string;
  };

  if (!response.ok) {
    throw new AiRequestError(payload.error?.message || payload.message || `AI request failed with ${response.status}.`, response.status);
  }

  const text = extractTextContent(payload.choices?.[0]?.message?.content);
  const parsed = input.schema.safeParse(parseJsonFromModelText(text));
  if (!parsed.success) {
    throw new Error(`AI JSON schema mismatch: ${parsed.error.issues.slice(0, 3).map((issue) => issue.message).join("; ")}`);
  }

  return {
    object: parsed.data,
    tokenInput: payload.usage?.prompt_tokens ?? payload.usage?.input_tokens ?? 0,
    tokenOutput: payload.usage?.completion_tokens ?? payload.usage?.output_tokens ?? 0,
  };
}
