import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { mapApiError } from "@/lib/http/errors";

function getPublicOutput(output: unknown) {
  if (!output || typeof output !== "object") {
    return null;
  }

  const projectId = (output as { projectId?: unknown }).projectId;
  return typeof projectId === "string" ? { projectId } : null;
}

export async function GET() {
  try {
    const current = await requireCurrentUser();
    const jobs = await prisma.generationJob.findMany({
      where: { workspaceId: current.workspace.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        type: true,
        status: true,
        output: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      jobs: jobs.map((job) => ({
        ...job,
        output: getPublicOutput(job.output),
      })),
    });
  } catch (error) {
    return mapApiError(error);
  }
}
