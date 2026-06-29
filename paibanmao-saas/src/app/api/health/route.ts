import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { ensureRedisConnected, getRedis } from "@/lib/redis/client";

function safeHealthMessage(error: unknown, fallback: string) {
  if (process.env.NODE_ENV === "production") {
    return fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  } catch (error) {
    return { status: "error", message: safeHealthMessage(error, "Database check failed.") };
  }
}

async function checkRedis() {
  const redis = getRedis();

  if (!redis) {
    return {
      status: process.env.NODE_ENV === "production" ? "error" : "not_configured",
      message: "REDIS_URL is not configured.",
    };
  }

  try {
    await ensureRedisConnected(redis);
    const pong = await redis.ping();
    return { status: pong === "PONG" ? "ok" : "error", message: pong };
  } catch (error) {
    return { status: "error", message: safeHealthMessage(error, "Redis check failed.") };
  }
}

export async function GET() {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  const healthy = database.status === "ok" && (redis.status === "ok" || redis.status === "not_configured");

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "paibanmao-saas",
      timestamp: new Date().toISOString(),
      checks: {
        database,
        redis,
      },
    },
    { status: healthy ? 200 : 503 },
  );
}
