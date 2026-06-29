import { NextResponse } from "next/server";

import {
  generateWechatTitles,
  wechatTitleGeneratorSchema,
} from "@/lib/tools/wechat-title-generator";
import { errorResponse } from "@/lib/http/errors";
import { getPublicPreviewGate, markPublicPreviewUsed, PUBLIC_PREVIEW_LIMIT_MESSAGE } from "@/lib/tools/public-preview-limit";

export async function POST(request: Request) {
  const parsed = wechatTitleGeneratorSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return errorResponse("请输入 2-120 个字的公众号选题。");
  }

  const previewGate = await getPublicPreviewGate(request);

  if (previewGate.shouldBlock) {
    return errorResponse(PUBLIC_PREVIEW_LIMIT_MESSAGE, 429);
  }

  const suggestions = generateWechatTitles(parsed.data);

  const response = NextResponse.json({
    suggestions,
    previewLimit: 12,
    unlocks: ["保存到选题库", "一键扩写公众号正文", "同步生成小绿书、搜一搜、问一问和朋友圈版本"],
  });

  await markPublicPreviewUsed(response, previewGate);

  return response;
}
