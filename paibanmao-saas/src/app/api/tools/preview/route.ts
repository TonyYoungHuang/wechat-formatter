import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/http/errors";
import { getPublicPreviewGate, markPublicPreviewUsed, PUBLIC_PREVIEW_LIMIT_MESSAGE } from "@/lib/tools/public-preview-limit";
import { generatePublicToolPreview, publicToolPreviewSchema } from "@/lib/tools/public-tool-preview";

export async function POST(request: Request) {
  const parsed = publicToolPreviewSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return errorResponse("请输入至少 2 个字的内容。");
  }

  const previewGate = await getPublicPreviewGate(request);

  if (previewGate.shouldBlock) {
    return errorResponse(PUBLIC_PREVIEW_LIMIT_MESSAGE, 429);
  }

  const response = NextResponse.json({
    preview: generatePublicToolPreview(parsed.data.kind, parsed.data.input),
  });

  await markPublicPreviewUsed(response, previewGate);

  return response;
}
