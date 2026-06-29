import { NextResponse } from "next/server";
import { createStarterAccountProfileData } from "@/lib/account-profiles/service";
import { prisma } from "@/lib/db/prisma";
import { createSession, hashPassword } from "@/lib/auth/session";
import { registerSchema } from "@/lib/auth/schemas";
import { errorResponse } from "@/lib/http/errors";

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("Valid registration details are required.");
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return errorResponse("This email is already registered.", 409);
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: hashPassword(parsed.data.password),
      },
    });

    const workspace = await tx.workspace.create({
      data: { name: `${parsed.data.name}'s workspace` },
    });

    await tx.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        role: "owner",
      },
    });

    await tx.accountProfile.create({
      data: {
        ...createStarterAccountProfileData(parsed.data.name),
        workspaceId: workspace.id,
      },
    });

    return { user, workspace };
  });

  await createSession(result.user.id);

  return NextResponse.json({
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
    },
    workspace: {
      id: result.workspace.id,
      name: result.workspace.name,
      planCode: result.workspace.planCode,
    },
  });
}
