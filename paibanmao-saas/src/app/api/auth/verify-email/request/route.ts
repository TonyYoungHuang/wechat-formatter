import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/session";
import { createAuthToken, exposeDevSecurityLink } from "@/lib/auth/security";
import { mapApiError } from "@/lib/http/errors";

export async function POST() {
  try {
    const current = await requireCurrentUser();

    if (current.user.emailVerifiedAt) {
      return NextResponse.json({ sent: false, verified: true });
    }

    const verification = await createAuthToken(current.user.id, "email_verification");

    return NextResponse.json({
      sent: true,
      verified: false,
      verificationLink: exposeDevSecurityLink(verification.link),
    });
  } catch (error) {
    return mapApiError(error);
  }
}
