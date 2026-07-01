import { NextResponse } from "next/server";

import { createActivationCodes } from "@/lib/activation-codes/service";
import { createActivationCodesSchema } from "@/lib/activation-codes/schemas";
import { requireSiteAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";

export async function GET() {
  try {
    await requireSiteAdmin();

    const activationCodes = await prisma.activationCode.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        redemptions: {
          orderBy: { redeemedAt: "desc" },
          take: 3,
          include: {
            user: { select: { email: true, name: true } },
            workspace: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({ activationCodes });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const current = await requireSiteAdmin();
    const parsed = createActivationCodesSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("激活码生成参数不正确。");
    }

    const codes = await createActivationCodes({
      ...parsed.data,
      createdByUserId: current.user.id,
    });

    return NextResponse.json({
      codes,
      message: "激活码已经生成。明文激活码只在本次返回，请立即复制保存。",
    });
  } catch (error) {
    return mapApiError(error);
  }
}
