import "server-only";

import { type NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getCurrentUser } from "@/lib/auth/session";

export const PUBLIC_PREVIEW_COOKIE = "paibanmao_public_preview_used";
export const PUBLIC_PREVIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
export const PUBLIC_PREVIEW_LIMIT_MESSAGE = "免费预览已使用。注册或登录后可以继续生成完整内容。";

export async function getPublicPreviewGate() {
  const current = await getCurrentUser();
  const cookieStore = await cookies();

  return {
    current,
    shouldBlock: !current && cookieStore.get(PUBLIC_PREVIEW_COOKIE)?.value === "1",
  };
}

export function markPublicPreviewUsed(response: NextResponse, current: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (current) {
    return;
  }

  response.cookies.set(PUBLIC_PREVIEW_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PUBLIC_PREVIEW_COOKIE_MAX_AGE,
  });
}
