import { NextResponse } from "next/server";

import { markOrderPaid, parseCallbackPayload, verifyAlipayCallback } from "@/lib/billing/callbacks";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verified = verifyAlipayCallback({
    rawBody,
    signature: request.headers.get("alipay-signature") || request.headers.get("x-paibanmao-signature"),
  });

  if (!verified) {
    return NextResponse.json({ message: "invalid signature" }, { status: 401 });
  }

  const payload = parseCallbackPayload(JSON.parse(rawBody || "{}"));

  if (!payload) {
    return NextResponse.json({ message: "orderId required" }, { status: 400 });
  }

  await markOrderPaid({
    provider: "alipay",
    orderId: payload.orderId,
    tradeNo: payload.tradeNo,
    providerOrderId: payload.providerOrderId,
  });

  return NextResponse.json({ ok: true });
}
