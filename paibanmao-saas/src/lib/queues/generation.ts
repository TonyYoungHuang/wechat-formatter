import { Queue, Worker, type Job } from "bullmq";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { runFiveEntryGeneration } from "@/lib/generation/five-entry-service";
import { generateFiveEntrySchema } from "@/lib/generation/schemas";
import { redactGenerationPayload } from "@/lib/generation/source-material";
import { logger } from "@/lib/ops/logger";
import { createBullMqConnection } from "@/lib/redis/client";

const GENERATION_QUEUE_NAME = "paibanmao-generation";

type GenerationQueueData = {
  generationJobId: string;
};

type GenerationJobName = "five_entry_generation";
type GenerationQueue = Queue<GenerationQueueData, unknown, GenerationJobName>;
type GenerationWorker = Worker<GenerationQueueData, unknown, GenerationJobName>;

type GlobalQueueState = {
  generationQueue?: GenerationQueue;
  generationWorker?: GenerationWorker;
};

const globalForQueues = globalThis as unknown as GlobalQueueState;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPayload(input: Prisma.JsonValue) {
  if (isRecord(input) && "payload" in input) {
    return input.payload;
  }

  return input;
}

export function getGenerationQueue() {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!globalForQueues.generationQueue) {
    const connection = createBullMqConnection();

    if (!connection) {
      return null;
    }

    globalForQueues.generationQueue = new Queue<GenerationQueueData, unknown, GenerationJobName>(GENERATION_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { age: 60 * 60 * 24, count: 500 },
        removeOnFail: { age: 60 * 60 * 24 * 7, count: 1000 },
      },
    });
  }

  return globalForQueues.generationQueue;
}

export async function enqueueFiveEntryGeneration(generationJobId: string) {
  const queue = getGenerationQueue();

  if (!queue) {
    return null;
  }

  return queue.add(
    "five_entry_generation",
    { generationJobId },
    {
      jobId: generationJobId,
    },
  );
}

export function ensureGenerationWorker() {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (globalForQueues.generationWorker) {
    return globalForQueues.generationWorker;
  }

  const connection = createBullMqConnection();

  if (!connection) {
    return null;
  }

  globalForQueues.generationWorker = new Worker<GenerationQueueData, unknown, GenerationJobName>(
    GENERATION_QUEUE_NAME,
    async (job: Job<GenerationQueueData, unknown, GenerationJobName>) => {
      if (job.name !== "five_entry_generation") {
        throw new Error(`Unsupported generation job: ${job.name}`);
      }

      const dbJob = await prisma.generationJob.findUniqueOrThrow({
        where: { id: job.data.generationJobId },
      });

      if (dbJob.status === "succeeded" || dbJob.status === "failed") {
        return dbJob;
      }

      const workspace = await prisma.workspace.findUniqueOrThrow({
        where: { id: dbJob.workspaceId },
      });
      const parsed = generateFiveEntrySchema.safeParse(getPayload(dbJob.input));

      if (!parsed.success) {
        throw new Error("Queued generation payload is invalid.");
      }

      return runFiveEntryGeneration({
        workspaceId: dbJob.workspaceId,
        planCode: workspace.planCode,
        payload: parsed.data,
        existingJobId: dbJob.id,
      });
    },
    {
      connection,
      concurrency: Number(process.env.GENERATION_QUEUE_CONCURRENCY || 2),
    },
  );

  globalForQueues.generationWorker.on("failed", async (job, error) => {
    logger.error("Generation queue job failed", {
      jobId: job?.id,
      generationJobId: job?.data.generationJobId,
      error,
    });

    if (!job?.data.generationJobId) {
      return;
    }

    const maxAttempts = Number(job.opts.attempts || 1);
    if (job.attemptsMade < maxAttempts) {
      return;
    }

    const dbJob = await prisma.generationJob.findUnique({
      where: { id: job.data.generationJobId },
      select: { input: true },
    });
    const parsedPayload = dbJob ? generateFiveEntrySchema.safeParse(getPayload(dbJob.input)) : null;

    await prisma.generationJob.updateMany({
      where: { id: job.data.generationJobId, status: { in: ["pending", "running"] } },
      data: {
        status: "failed",
        error: error.message,
        ...(parsedPayload?.success
          ? {
              input: {
                mode: "queued",
                payload: redactGenerationPayload(parsedPayload.data),
              },
            }
          : {}),
      },
    });
  });

  return globalForQueues.generationWorker;
}
