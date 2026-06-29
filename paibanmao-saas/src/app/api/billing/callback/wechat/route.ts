import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const orderId = typeof payload.orderId === "string" ? payload.orderId : "";

  if (!orderId) {
    return NextResponse.json({ message: "orderId required" }, { status: 400 });
  }

  const order = await prisma.paymentOrder.update({
    where: { id: orderId },
    data: {
      status: "paid",
      paidAt: new Date(),
      providerTradeNo: typeof payload.tradeNo === "string" ? payload.tradeNo : `WECHAT_PLACEHOLDER_${orderId}`,
    },
  });

  await prisma.workspace.update({
    where: { id: order.workspaceId },
    data: { planCode: order.planCode },
  });

  return NextResponse.json({ ok: true });
}

