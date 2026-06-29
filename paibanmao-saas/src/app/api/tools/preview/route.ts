import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getCurrentUser } from "@/lib/auth/session";
import { errorResponse } from "@/lib/http/errors";
import { generatePublicToolPreview, publicToolPreviewSchema } from "@/lib/tools/public-tool-preview";

const PUBLIC_PREVIEW_COOKIE = "paibanmao_public_preview_used";
const PUBLIC_PREVIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  const parsed = publicToolPreviewSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return errorResponse("请输入至少 2 个字的内容。");
  }

  const current = await getCurrentUser();
  const cookieStore = await cookies();

  if (!current && cookieStore.get(PUBLIC_PREVIEW_COOKIE)?.value === "1") {
    return errorResponse("免费预览已使用。注册或登录后可以继续生成完整内容。", 429);
  }

  const response = NextResponse.json({
    preview: generatePublicToolPreview(parsed.data.kind, parsed.data.input),
  });

  if (!current) {
    response.cookies.set(PUBLIC_PREVIEW_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: PUBLIC_PREVIEW_COOKIE_MAX_AGE,
    });
  }

  return response;
}
