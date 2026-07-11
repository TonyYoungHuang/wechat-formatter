import { NextResponse } from "next/server";
import { z } from "zod";

import { buildFallbackAccountProfileDraft, generateAccountProfileDraftWithAi } from "@/lib/ai/account-profile";
import { withTimeout } from "@/lib/async/timeout";
import { requireCurrentUser } from "@/lib/auth/session";
import { errorResponse, mapApiError } from "@/lib/http/errors";

const accountProfileSuggestSchema = z.object({
  idea: z.string().trim().min(2).max(1000),
});

export async function POST(request: Request) {
  try {
    await requireCurrentUser();
    const parsed = accountProfileSuggestSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("请先输入你的账号想法，至少 2 个字。");
    }

    const result = await withTimeout(
      generateAccountProfileDraftWithAi({ idea: parsed.data.idea }),
      Number(process.env.ACCOUNT_PROFILE_SUGGEST_TIMEOUT_MS || 18000),
      "账号档案 AI 辅助生成超时，已先给出基础档案。",
    ).catch((error) => ({
      profile: buildFallbackAccountProfileDraft(parsed.data.idea),
      provider: "fallback",
      model: "local-rules",
      fallback: true,
      aiError: error instanceof Error ? error.message : "账号档案 AI 辅助生成超时，已先给出基础档案。",
    }));

    return NextResponse.json(result);
  } catch (error) {
    return mapApiError(error);
  }
}
