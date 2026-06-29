import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { requireCurrentUser } from "@/lib/auth/session";
import { syncProjectStatusFromCalendarItem } from "@/lib/calendar/project-sync";
import { calendarItemPatchSchema } from "@/lib/calendar/schemas";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function toDate(value: string | null | undefined) {
  return value ? new Date(value) : value;
}

const calendarItemInclude = {
  accountProfile: { select: { id: true, name: true, niche: true } },
  topic: { select: { id: true, title: true } },
  project: { select: { id: true, title: true, status: true } },
} satisfies Prisma.ContentCalendarItemInclude;

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;
    const parsed = calendarItemPatchSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Calendar item payload is invalid.");
    }

    const existing = await prisma.contentCalendarItem.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
      select: { id: true, projectId: true },
    });

    if (parsed.data.accountProfileId) {
      await prisma.accountProfile.findFirstOrThrow({
        where: { id: parsed.data.accountProfileId, workspaceId: current.workspace.id },
      });
    }

    if (parsed.data.topicId) {
      await prisma.topic.findFirstOrThrow({
        where: { id: parsed.data.topicId, workspaceId: current.workspace.id },
      });
    }

    if (parsed.data.projectId) {
      await prisma.contentProject.findFirstOrThrow({
        where: { id: parsed.data.projectId, workspaceId: current.workspace.id },
      });
    }

    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.contentCalendarItem.update({
        where: { id: existing.id },
        data: {
          accountProfileId: parsed.data.accountProfileId,
          topicId: parsed.data.topicId,
          projectId: parsed.data.projectId,
          entry: parsed.data.entry,
          title: parsed.data.title,
          status: parsed.data.status,
          scheduledFor: parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : undefined,
          publishedAt: toDate(parsed.data.publishedAt),
          note: parsed.data.note,
        },
      });

      await syncProjectStatusFromCalendarItem(tx, {
        workspaceId: current.workspace.id,
        projectId: updated.projectId ?? existing.projectId,
        status: updated.status,
        publishedAt: updated.publishedAt,
      });

      return tx.contentCalendarItem.findUniqueOrThrow({
        where: { id: updated.id },
        include: calendarItemInclude,
      });
    });

    return NextResponse.json({ item });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;

    await prisma.contentCalendarItem.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
      select: { id: true },
    });

    await prisma.contentCalendarItem.delete({ where: { id } });

    return new Response(null, { status: 204 });
  } catch (error) {
    return mapApiError(error);
  }
}
