import { NextResponse } from "next/server";

import { passwordResetSchema } from "@/lib/auth/schemas";
import { consumeAuthToken } from "@/lib/auth/security";
import { hashPassword } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";

export async function POST(request: Request) {
  try {
    const parsed = passwordResetSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("A valid reset token and new password are required.");
    }

    const user = await consumeAuthToken(parsed.data.token, "password_reset");
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(parsed.data.password) },
      }),
      prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ reset: true });
  } catch (error) {
    return mapApiError(error);
  }
}
