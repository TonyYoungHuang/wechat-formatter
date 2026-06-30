import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/auth/schemas";
import { createSession, verifyPassword } from "@/lib/auth/session";
import { assertLoginAllowed, getRequestIp, recordLoginAttempt } from "@/lib/auth/security";
import { errorResponse } from "@/lib/http/errors";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("Email and password are required.");
  }

  const ipAddress = getRequestIp(request);
  const userAgent = request.headers.get("user-agent");

  try {
    await assertLoginAllowed(parsed.data.email, ipAddress);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Too many failed login attempts.", 429);
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    await recordLoginAttempt({
      userId: user?.id,
      email: parsed.data.email,
      ipAddress,
      userAgent,
      success: false,
      reason: "invalid_credentials",
    });
    return errorResponse("Email or password is incorrect.", 401);
  }

  await createSession(user.id);
  await recordLoginAttempt({
    userId: user.id,
    email: user.email,
    ipAddress,
    userAgent,
    success: true,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
    },
  });
}
