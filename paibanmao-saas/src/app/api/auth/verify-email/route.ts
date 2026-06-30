import { NextResponse } from "next/server";

import { tokenSchema } from "@/lib/auth/schemas";
import { consumeAuthToken } from "@/lib/auth/security";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";

export async function POST(request: Request) {
  try {
    const parsed = tokenSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Verification token is required.");
    }

    const user = await consumeAuthToken(parsed.data.token, "email_verification");
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
    });

    return NextResponse.json({
      user: {
        id: updated.id,
        email: updated.email,
        emailVerifiedAt: updated.emailVerifiedAt,
      },
    });
  } catch (error) {
    return mapApiError(error);
  }
}
