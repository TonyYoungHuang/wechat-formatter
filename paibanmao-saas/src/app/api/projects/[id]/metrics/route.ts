import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { projectMetricCreateSchema } from "@/lib/projects/metric-schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;

    await prisma.contentProject.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
      select: { id: true },
    });

    const metrics = await prisma.contentMetric.findMany({
      where: { projectId: id },
      orderBy: { recordedAt: "desc" },
    });

    return NextResponse.json({ metrics });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;
    const parsed = projectMetricCreateSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Metric payload is invalid.");
    }

    await prisma.contentProject.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
      select: { id: true },
    });

    const metric = await prisma.$transaction(async (tx) => {
      const created = await tx.contentMetric.create({
        data: {
          projectId: id,
          entry: parsed.data.entry,
          readCount: parsed.data.readCount,
          likeCount: parsed.data.likeCount,
          watchCount: parsed.data.watchCount,
          favoriteCount: parsed.data.favoriteCount,
          commentCount: parsed.data.commentCount,
          followerGain: parsed.data.followerGain,
          consultationCount: parsed.data.consultationCount,
          dealCount: parsed.data.dealCount,
          note: parsed.data.note,
          recordedAt: parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : undefined,
        },
      });

      await tx.contentProject.update({
        where: { id },
        data: {
          status: "reviewed",
          reviewNote: parsed.data.reviewNote,
        },
      });

      return created;
    });

    return NextResponse.json({ metric }, { status: 201 });
  } catch (error) {
    return mapApiError(error);
  }
}
