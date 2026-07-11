import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { mapApiError } from "@/lib/http/errors";

function getProjectId(output: unknown) {
  if (!output || typeof output !== "object") {
    return null;
  }

  const projectId = (output as { projectId?: unknown }).projectId;
  return typeof projectId === "string" ? projectId : null;
}

function getSafeOutput(output: unknown, projectTitleById: Map<string, string>) {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return null;
  }

  const record = output as Record<string, unknown>;
  const projectId = typeof record.projectId === "string" ? record.projectId : null;
  const title = typeof record.title === "string" ? record.title : null;
  const hasHtml = typeof record.html === "string" && record.html.trim().length > 0;
  const hasSuggestions = Array.isArray(record.suggestions) && record.suggestions.length > 0;
  const hasPrompts = Array.isArray(record.prompts) && record.prompts.length > 0;
  const hasBody = typeof record.body === "string" && record.body.trim().length > 0;
  const hasImages = Array.isArray(record.images) && record.images.length > 0;

  if (!projectId && !title && !hasHtml && !hasSuggestions && !hasPrompts && !hasBody && !hasImages) {
    return null;
  }

  return {
    projectId: projectId || undefined,
    projectTitle: projectId ? projectTitleById.get(projectId) || null : null,
    title,
    hasHtml,
    hasImages,
    imageCount: hasImages ? (record.images as unknown[]).length : undefined,
  };
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

    const projectIds = jobs.map((job) => getProjectId(job.output)).filter((id): id is string => Boolean(id));
    const projects = projectIds.length
      ? await prisma.contentProject.findMany({
          where: {
            id: { in: projectIds },
            workspaceId: current.workspace.id,
          },
          select: { id: true, title: true },
        })
      : [];
    const projectTitleById = new Map(projects.map((project) => [project.id, project.title]));

    return NextResponse.json({
      jobs: jobs.map((job) => ({
        ...job,
        output: getSafeOutput(job.output, projectTitleById),
      })),
    });
  } catch (error) {
    return mapApiError(error);
  }
}
