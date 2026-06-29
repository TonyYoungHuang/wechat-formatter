import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { contentTemplatePatchSchema } from "@/lib/templates/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;
    const parsed = contentTemplatePatchSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Template payload is invalid.");
    }

    await prisma.contentTemplate.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
      select: { id: true },
    });

    if (parsed.data.accountProfileId) {
      await prisma.accountProfile.findFirstOrThrow({
        where: { id: parsed.data.accountProfileId, workspaceId: current.workspace.id },
        select: { id: true },
      });
    }

    const template = await prisma.contentTemplate.update({
      where: { id },
      data: parsed.data,
      include: {
        accountProfile: { select: { id: true, name: true, niche: true } },
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;

    await prisma.contentTemplate.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
      select: { id: true },
    });

    await prisma.contentTemplate.update({
      where: { id },
      data: { active: false },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return mapApiError(error);
  }
}
