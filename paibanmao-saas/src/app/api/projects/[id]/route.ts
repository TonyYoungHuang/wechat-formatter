import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { recordGeneratedContentTags } from "@/lib/account-knowledge/tagging";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { projectPatchSchema } from "@/lib/projects/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;

    const project = await prisma.contentProject.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
      include: {
        accountProfile: true,
        topic: true,
        variants: { orderBy: { updatedAt: "desc" } },
        reports: {
          include: { issues: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({ project });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;
    const parsed = projectPatchSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Project payload is invalid.");
    }

    const existingProject = await prisma.contentProject.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
      select: { accountProfileId: true, title: true },
    });

    const project = await prisma.$transaction(async (tx) => {
      if (parsed.data.variants) {
        await tx.contentVariant.deleteMany({ where: { projectId: id } });
      }

      const updated = await tx.contentProject.update({
        where: { id },
        data: {
          title: parsed.data.title,
          status: parsed.data.status,
          publishedAt: parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : parsed.data.publishedAt,
          reviewNote: parsed.data.reviewNote,
          ...(parsed.data.variants
            ? {
                variants: {
                  create: parsed.data.variants.map((variant) => ({
                    entry: variant.entry,
                    title: variant.title,
                    body: variant.body,
                    metadata: variant.metadata as Prisma.InputJsonValue | undefined,
                  })),
                },
              }
            : {}),
        },
        include: { variants: true },
      });

      if (parsed.data.variants) {
        await recordGeneratedContentTags(tx, {
          workspaceId: current.workspace.id,
          accountProfileId: existingProject.accountProfileId,
          projectTitle: parsed.data.title || existingProject.title,
          variants: parsed.data.variants,
        });
      }

      return updated;
    });

    return NextResponse.json({ project });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;

    await prisma.contentProject.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
    });

    await prisma.contentProject.delete({ where: { id } });

    return new Response(null, { status: 204 });
  } catch (error) {
    return mapApiError(error);
  }
}
