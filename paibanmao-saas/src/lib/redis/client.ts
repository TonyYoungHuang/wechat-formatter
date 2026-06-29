import Redis from "ioredis";
import type { ConnectionOptions } from "bullmq";

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

export function getRedis() {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
      commandTimeout: 1500,
    });
    globalForRedis.redis.on("error", () => null);
  }

  return globalForRedis.redis;
}

export async function ensureRedisConnected(redis: Redis) {
  if (redis.status === "ready") {
    return redis;
  }

  if (redis.status === "wait" || redis.status === "end") {
    await redis.connect();
    return redis;
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out while waiting for Redis connection."));
    }, 5000);

    const cleanup = () => {
      clearTimeout(timeout);
      redis.off("ready", handleReady);
      redis.off("error", handleError);
    };

    const handleReady = () => {
      cleanup();
      resolve();
    };

    const handleError = (error: Error) => {
      cleanup();
      reject(error);
    };

    redis.once("ready", handleReady);
    redis.once("error", handleError);

    if (redis.status === "ready") {
      handleReady();
    }
  });

  return redis;
}

export function createBullMqConnection(): ConnectionOptions | null {
  if (!process.env.REDIS_URL) {
    return null;
  }

  return {
    url: process.env.REDIS_URL,
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
    connectTimeout: 1500,
  };
}
