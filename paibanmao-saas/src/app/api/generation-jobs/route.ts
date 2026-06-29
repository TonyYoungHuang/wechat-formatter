import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { mapApiError } from "@/lib/http/errors";

export async function GET() {
  try {
    const current = await requireCurrentUser();
    const jobs = await prisma.generationJob.findMany({
      where: { workspaceId: current.workspace.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        promptTemplate: {
          select: {
            key: true,
            version: true,
          },
        },
      },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    return mapApiError(error);
  }
}
