import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { requireCurrentUser } from "@/lib/auth/session";
import { syncProjectStatusFromCalendarItem } from "@/lib/calendar/project-sync";
import { calendarItemCreateSchema } from "@/lib/calendar/schemas";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";

function toDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

const calendarItemInclude = {
  accountProfile: { select: { id: true, name: true, niche: true } },
  topic: { select: { id: true, title: true } },
  project: { select: { id: true, title: true, status: true } },
} satisfies Prisma.ContentCalendarItemInclude;

export async function GET(request: Request) {
  try {
    const current = await requireCurrentUser();
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const entry = url.searchParams.get("entry") || undefined;
    const accountProfileId = url.searchParams.get("accountProfileId") || undefined;
    const start = toDate(url.searchParams.get("start"));
    const end = toDate(url.searchParams.get("end"));

    const items = await prisma.contentCalendarItem.findMany({
      where: {
        workspaceId: current.workspace.id,
        ...(status ? { status: status as never } : {}),
        ...(entry ? { entry: entry as never } : {}),
        ...(accountProfileId ? { accountProfileId } : {}),
        ...(start || end
          ? {
              scheduledFor: {
                ...(start ? { gte: start } : {}),
                ...(end ? { lte: end } : {}),
              },
            }
          : {}),
      },
      include: {
        accountProfile: { select: { id: true, name: true, niche: true } },
        topic: { select: { id: true, title: true } },
        project: { select: { id: true, title: true, status: true } },
      },
      orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ items });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = calendarItemCreateSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Valid calendar item details are required.");
    }

    let accountProfileId = parsed.data.accountProfileId;
    let topicId = parsed.data.topicId;

    if (parsed.data.projectId) {
      const project = await prisma.contentProject.findFirstOrThrow({
        where: { id: parsed.data.projectId, workspaceId: current.workspace.id },
        select: { accountProfileId: true, topicId: true },
      });
      accountProfileId = accountProfileId || project.accountProfileId;
      topicId = topicId || project.topicId || undefined;
    }

    if (!accountProfileId) {
      return errorResponse("Please choose an account profile or project.");
    }

    await prisma.accountProfile.findFirstOrThrow({
      where: { id: accountProfileId, workspaceId: current.workspace.id },
    });

    if (topicId) {
      await prisma.topic.findFirstOrThrow({
        where: { id: topicId, workspaceId: current.workspace.id },
      });
    }

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.contentCalendarItem.create({
        data: {
          workspaceId: current.workspace.id,
          accountProfileId,
          topicId,
          projectId: parsed.data.projectId,
          entry: parsed.data.entry,
          title: parsed.data.title,
          status: parsed.data.status,
          scheduledFor: new Date(parsed.data.scheduledFor),
          publishedAt: toDate(parsed.data.publishedAt),
          note: parsed.data.note,
        },
      });

      await syncProjectStatusFromCalendarItem(tx, {
        workspaceId: current.workspace.id,
        projectId: created.projectId,
        status: created.status,
        publishedAt: created.publishedAt,
      });

      return tx.contentCalendarItem.findUniqueOrThrow({
        where: { id: created.id },
        include: calendarItemInclude,
      });
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return mapApiError(error);
  }
}
