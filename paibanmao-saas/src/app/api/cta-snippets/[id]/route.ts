import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ctaSnippetPatchSchema } from "@/lib/cta/schemas";
import { errorResponse, mapApiError } from "@/lib/http/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;
    const parsed = ctaSnippetPatchSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("CTA payload is invalid.");
    }

    await prisma.ctaSnippet.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
      select: { id: true },
    });

    if (parsed.data.accountProfileId) {
      await prisma.accountProfile.findFirstOrThrow({
        where: { id: parsed.data.accountProfileId, workspaceId: current.workspace.id },
        select: { id: true },
      });
    }

    const snippet = await prisma.ctaSnippet.update({
      where: { id },
      data: parsed.data,
      include: {
        accountProfile: { select: { id: true, name: true, niche: true } },
      },
    });

    return NextResponse.json({ snippet });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;

    await prisma.ctaSnippet.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
      select: { id: true },
    });

    await prisma.ctaSnippet.update({
      where: { id },
      data: { active: false },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return mapApiError(error);
  }
}
