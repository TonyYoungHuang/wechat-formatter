import { createHash, randomBytes } from "node:crypto";
import type { AuthTokenPurpose } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

const LOGIN_WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;

function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function hashSecurityToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function tokenTtlHours(purpose: AuthTokenPurpose) {
  return purpose === "email_verification" ? 24 : 1;
}

function tokenPath(purpose: AuthTokenPurpose) {
  return purpose === "email_verification" ? "/verify-email" : "/reset-password";
}

export function getRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export async function createAuthToken(userId: string, purpose: AuthTokenPurpose) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + tokenTtlHours(purpose) * 60 * 60 * 1000);

  await prisma.authToken.updateMany({
    where: {
      userId,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { usedAt: new Date() },
  });
  await prisma.authToken.create({
    data: {
      userId,
      purpose,
      tokenHash: hashSecurityToken(token),
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
    link: `${appUrl()}${tokenPath(purpose)}?token=${encodeURIComponent(token)}`,
  };
}

export async function consumeAuthToken(token: string, purpose: AuthTokenPurpose) {
  const record = await prisma.authToken.findUnique({
    where: { tokenHash: hashSecurityToken(token) },
    include: { user: true },
  });

  if (!record || record.purpose !== purpose || record.usedAt || record.expiresAt < new Date()) {
    throw new Error("Security token is invalid or expired.");
  }

  await prisma.authToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record.user;
}

export function exposeDevSecurityLink(link: string) {
  const appUrl = process.env.APP_URL || "";
  const localApp = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/.test(appUrl);
  return process.env.NODE_ENV === "production" && !localApp ? undefined : link;
}

export async function recordLoginAttempt(input: {
  userId?: string;
  email: string;
  ipAddress: string;
  userAgent?: string | null;
  success: boolean;
  reason?: string;
}) {
  await prisma.loginAttempt.create({
    data: {
      userId: input.userId,
      email: input.email,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      success: input.success,
      reason: input.reason,
    },
  });
}

export async function assertLoginAllowed(email: string, ipAddress: string) {
  const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000);
  const failures = await prisma.loginAttempt.count({
    where: {
      success: false,
      createdAt: { gte: since },
      OR: [{ email }, { ipAddress }],
    },
  });

  if (failures >= MAX_FAILED_ATTEMPTS) {
    throw new Error("Too many failed login attempts. Please try again later.");
  }
}
