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

function getSafeOutput(output: unknown) {
  if (typeof output !== "object" || output === null || Array.isArray(output)) {
    return null;
  }

  const record = output as Record<string, unknown>;
  const projectId = typeof record.projectId === "string" ? record.projectId : null;
  const title = typeof record.title === "string" ? record.title : null;
  const html = typeof record.html === "string" ? record.html : null;
  const text = typeof record.text === "string" ? record.text : null;
  const body = typeof record.body === "string" ? record.body : null;
  const suggestions = Array.isArray(record.suggestions)
    ? record.suggestions
        .map((item) => {
          if (typeof item !== "object" || item === null || Array.isArray(item)) {
            return null;
          }
          const suggestion = item as Record<string, unknown>;
          return {
            title: typeof suggestion.title === "string" ? suggestion.title : "",
            reason: typeof suggestion.reason === "string" ? suggestion.reason : "",
            entries: Array.isArray(suggestion.entries) ? suggestion.entries.filter((entry): entry is string => typeof entry === "string") : [],
          };
        })
        .filter((item): item is { title: string; reason: string; entries: string[] } => Boolean(item && (item.title || item.reason)))
    : undefined;
  const prompts = Array.isArray(record.prompts) ? record.prompts.filter((item): item is string => typeof item === "string") : undefined;
  const images = Array.isArray(record.images)
    ? record.images
        .map((item) => {
          if (typeof item !== "object" || item === null || Array.isArray(item)) {
            return null;
          }
          const image = item as Record<string, unknown>;
          return {
            prompt: typeof image.prompt === "string" ? image.prompt : undefined,
            revisedPrompt: typeof image.revisedPrompt === "string" ? image.revisedPrompt : undefined,
            url: typeof image.url === "string" ? image.url : undefined,
            b64Json: typeof image.b64Json === "string" ? image.b64Json : undefined,
            mimeType: typeof image.mimeType === "string" ? image.mimeType : undefined,
          };
        })
        .filter(
          (item): item is {
            prompt: string | undefined;
            revisedPrompt: string | undefined;
            url: string | undefined;
            b64Json: string | undefined;
            mimeType: string | undefined;
          } => Boolean(item && (item.url || item.b64Json || item.prompt || item.revisedPrompt)),
        )
    : undefined;

  return {
    projectId,
    title,
    html,
    text,
    body,
    suggestions,
    prompts,
    images,
  };
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

    return NextResponse.json({
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        error: job.error,
        createdAt: job.createdAt,
        output: getSafeOutput(job.output),
      },
      project,
    });
  } catch (error) {
    return mapApiError(error);
  }
}
