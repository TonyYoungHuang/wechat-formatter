import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/http/errors";
import { generatePublicToolPreview, publicToolPreviewSchema } from "@/lib/tools/public-tool-preview";

export async function POST(request: Request) {
  const parsed = publicToolPreviewSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return errorResponse("请输入至少 2 个字的内容。");
  }

  return NextResponse.json({
    preview: generatePublicToolPreview(parsed.data.kind, parsed.data.input),
  });
}
