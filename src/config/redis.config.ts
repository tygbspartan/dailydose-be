import Redis from "ioredis";
import { config } from "./env.config";

let redis: Redis | null = null;

export const getRedisClient = (): Redis | null => {
  if (!config.redisUrl) return null;

  if (!redis) {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      commandTimeout: 3000,   // give up on a single command after 3s
      keepAlive: 10000,       // TCP keepalive every 10s — prevents idle disconnects
      enableAutoPipelining: true, // batch simultaneous commands into one round trip
    });

    redis.on("error", (err) => {
      console.error("Redis error:", err.message);
    });

    redis.on("connect", () => {
      console.log("Redis connected");
    });
  }

  return redis;
};
