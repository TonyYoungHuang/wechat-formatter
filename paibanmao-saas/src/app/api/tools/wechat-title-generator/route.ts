import { NextResponse } from "next/server";

import {
  generateWechatTitles,
  wechatTitleGeneratorSchema,
} from "@/lib/tools/wechat-title-generator";
import { errorResponse } from "@/lib/http/errors";

export async function POST(request: Request) {
  const parsed = wechatTitleGeneratorSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return errorResponse("请输入 2-120 个字的公众号选题。");
  }

  const suggestions = generateWechatTitles(parsed.data);

  return NextResponse.json({
    suggestions,
    previewLimit: 12,
    unlocks: ["保存到选题库", "一键扩写公众号正文", "同步生成小绿书、搜一搜、问一问和朋友圈版本"],
  });
}
