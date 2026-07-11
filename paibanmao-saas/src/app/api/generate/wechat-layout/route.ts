import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getFriendlyAiErrorMessage } from "@/lib/ai/chat-json";
import { buildFallbackWechatLayout, generateWechatLayoutWithAi } from "@/lib/ai/wechat-layout";
import { withAbortableTimeout } from "@/lib/async/timeout";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { wechatLayoutSchema } from "@/lib/generation/schemas";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { assertCanUseGeneration, recordGenerationUsage } from "@/lib/usage/service";

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function POST(request: Request) {
  const startedAt = performance.now();
  try {
    const current = await requireCurrentUser();
    const parsed = wechatLayoutSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("公众号排版需要标题和至少 20 个字的正文。");
    }

    await assertCanUseGeneration(current.workspace.id, current.workspace.planCode);

    const output = await withAbortableTimeout(
      (signal) => generateWechatLayoutWithAi(parsed.data, { signal }),
      Number(process.env.WECHAT_LAYOUT_TIMEOUT_MS || 22000),
      "AI 排版超时，已先返回基础公众号 HTML 排版。",
      request.signal,
    ).catch((error) => {
      if (request.signal.aborted) throw error;
      return {
        ...buildFallbackWechatLayout(parsed.data),
        aiError: getFriendlyAiErrorMessage(error),
      };
    });
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

    const totalMs = Math.round(performance.now() - startedAt);
    return NextResponse.json(
      {
        job,
        output,
        fallback: output.provider === "fallback",
        aiError: output.aiError,
        timing: { totalMs },
      },
      {
        headers: {
          "Server-Timing": `wechat-layout;dur=${totalMs}`,
          "X-Paibanmao-AI-Status": output.provider === "fallback" ? "fallback" : "succeeded",
        },
      },
    );
  } catch (error) {
    return mapApiError(error);
  }
}
