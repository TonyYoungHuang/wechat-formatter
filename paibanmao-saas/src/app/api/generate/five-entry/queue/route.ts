import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { resolveFiveEntryGenerationScope } from "@/lib/generation/five-entry-service";
import { generateFiveEntrySchema } from "@/lib/generation/schemas";
import { buildPersistedGenerationPayload } from "@/lib/generation/source-material";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { enqueueFiveEntryGeneration, ensureGenerationWorker, getGenerationQueue } from "@/lib/queues/generation";
import { assertCanUseGeneration } from "@/lib/usage/service";

function queueErrorMessage(error: unknown) {
  const detail = error instanceof Error ? error.message : "Queue unavailable.";
  return `后台生成队列暂时不可用，请稍后重试或联系微信客服。${detail ? ` (${detail})` : ""}`;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = generateFiveEntrySchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("A valid topic is required.");
    }

    const scoped = await resolveFiveEntryGenerationScope(current.workspace.id, parsed.data);
    await assertCanUseGeneration(current.workspace.id, current.workspace.planCode);

    const job = await prisma.generationJob.create({
      data: {
        workspaceId: current.workspace.id,
        accountProfileId: scoped.accountProfile.id,
        type: "five_entry_generation",
        status: "pending",
        input: {
          mode: "queued",
          payload: scoped.payload,
        },
      },
    });

    try {
      const queue = getGenerationQueue();
      if (!queue) {
        throw new Error("REDIS_URL is not configured.");
      }

      await withTimeout(enqueueFiveEntryGeneration(job.id), 3000, "Queue enqueue timed out.");
      ensureGenerationWorker();
    } catch (queueError) {
      const message = queueErrorMessage(queueError);
      const failedJob = await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          error: message,
          input: {
            mode: "queued",
            payload: buildPersistedGenerationPayload({ payload: scoped.payload, summary: scoped.sourceSummary }),
          },
        },
      });

      return NextResponse.json({
        job: failedJob,
        queued: false,
        queueError: message,
      }, { status: 202 });
    }

    return NextResponse.json({ job, queued: true }, { status: 202 });
  } catch (error) {
    return mapApiError(error);
  }
}
