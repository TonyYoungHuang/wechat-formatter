import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/auth/schemas";
import { createSession, verifyPassword } from "@/lib/auth/session";
import { errorResponse } from "@/lib/http/errors";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("请输入邮箱和密码。");
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return errorResponse("邮箱或密码不正确。", 401);
  }

  await createSession(user.id);

  return Response.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
}

