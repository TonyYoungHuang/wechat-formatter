import { NextResponse } from "next/server";
import { z } from "zod";

import { generateAccountProfileDraftWithAi } from "@/lib/ai/account-profile";
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

    const result = await generateAccountProfileDraftWithAi({ idea: parsed.data.idea });

    return NextResponse.json(result);
  } catch (error) {
    return mapApiError(error);
  }
}
