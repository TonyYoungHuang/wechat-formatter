import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/auth/schemas";
import { createSession, verifyPassword } from "@/lib/auth/session";
import { errorResponse } from "@/lib/http/errors";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("Email and password are required.");
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return errorResponse("Email or password is incorrect.", 401);
  }

  await createSession(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
}
