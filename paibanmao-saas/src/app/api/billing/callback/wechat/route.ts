import { NextResponse } from "next/server";

import { markOrderPaid, markOrderPaymentFailed, parseCallbackJson, parseWechatCallbackPayload, recordPaymentCallback, verifyWechatCallback } from "@/lib/billing/callbacks";

function wechatSuccessResponse() {
  return NextResponse.json({ code: "SUCCESS" });
}

function wechatFailResponse(message: string, status = 500) {
  return NextResponse.json({ code: "FAIL", message }, { status });
}

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
    return wechatFailResponse("invalid signature", 401);
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
    return wechatFailResponse("orderId required", 400);
  }

  try {
    await markOrderPaid({
      provider: "wechat",
      orderId: payload.orderId,
      tradeNo: payload.tradeNo,
      providerOrderId: payload.providerOrderId,
      paid: payload.paid,
      amountCents: payload.amountCents,
      rawStatus: payload.rawStatus,
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
    await markOrderPaymentFailed({
      provider: "wechat",
      orderId: payload.orderId,
      tradeNo: payload.tradeNo,
      providerOrderId: payload.providerOrderId,
    }).catch(() => null);
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
    return wechatFailResponse(error instanceof Error ? error.message : "callback processing failed");
  }

  return wechatSuccessResponse();
}
