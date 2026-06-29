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

    await prisma.accountProfile.delete({ where: { id } });

    return new Response(null, { status: 204 });
  } catch (error) {
    return mapApiError(error);
  }
}
