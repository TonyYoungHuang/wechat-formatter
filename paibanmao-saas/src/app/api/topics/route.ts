import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { topicCreateSchema } from "@/lib/topics/schemas";

export async function GET(request: Request) {
  try {
    const current = await requireCurrentUser();
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const accountProfileId = url.searchParams.get("accountProfileId") || undefined;

    const topics = await prisma.topic.findMany({
      where: {
        workspaceId: current.workspace.id,
        ...(status ? { status: status as never } : {}),
        ...(accountProfileId ? { accountProfileId } : {}),
      },
      include: {
        accountProfile: {
          select: { id: true, name: true, niche: true },
        },
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ topics });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = topicCreateSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Valid topic details are required.");
    }

    await prisma.accountProfile.findFirstOrThrow({
      where: { id: parsed.data.accountProfileId, workspaceId: current.workspace.id },
    });

    const topic = await prisma.topic.create({
      data: {
        ...parsed.data,
        workspaceId: current.workspace.id,
      },
    });

    return NextResponse.json({ topic }, { status: 201 });
  } catch (error) {
    return mapApiError(error);
  }
}
