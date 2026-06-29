import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { mapApiError } from "@/lib/http/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;
    const report = await prisma.complianceReport.findFirstOrThrow({
      where: {
        id,
        project: {
          workspaceId: current.workspace.id,
        },
      },
      include: {
        issues: { orderBy: { createdAt: "asc" } },
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            accountProfile: {
              select: { id: true, name: true, niche: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ report });
  } catch (error) {
    return mapApiError(error);
  }
}
