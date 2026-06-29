import { NextResponse } from "next/server";
import { z } from "zod";

import { checkContentCompliance } from "@/lib/compliance/check";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";

const schema = z.object({
  projectId: z.string().min(1).optional(),
  title: z.string().max(160).optional(),
  content: z.string().min(1).max(50000),
  html: z.string().max(200000).optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Content is required for compliance checking.");
    }

    const result = checkContentCompliance(parsed.data);

    if (!parsed.data.projectId) {
      return NextResponse.json(result);
    }

    const current = await requireCurrentUser();
    await prisma.contentProject.findFirstOrThrow({
      where: { id: parsed.data.projectId, workspaceId: current.workspace.id },
    });

    const report = await prisma.complianceReport.create({
      data: {
        projectId: parsed.data.projectId,
        score: result.score,
        level: result.level,
        summary: result.summary,
        issues: {
          create: result.issues,
        },
      },
      include: { issues: true },
    });

    return NextResponse.json({ ...result, report });
  } catch (error) {
    return mapApiError(error);
  }
}
