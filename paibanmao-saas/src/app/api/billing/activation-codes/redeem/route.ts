import { NextResponse } from "next/server";

import { redeemActivationCode } from "@/lib/activation-codes/service";
import { redeemActivationCodeSchema } from "@/lib/activation-codes/schemas";
import { requireCurrentUser } from "@/lib/auth/session";
import { errorResponse, mapApiError } from "@/lib/http/errors";

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = redeemActivationCodeSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("请输入有效的激活码。");
    }

    const result = await redeemActivationCode({
      rawCode: parsed.data.code,
      workspaceId: current.workspace.id,
      userId: current.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    return mapApiError(error);
  }
}
