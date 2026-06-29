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
