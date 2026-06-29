import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/session";
import { accountProfileSchema } from "@/lib/account-profiles/schemas";
import { assertCanCreateAccountProfile, normalizeDefaultProfile } from "@/lib/account-profiles/service";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";

export async function GET() {
  try {
    const current = await requireCurrentUser();
    const profiles = await prisma.accountProfile.findMany({
      where: { workspaceId: current.workspace.id },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({ profiles });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = accountProfileSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Complete account profile details are required.");
    }

    await assertCanCreateAccountProfile(current.workspace.id, current.workspace.planCode);

    const existingDefault = await prisma.accountProfile.findFirst({
      where: { workspaceId: current.workspace.id, isDefault: true },
    });

    const profile = await prisma.accountProfile.create({
      data: {
        ...parsed.data,
        workspaceId: current.workspace.id,
        isDefault: parsed.data.isDefault || !existingDefault,
      },
    });

    if (profile.isDefault) {
      await normalizeDefaultProfile(current.workspace.id, profile.id);
    }

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    return mapApiError(error);
  }
}
