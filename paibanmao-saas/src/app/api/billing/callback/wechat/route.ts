import { NextResponse } from "next/server";

import { markOrderPaid, parseCallbackJson, parseWechatCallbackPayload, recordPaymentCallback, verifyWechatCallback } from "@/lib/billing/callbacks";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("wechatpay-signature") || request.headers.get("x-paibanmao-signature");
  const verified = verifyWechatCallback({
    rawBody,
    signature,
    timestamp: request.headers.get("wechatpay-timestamp") || request.headers.get("x-paibanmao-timestamp"),
    nonce: request.headers.get("wechatpay-nonce") || request.headers.get("x-paibanmao-nonce"),
  });
  const json = parseCallbackJson(rawBody);

  if (!verified) {
    await recordPaymentCallback({
      provider: "wechat",
      status: "rejected",
      rawBody,
      payload: json,
      signature,
      message: "invalid signature",
    });
    return NextResponse.json({ message: "invalid signature" }, { status: 401 });
  }

  const payload = parseWechatCallbackPayload(json);

  if (!payload) {
    await recordPaymentCallback({
      provider: "wechat",
      status: "invalid_payload",
      rawBody,
      payload: json,
      signature,
      message: "orderId required",
    });
    return NextResponse.json({ message: "orderId required" }, { status: 400 });
  }

  try {
    await markOrderPaid({
      provider: "wechat",
      orderId: payload.orderId,
      tradeNo: payload.tradeNo,
      providerOrderId: payload.providerOrderId,
    });
    await recordPaymentCallback({
      provider: "wechat",
      status: "processed",
      rawBody,
      payload: json,
      signature,
      orderId: payload.orderId,
      providerTradeNo: payload.tradeNo,
    });
  } catch (error) {
    await recordPaymentCallback({
      provider: "wechat",
      status: "failed",
      rawBody,
      payload: json,
      signature,
      orderId: payload.orderId,
      providerTradeNo: payload.tradeNo,
      message: error instanceof Error ? error.message : "callback processing failed",
    });
    throw error;
  }

  return NextResponse.json({ ok: true });
}
