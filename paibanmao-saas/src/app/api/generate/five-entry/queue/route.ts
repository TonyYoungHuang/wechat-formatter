import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { resolveFiveEntryGenerationScope, runFiveEntryGeneration } from "@/lib/generation/five-entry-service";
import { generateFiveEntrySchema } from "@/lib/generation/schemas";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { enqueueFiveEntryGeneration, ensureGenerationWorker, getGenerationQueue } from "@/lib/queues/generation";
import { assertCanUseGeneration } from "@/lib/usage/service";

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = generateFiveEntrySchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("A valid topic is required.");
    }

    const queue = getGenerationQueue();

    if (!queue) {
      const result = await runFiveEntryGeneration({
        workspaceId: current.workspace.id,
        planCode: current.workspace.planCode,
        payload: parsed.data,
      });

      return NextResponse.json({ ...result, queued: false, fallback: "sync" });
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
      await enqueueFiveEntryGeneration(job.id);
      ensureGenerationWorker();
    } catch (queueError) {
      const result = await runFiveEntryGeneration({
        workspaceId: current.workspace.id,
        planCode: current.workspace.planCode,
        payload: parsed.data,
        existingJobId: job.id,
      });

      return NextResponse.json({
        ...result,
        queued: false,
        fallback: "sync",
        queueError: queueError instanceof Error ? queueError.message : "Queue unavailable.",
      });
    }

    return NextResponse.json({ job, queued: true }, { status: 202 });
  } catch (error) {
    return mapApiError(error);
  }
}
