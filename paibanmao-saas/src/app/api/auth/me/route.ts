import { NextResponse } from "next/server";
import { getCurrentUser, isSiteAdminEmail } from "@/lib/auth/session";

export async function GET() {
  const current = await getCurrentUser();

  if (!current) {
    return NextResponse.json({ user: null, workspace: null });
  }

  return NextResponse.json({
    user: {
      id: current.user.id,
      name: current.user.name,
      email: current.user.email,
      emailVerifiedAt: current.user.emailVerifiedAt,
      isSiteAdmin: isSiteAdminEmail(current.user.email),
    },
    workspace: {
      id: current.workspace.id,
      name: current.workspace.name,
      planCode: current.workspace.planCode,
    },
  });
}
