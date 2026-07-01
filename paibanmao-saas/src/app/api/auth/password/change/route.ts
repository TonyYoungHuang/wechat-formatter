import { NextResponse } from "next/server";

import { passwordChangeSchema } from "@/lib/auth/schemas";
import { hashPassword, requireCurrentUser, verifyPassword } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = passwordChangeSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("请输入当前密码和至少 8 位的新密码。");
    }

    if (!verifyPassword(parsed.data.currentPassword, current.user.passwordHash)) {
      return errorResponse("当前密码不正确。", 401);
    }

    await prisma.user.update({
      where: { id: current.user.id },
      data: { passwordHash: hashPassword(parsed.data.newPassword) },
    });

    return NextResponse.json({ changed: true });
  } catch (error) {
    return mapApiError(error);
  }
}
