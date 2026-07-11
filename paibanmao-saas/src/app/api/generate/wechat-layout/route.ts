import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { buildFallbackWechatLayout, generateWechatLayoutWithAi } from "@/lib/ai/wechat-layout";
import { withTimeout } from "@/lib/async/timeout";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { wechatLayoutSchema } from "@/lib/generation/schemas";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { assertCanUseGeneration, recordGenerationUsage } from "@/lib/usage/service";

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = wechatLayoutSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("公众号排版需要标题和至少 20 个字的正文。");
    }

    await assertCanUseGeneration(current.workspace.id, current.workspace.planCode);

    const output = await withTimeout(
      generateWechatLayoutWithAi(parsed.data),
      Number(process.env.WECHAT_LAYOUT_TIMEOUT_MS || 28000),
      "AI 排版超时，已先返回基础公众号 HTML 排版。",
    ).catch((error) => ({
      ...buildFallbackWechatLayout(parsed.data),
      aiError: error instanceof Error ? error.message : "AI 排版超时，已先返回基础公众号 HTML 排版。",
    }));
    const job = await prisma.generationJob.create({
      data: {
        workspaceId: current.workspace.id,
        type: "wechat_layout_generation",
        status: output.provider === "fallback" ? "failed" : "succeeded",
        input: toJsonValue(parsed.data),
        output: toJsonValue(output),
        error: output.aiError,
        tokenInput: output.tokenInput,
        tokenOutput: output.tokenOutput,
      },
    });

    if (output.provider !== "fallback") {
      await recordGenerationUsage(current.workspace.id);
    }

    return NextResponse.json({
      job,
      output,
      fallback: output.provider === "fallback",
      aiError: output.aiError,
    });
  } catch (error) {
    return mapApiError(error);
  }
}
