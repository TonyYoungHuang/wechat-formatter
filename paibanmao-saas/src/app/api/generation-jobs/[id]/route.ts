import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { mapApiError } from "@/lib/http/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getProjectId(output: unknown) {
  if (typeof output !== "object" || output === null || Array.isArray(output)) {
    return null;
  }

  const value = (output as Record<string, unknown>).projectId;
  return typeof value === "string" ? value : null;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;
    const job = await prisma.generationJob.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
    });
    const projectId = getProjectId(job.output);
    const project = projectId
      ? await prisma.contentProject.findFirst({
          where: { id: projectId, workspaceId: current.workspace.id },
          include: { variants: true },
        })
      : null;

    return NextResponse.json({ job, project });
  } catch (error) {
    return mapApiError(error);
  }
}
