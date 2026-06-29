import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/session";
import { accountProfilePatchSchema } from "@/lib/account-profiles/schemas";
import { normalizeDefaultProfile } from "@/lib/account-profiles/service";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;
    const parsed = accountProfilePatchSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Account profile payload is invalid.");
    }

    await prisma.accountProfile.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
    });

    const profile = await prisma.accountProfile.update({
      where: { id },
      data: parsed.data,
    });

    if (profile.isDefault) {
      await normalizeDefaultProfile(current.workspace.id, profile.id);
    }

    return NextResponse.json({ profile });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;

    await prisma.accountProfile.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
    });

    const [profileCount, linkedContentCount] = await Promise.all([
      prisma.accountProfile.count({ where: { workspaceId: current.workspace.id } }),
      prisma.accountProfile.findFirstOrThrow({
        where: { id, workspaceId: current.workspace.id },
        select: {
          isDefault: true,
          _count: {
            select: {
              topics: true,
              projects: true,
              calendarItems: true,
              ctaSnippets: true,
              contentTemplates: true,
            },
          },
        },
      }),
    ]);

    if (profileCount <= 1) {
      return errorResponse("At least one account profile is required for generation.", 409);
    }

    const hasLinkedContent = Object.values(linkedContentCount._count).some((count) => count > 0);

    if (hasLinkedContent) {
      return errorResponse("This account profile already has linked content. Keep it for history, or duplicate it and edit the copy.", 409);
    }

    await prisma.$transaction(async (tx) => {
      await tx.accountProfile.delete({ where: { id } });

      if (linkedContentCount.isDefault) {
        const nextDefault = await tx.accountProfile.findFirst({
          where: { workspaceId: current.workspace.id },
          orderBy: { updatedAt: "desc" },
          select: { id: true },
        });

        if (nextDefault) {
          await tx.accountProfile.update({
            where: { id: nextDefault.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return mapApiError(error);
  }
}
