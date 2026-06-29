import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { topicPatchSchema } from "@/lib/topics/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;
    const parsed = topicPatchSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Topic payload is invalid.");
    }

    await prisma.topic.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
    });

    if (parsed.data.accountProfileId) {
      await prisma.accountProfile.findFirstOrThrow({
        where: { id: parsed.data.accountProfileId, workspaceId: current.workspace.id },
      });
    }

    const topic = await prisma.topic.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ topic });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;

    await prisma.topic.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
    });

    await prisma.topic.delete({ where: { id } });

    return new Response(null, { status: 204 });
  } catch (error) {
    return mapApiError(error);
  }
}
