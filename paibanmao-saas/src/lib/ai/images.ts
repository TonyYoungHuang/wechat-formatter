import type { z } from "zod";

import { fetchWithTimeout } from "@/lib/async/timeout";
import type { imageGenerationSchema } from "@/lib/generation/schemas";

export type GeneratedImage = {
  prompt: string;
  url?: string;
  b64Json?: string;
  mimeType?: string;
  revisedPrompt?: string;
};

export type ImageGenerationResult = {
  images: GeneratedImage[];
  provider: string;
  model: string;
};

type ImageGenerationInput = z.infer<typeof imageGenerationSchema>;

function requestyBaseUrl() {
  return (process.env.REQUESTY_BASE_URL || process.env.AI_OPENAI_COMPATIBLE_BASE_URL || "https://router.requesty.ai/v1").replace(/\/$/, "");
}

function requestyApiKey() {
  return process.env.REQUESTY_API_KEY || process.env.AI_OPENAI_COMPATIBLE_API_KEY || "";
}

function requestyImageModel(model?: string) {
  return model || process.env.REQUESTY_IMAGE_MODEL || process.env.AI_IMAGE_MODEL || "vertex/google/gemini-2.5-flash-image-preview";
}

function imageRequestTimeoutMs() {
  return Number(process.env.IMAGE_GENERATION_REQUEST_TIMEOUT_MS || 45000);
}

function siteHeaders() {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${requestyApiKey()}`,
    "Content-Type": "application/json",
  };

  if (process.env.APP_URL) {
    headers["HTTP-Referer"] = process.env.APP_URL;
  }

  headers["X-Title"] = "Paibanmao";
  return headers;
}

function imageMimeType(outputFormat: ImageGenerationInput["outputFormat"]) {
  return outputFormat === "jpeg" ? "image/jpeg" : outputFormat === "webp" ? "image/webp" : "image/png";
}

function isGeminiChatImageModel(model: string) {
  const normalized = model.toLowerCase();
  return normalized.includes("gemini") && normalized.includes("image");
}

function aspectRatioFromSize(size: ImageGenerationInput["size"]) {
  if (size === "1536x1024") return "3:2";
  if (size === "1024x1536") return "2:3";
  return "1:1";
}

function parseDataUrl(dataUrl?: string) {
  const match = dataUrl?.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;

  return {
    mimeType: match[1],
    b64Json: match[2],
  };
}

export function isRequestyImageProviderConfigured() {
  return Boolean(requestyApiKey());
}

async function generateImageWithRequestyChatOnce(input: ImageGenerationInput, model: string, prompt: string): Promise<GeneratedImage> {
  const response = await fetchWithTimeout(
    `${requestyBaseUrl()}/chat/completions`,
    {
      method: "POST",
      headers: siteHeaders(),
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        image_config: {
          aspect_ratio: aspectRatioFromSize(input.size),
          image_size: "1K",
        },
      }),
    },
    imageRequestTimeoutMs(),
  );
  const payload = (await response.json().catch(() => ({}))) as {
    choices?: Array<{
      message?: {
        content?: string;
        images?: Array<{
          image_url?: {
            url?: string;
          };
        }>;
      };
    }>;
    error?: { message?: string };
    message?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || payload.message || `Requesty Gemini image generation failed with ${response.status}.`);
  }

  const message = payload.choices?.[0]?.message;
  const imageUrl = message?.images?.[0]?.image_url?.url;
  const dataUrlImage = parseDataUrl(imageUrl);
  if (!imageUrl && !dataUrlImage) {
    throw new Error("Requesty Gemini image generation returned no image.");
  }

  return {
    prompt,
    url: dataUrlImage ? undefined : imageUrl,
    b64Json: dataUrlImage?.b64Json,
    mimeType: dataUrlImage?.mimeType,
    revisedPrompt: message?.content,
  };
}

async function generateImageWithRequestyChat(input: ImageGenerationInput, model: string, prompt: string): Promise<GeneratedImage> {
  const errors: string[] = [];

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await generateImageWithRequestyChatOnce(input, model, prompt);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "unknown image generation error");
    }
  }

  throw new Error(`Requesty Gemini image generation failed after retry: ${errors.join("; ")}`);
}

async function generateImageWithRequestyImageEndpoint(
  input: ImageGenerationInput,
  model: string,
  prompt: string,
): Promise<GeneratedImage> {
  const response = await fetchWithTimeout(
    `${requestyBaseUrl()}/images/generations`,
    {
      method: "POST",
      headers: siteHeaders(),
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size: input.size,
        quality: input.quality,
        response_format: input.responseFormat,
        output_format: input.outputFormat,
      }),
    },
    imageRequestTimeoutMs(),
  );
  const payload = (await response.json().catch(() => ({}))) as {
    data?: Array<{
      url?: string;
      b64_json?: string;
      revised_prompt?: string;
    }>;
    error?: { message?: string };
    message?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || payload.message || `Requesty image generation failed with ${response.status}.`);
  }

  const image = payload.data?.[0];
  if (!image?.url && !image?.b64_json) {
    throw new Error("Requesty image generation returned no image.");
  }

  return {
    prompt,
    url: image.url,
    b64Json: image.b64_json,
    mimeType: image.b64_json ? imageMimeType(input.outputFormat) : undefined,
    revisedPrompt: image.revised_prompt,
  };
}

export async function generateImagesWithRequesty(input: ImageGenerationInput): Promise<ImageGenerationResult> {
  if (!isRequestyImageProviderConfigured()) {
    throw new Error("Requesty image generation is not configured. Set REQUESTY_API_KEY first.");
  }

  const model = requestyImageModel(input.model);
  const images: GeneratedImage[] = [];
  const useChatImageApi = isGeminiChatImageModel(model);

  for (const prompt of input.prompts) {
    images.push(
      useChatImageApi
        ? await generateImageWithRequestyChat(input, model, prompt)
        : await generateImageWithRequestyImageEndpoint(input, model, prompt),
    );
  }

  return {
    images,
    provider: useChatImageApi ? "requesty-chat" : "requesty",
    model,
  };
}
