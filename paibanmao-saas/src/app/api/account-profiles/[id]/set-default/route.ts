import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/session";
import { normalizeDefaultProfile } from "@/lib/account-profiles/service";
import { prisma } from "@/lib/db/prisma";
import { mapApiError } from "@/lib/http/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;

    await prisma.accountProfile.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
    });

    await normalizeDefaultProfile(current.workspace.id, id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return mapApiError(error);
  }
}

