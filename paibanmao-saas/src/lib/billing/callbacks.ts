import { createDecipheriv, createHmac, createVerify, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type CallbackPayload = {
  orderId: string;
  tradeNo?: string;
  providerOrderId?: string;
  paid?: boolean;
  amountCents?: number;
  rawStatus?: string;
};

function parseAmountCents(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100);
  }

  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : undefined;
}

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
    paid: typeof payload.paid === "boolean" ? payload.paid : undefined,
    amountCents: typeof payload.amountCents === "number" ? payload.amountCents : parseAmountCents(payload.amount),
    rawStatus: typeof payload.status === "string" ? payload.status : undefined,
  };
}

function decryptWechatResource(resource: unknown): Record<string, unknown> | null {
  if (!resource || typeof resource !== "object" || !process.env.WECHAT_PAY_API_V3_KEY) {
    return null;
  }

  const payload = resource as Record<string, unknown>;
  const ciphertext = typeof payload.ciphertext === "string" ? payload.ciphertext : "";
  const nonce = typeof payload.nonce === "string" ? payload.nonce : "";
  const associatedData = typeof payload.associated_data === "string" ? payload.associated_data : "";

  if (!ciphertext || !nonce) {
    return null;
  }

  try {
    const encrypted = Buffer.from(ciphertext, "base64");
    const authTag = encrypted.subarray(encrypted.length - 16);
    const data = encrypted.subarray(0, encrypted.length - 16);
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from(process.env.WECHAT_PAY_API_V3_KEY), nonce);
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from(associatedData));
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    return JSON.parse(decrypted) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function parseWechatCallbackPayload(value: Record<string, unknown> | null): CallbackPayload | null {
  const simple = parseCallbackPayload(value);
  if (simple) {
    return simple;
  }

  const decrypted = decryptWechatResource(value?.resource);
  if (!decrypted) {
    return null;
  }

  const orderId = typeof decrypted.out_trade_no === "string" ? decrypted.out_trade_no : "";
  if (!orderId) {
    return null;
  }

  return {
    orderId,
    tradeNo: typeof decrypted.transaction_id === "string" ? decrypted.transaction_id : undefined,
    providerOrderId: typeof decrypted.transaction_id === "string" ? decrypted.transaction_id : undefined,
    paid: decrypted.trade_state === "SUCCESS",
    amountCents:
      typeof (decrypted.amount as Record<string, unknown> | undefined)?.total === "number"
        ? ((decrypted.amount as Record<string, unknown>).total as number)
        : undefined,
    rawStatus: typeof decrypted.trade_state === "string" ? decrypted.trade_state : undefined,
  };
}

function parseUrlEncodedBody(rawBody: string) {
  const params = new URLSearchParams(rawBody);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return Object.keys(result).length ? result : null;
}

export function parseAlipayCallbackBody(rawBody: string) {
  const json = parseCallbackJson(rawBody);
  if (json) {
    return json;
  }
  return parseUrlEncodedBody(rawBody);
}

export function parseAlipayCallbackPayload(value: Record<string, unknown> | null): CallbackPayload | null {
  const simple = parseCallbackPayload(value);
  if (simple) {
    return simple;
  }

  const orderId = typeof value?.out_trade_no === "string" ? value.out_trade_no : "";
  if (!orderId) {
    return null;
  }

  return {
    orderId,
    tradeNo: typeof value?.trade_no === "string" ? value.trade_no : undefined,
    providerOrderId: typeof value?.trade_no === "string" ? value.trade_no : undefined,
    paid: value?.trade_status === "TRADE_SUCCESS" || value?.trade_status === "TRADE_FINISHED",
    amountCents: parseAmountCents(value?.total_amount),
    rawStatus: typeof value?.trade_status === "string" ? value.trade_status : undefined,
  };
}

