import "server-only";

import { type NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";

import { getCurrentUser } from "@/lib/auth/session";
import { getRedis } from "@/lib/redis/client";

export const PUBLIC_PREVIEW_COOKIE = "paibanmao_public_preview_used";
export const PUBLIC_PREVIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
export const PUBLIC_PREVIEW_LIMIT_MESSAGE = "免费预览已使用。注册或登录后可以继续生成完整内容。";

type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

type PublicPreviewGate = {
  current: CurrentUser;
  shouldBlock: boolean;
  redisKey: string | null;
};

function clientIdentity(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip =
    forwardedFor ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  return `${ip.slice(0, 80)}\n${userAgent.slice(0, 200)}`;
}

function publicPreviewRedisKey(request: Request) {
  const digest = createHash("sha256").update(clientIdentity(request)).digest("hex");
  return `paibanmao:public-preview:${digest}`;
}

async function hasUsedPublicPreview(redisKey: string) {
  const redis = getRedis();
  if (!redis) {
    return false;
  }

  try {
    return (await redis.get(redisKey)) === "1";
  } catch {
    return false;
  }
}

async function markRedisPreviewUsed(redisKey: string) {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  try {
    await redis.set(redisKey, "1", "EX", PUBLIC_PREVIEW_COOKIE_MAX_AGE);
  } catch {
    return;
  }
}

export async function getPublicPreviewGate(request: Request): Promise<PublicPreviewGate> {
  const current = await getCurrentUser();
  const cookieStore = await cookies();
  const redisKey = current ? null : publicPreviewRedisKey(request);
  const cookieUsed = cookieStore.get(PUBLIC_PREVIEW_COOKIE)?.value === "1";
  const redisUsed = redisKey ? await hasUsedPublicPreview(redisKey) : false;

  return {
    current,
    shouldBlock: !current && (cookieUsed || redisUsed),
    redisKey,
  };
}

export async function markPublicPreviewUsed(response: NextResponse, gate: PublicPreviewGate) {
  if (gate.current) {
    return;
  }

  response.cookies.set(PUBLIC_PREVIEW_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PUBLIC_PREVIEW_COOKIE_MAX_AGE,
  });

  if (gate.redisKey) {
    await markRedisPreviewUsed(gate.redisKey);
  }
}
