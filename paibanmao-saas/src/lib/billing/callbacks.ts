import { createHmac, createVerify, timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/db/prisma";

type CallbackPayload = {
  orderId: string;
  tradeNo?: string;
  providerOrderId?: string;
};

export function parseCallbackPayload(value: unknown): CallbackPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const orderId = typeof payload.orderId === "string" ? payload.orderId : "";

  if (!orderId) {
    return null;
  }

  return {
    orderId,
    tradeNo: typeof payload.tradeNo === "string" ? payload.tradeNo : undefined,
    providerOrderId: typeof payload.providerOrderId === "string" ? payload.providerOrderId : undefined,
  };
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyWechatCallback(options: {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  nonce: string | null;
}) {
  const apiV3Key = process.env.WECHAT_PAY_API_V3_KEY;

  if (!apiV3Key) {
    return process.env.NODE_ENV !== "production";
  }

  if (!options.signature || !options.timestamp || !options.nonce) {
    return false;
  }

  const message = `${options.timestamp}\n${options.nonce}\n${options.rawBody}\n`;
  const expected = createHmac("sha256", apiV3Key).update(message).digest("base64");
  return safeEqual(expected, options.signature);
}

export function verifyAlipayCallback(options: {
  rawBody: string;
  signature: string | null;
}) {
  const publicKey = process.env.ALIPAY_PUBLIC_KEY_PEM;

  if (!publicKey) {
    return process.env.NODE_ENV !== "production";
  }

  if (!options.signature) {
    return false;
  }

  const verifier = createVerify("RSA-SHA256");
  verifier.update(options.rawBody);
  verifier.end();
  return verifier.verify(publicKey, options.signature, "base64");
}

export async function markOrderPaid(input: {
  orderId: string;
  provider: "wechat" | "alipay";
  tradeNo?: string;
  providerOrderId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.paymentOrder.findFirstOrThrow({
      where: {
        id: input.orderId,
        provider: input.provider,
      },
    });

    const paidOrder = await tx.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: "paid",
        paidAt: order.paidAt ?? new Date(),
        providerOrderId: input.providerOrderId ?? order.providerOrderId,
        providerTradeNo: input.tradeNo ?? order.providerTradeNo ?? `${input.provider.toUpperCase()}_${order.id}`,
      },
    });

    await tx.workspace.update({
      where: { id: paidOrder.workspaceId },
      data: { planCode: paidOrder.planCode },
    });

    await tx.subscription.upsert({
      where: { workspaceId: paidOrder.workspaceId },
      create: {
        workspaceId: paidOrder.workspaceId,
        planCode: paidOrder.planCode,
        status: "active",
      },
      update: {
        planCode: paidOrder.planCode,
        status: "active",
        startsAt: new Date(),
        expiresAt: null,
      },
    });

    return paidOrder;
  });
}