export function parseCallbackJson(rawBody: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(rawBody || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function recordPaymentCallback(input: {
  provider: "wechat" | "alipay";
  status: string;
  rawBody: string;
  payload?: Record<string, unknown> | null;
  signature?: string | null;
  message?: string;
  orderId?: string;
  providerTradeNo?: string;
}) {
  const order = input.orderId
    ? await prisma.paymentOrder.findFirst({
        where: { id: input.orderId, provider: input.provider },
        select: { id: true, workspaceId: true },
      })
    : null;

  return prisma.paymentCallback.create({
    data: {
      workspaceId: order?.workspaceId,
      paymentOrderId: order?.id,
      provider: input.provider,
      status: input.status,
      providerTradeNo: input.providerTradeNo,
      rawBody: input.rawBody,
      payload: input.payload ? (input.payload as Prisma.InputJsonValue) : undefined,
      signature: input.signature,
      message: input.message,
    },
  });
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function isFreshUnixTimestamp(value: string | null | undefined, maxAgeSeconds = 600) {
  if (!value || !/^\d+$/.test(value)) {
    return false;
  }

  const signedAt = Number(value);
  if (!Number.isFinite(signedAt)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - signedAt) <= maxAgeSeconds;
}

function localSmokeCallbacksAllowed() {
  const appUrl = process.env.APP_URL || "";
  return Boolean(process.env.PAYMENT_CALLBACK_SMOKE_SECRET && /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/.test(appUrl));
}

function verifyLocalSmokeCallback(options: {
  provider: "wechat" | "alipay";
  rawBody: string;
  signature: string | null;
  timestamp?: string | null;
  nonce?: string | null;
}) {
  const secret = process.env.PAYMENT_CALLBACK_SMOKE_SECRET;

  if (!secret || !localSmokeCallbacksAllowed() || !options.signature || !options.timestamp || !options.nonce) {
    return false;
  }

  if (!isFreshUnixTimestamp(options.timestamp)) {
    return false;
  }

  const message = `${options.provider}\n${options.timestamp}\n${options.nonce}\n${options.rawBody}`;
  const expected = createHmac("sha256", secret).update(message).digest("base64");
  return safeEqual(expected, options.signature);
}

export function verifyWechatCallback(options: {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  nonce: string | null;
}) {
  if (verifyLocalSmokeCallback({ provider: "wechat", ...options })) {
    return true;
  }

  const platformCert = process.env.WECHAT_PAY_PLATFORM_CERT_PEM?.replace(/\\n/g, "\n");

  if (platformCert && options.signature && options.timestamp && options.nonce) {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${options.timestamp}\n${options.nonce}\n${options.rawBody}\n`);
    verifier.end();
    return verifier.verify(platformCert, options.signature, "base64");
  }

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
  timestamp?: string | null;
  nonce?: string | null;
}) {
  if (verifyLocalSmokeCallback({ provider: "alipay", ...options })) {
    return true;
  }

  const publicKey = process.env.ALIPAY_PUBLIC_KEY_PEM;

  if (!publicKey) {
    return process.env.NODE_ENV !== "production";
  }

  if (!options.signature) {
    return false;
  }

  const payload = parseAlipayCallbackBody(options.rawBody);
  const content =
    payload && "sign" in payload
      ? Object.keys(payload)
          .filter((key) => key !== "sign" && key !== "sign_type" && payload[key] !== "")
          .sort()
          .map((key) => `${key}=${payload[key]}`)
          .join("&")
      : options.rawBody;

  const verifier = createVerify("RSA-SHA256");
  verifier.update(content);
  verifier.end();
  return verifier.verify(publicKey, options.signature, "base64");
}

export async function markOrderPaid(input: {
  orderId: string;
  provider: "wechat" | "alipay";
  tradeNo?: string;
  providerOrderId?: string;
  paid?: boolean;
  amountCents?: number;
  rawStatus?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.paymentOrder.findFirstOrThrow({
      where: {
        id: input.orderId,
        provider: input.provider,
      },
    });

    if (input.paid === false) {
      throw new Error(`Payment callback is not successful: ${input.rawStatus || "unknown"}.`);
    }

    if (typeof input.amountCents === "number" && input.amountCents !== order.amountCents) {
      throw new Error("Payment callback amount does not match the order amount.");
    }

    if (order.status !== "pending" && order.status !== "paid") {
      throw new Error(`Payment order is ${order.status} and cannot be marked paid.`);
    }

    if (order.status === "paid") {
      return tx.paymentOrder.update({
        where: { id: order.id },
        data: {
          providerOrderId: input.providerOrderId ?? order.providerOrderId,
          providerTradeNo: input.tradeNo ?? order.providerTradeNo,
        },
      });
    }

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

export async function markOrderPaymentFailed(input: {
  orderId: string;
  provider: "wechat" | "alipay";
  tradeNo?: string;
  providerOrderId?: string;
}) {
  return prisma.paymentOrder.updateMany({
    where: {
      id: input.orderId,
      provider: input.provider,
      status: { not: "paid" },
    },
    data: {
      status: "failed",
      providerOrderId: input.providerOrderId,
      providerTradeNo: input.tradeNo,
    },
  });
}
