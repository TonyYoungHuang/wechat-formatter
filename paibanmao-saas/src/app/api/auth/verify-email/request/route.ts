import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/session";
import { createAuthToken, exposeDevSecurityLink } from "@/lib/auth/security";
import { sendVerificationEmail } from "@/lib/email/service";
import { mapApiError } from "@/lib/http/errors";

export async function POST() {
  try {
    const current = await requireCurrentUser();

    if (current.user.emailVerifiedAt) {
      return NextResponse.json({ sent: false, verified: true });
    }

    const verification = await createAuthToken(current.user.id, "email_verification");
    const emailDelivery = await sendVerificationEmail({
      to: current.user.email,
      name: current.user.name,
      link: verification.link,
    });

    return NextResponse.json({
      sent: true,
      verified: false,
      emailSent: emailDelivery.sent,
      emailConfigured: emailDelivery.configured,
      verificationLink: exposeDevSecurityLink(verification.link),
    });
  } catch (error) {
    return mapApiError(error);
  }
}
