import { NextResponse } from "next/server";

import { emailSchema } from "@/lib/auth/schemas";
import { createAuthToken, exposeDevSecurityLink } from "@/lib/auth/security";
import { prisma } from "@/lib/db/prisma";
import { sendPasswordResetEmail } from "@/lib/email/service";
import { errorResponse, mapApiError } from "@/lib/http/errors";

export async function POST(request: Request) {
  try {
    const parsed = emailSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("A valid email is required.");
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

    if (!user) {
      return NextResponse.json({ sent: true });
    }

    const reset = await createAuthToken(user.id, "password_reset");
    const emailDelivery = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      link: reset.link,
    });

    return NextResponse.json({
      sent: true,
      emailSent: emailDelivery.sent,
      emailConfigured: emailDelivery.configured,
      resetLink: exposeDevSecurityLink(reset.link),
    });
  } catch (error) {
    return mapApiError(error);
  }
}
