import type { z } from "zod";

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
  return model || process.env.REQUESTY_IMAGE_MODEL || process.env.AI_IMAGE_MODEL || "vertex/gemini-2.5-flash-image";
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

export function isRequestyImageProviderConfigured() {
  return Boolean(requestyApiKey());
}

export async function generateImagesWithRequesty(input: ImageGenerationInput): Promise<ImageGenerationResult> {
  if (!isRequestyImageProviderConfigured()) {
    throw new Error("Requesty image generation is not configured. Set REQUESTY_API_KEY first.");
  }

  const model = requestyImageModel(input.model);
  const endpoint = `${requestyBaseUrl()}/images/generations`;
  const images: GeneratedImage[] = [];

  for (const prompt of input.prompts) {
    const response = await fetch(endpoint, {
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
    });
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

    images.push({
      prompt,
      url: image.url,
      b64Json: image.b64_json,
      mimeType: image.b64_json ? imageMimeType(input.outputFormat) : undefined,
      revisedPrompt: image.revised_prompt,
    });
  }

  return {
    images,
    provider: "requesty",
    model,
  };
}
