import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { recordGeneratedContentTags } from "@/lib/account-knowledge/tagging";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { projectCreateSchema } from "@/lib/projects/schemas";

export async function GET(request: Request) {
  try {
    const current = await requireCurrentUser();
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const accountProfileId = url.searchParams.get("accountProfileId") || undefined;

    const projects = await prisma.contentProject.findMany({
      where: {
        workspaceId: current.workspace.id,
        ...(status ? { status: status as never } : {}),
        ...(accountProfileId ? { accountProfileId } : {}),
      },
      include: {
        accountProfile: {
          select: { id: true, name: true, niche: true },
        },
        topic: {
          select: { id: true, title: true },
        },
        variants: {
          select: { id: true, entry: true, title: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
        },
        metrics: {
          orderBy: { recordedAt: "desc" },
          take: 1,
        },
        reports: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, score: true, level: true, summary: true, createdAt: true },
        },
        _count: {
          select: { reports: true, metrics: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = projectCreateSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Valid project details are required.");
    }

    await prisma.accountProfile.findFirstOrThrow({
      where: { id: parsed.data.accountProfileId, workspaceId: current.workspace.id },
    });

    if (parsed.data.topicId) {
      await prisma.topic.findFirstOrThrow({
        where: { id: parsed.data.topicId, workspaceId: current.workspace.id },
      });
    }

    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.contentProject.create({
        data: {
          workspaceId: current.workspace.id,
          accountProfileId: parsed.data.accountProfileId,
          topicId: parsed.data.topicId,
          title: parsed.data.title,
          status: parsed.data.status,
          variants: {
            create: parsed.data.variants.map((variant) => ({
              entry: variant.entry,
              title: variant.title,
              body: variant.body,
              metadata: variant.metadata as Prisma.InputJsonValue | undefined,
            })),
          },
        },
        include: { variants: true },
      });
      await recordGeneratedContentTags(tx, {
        workspaceId: current.workspace.id,
        accountProfileId: parsed.data.accountProfileId,
        projectTitle: parsed.data.title,
        variants: parsed.data.variants,
      });
      return created;
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return mapApiError(error);
  }
}
