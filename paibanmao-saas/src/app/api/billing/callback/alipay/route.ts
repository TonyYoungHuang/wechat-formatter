import { NextResponse } from "next/server";

import { markOrderPaid, markOrderPaymentFailed, parseAlipayCallbackBody, parseAlipayCallbackPayload, recordPaymentCallback, verifyAlipayCallback } from "@/lib/billing/callbacks";

function alipayResponse(body: "success" | "fail", status = 200) {
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const json = parseAlipayCallbackBody(rawBody);
  const signature =
    request.headers.get("alipay-signature") ||
    request.headers.get("x-paibanmao-signature") ||
    (typeof json?.sign === "string" ? json.sign : null);
  const verified = verifyAlipayCallback({
    rawBody,
    signature,
  });

  if (!verified) {
    await recordPaymentCallback({
      provider: "alipay",
      status: "rejected",
      rawBody,
      payload: json,
      signature,
      message: "invalid signature",
    });
    return alipayResponse("fail", 401);
  }

  const payload = parseAlipayCallbackPayload(json);

  if (!payload) {
    await recordPaymentCallback({
      provider: "alipay",
      status: "invalid_payload",
      rawBody,
      payload: json,
      signature,
      message: "orderId required",
    });
    return alipayResponse("fail", 400);
  }

  try {
    await markOrderPaid({
      provider: "alipay",
      orderId: payload.orderId,
      tradeNo: payload.tradeNo,
      providerOrderId: payload.providerOrderId,
      paid: payload.paid,
      amountCents: payload.amountCents,
      rawStatus: payload.rawStatus,
    });
    await recordPaymentCallback({
      provider: "alipay",
      status: "processed",
      rawBody,
      payload: json,
      signature,
      orderId: payload.orderId,
      providerTradeNo: payload.tradeNo,
    });
  } catch (error) {
    await markOrderPaymentFailed({
      provider: "alipay",
      orderId: payload.orderId,
      tradeNo: payload.tradeNo,
      providerOrderId: payload.providerOrderId,
    }).catch(() => null);
    await recordPaymentCallback({
      provider: "alipay",
      status: "failed",
      rawBody,
      payload: json,
      signature,
      orderId: payload.orderId,
      providerTradeNo: payload.tradeNo,
      message: error instanceof Error ? error.message : "callback processing failed",
    });
    return alipayResponse("fail", 500);
  }

  return alipayResponse("success");
}
