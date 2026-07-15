import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCurrentUser } from "@/lib/auth/session";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { extractPublicWebSource } from "@/lib/sources/extract";

const extractSourceSchema = z.object({
  url: z.string().trim().min(8).max(2000),
});

export async function POST(request: Request) {
  try {
    await requireCurrentUser();
    const parsed = extractSourceSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return errorResponse("请输入可以公开访问的网页链接。");

    const source = await extractPublicWebSource(parsed.data.url);
    return NextResponse.json({ source });
  } catch (error) {
    return mapApiError(error);
  }
}
