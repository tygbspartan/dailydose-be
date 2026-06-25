import { getRedisClient } from "../config/redis.config";

export const CacheService = {
  async get<T>(key: string): Promise<T | null> {
    const t = Date.now();
    try {
      const client = getRedisClient();
      if (!client) return null;
      const data = await client.get(key);
      console.log(`[Cache GET] ${key.substring(0, 40)} ${Date.now() - t}ms ${data ? "HIT" : "MISS"}`);
      return data ? (JSON.parse(data) as T) : null;
    } catch {
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      const client = getRedisClient();
      if (!client) return;
      await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch {
      // Fail silently — cache miss is always safe
    }
  },

  // Fire-and-forget SET — call this when you don't want to block the response
  setBackground(key: string, value: unknown, ttlSeconds: number): void {
    void this.set(key, value, ttlSeconds);
  },

  async del(key: string): Promise<void> {
    try {
      const client = getRedisClient();
      if (!client) return;
      await client.del(key);
    } catch {}
  },

  // Delete all keys matching a pattern (e.g. "products:*")
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const client = getRedisClient();
      if (!client) return;

      let cursor = "0";
      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await client.del(...keys);
        }
      } while (cursor !== "0");
    } catch {}
  },

  // Fire-and-forget invalidation — doesn't block the write response
  invalidatePatternBackground(pattern: string): void {
    void this.invalidatePattern(pattern);
  },
};

// TTL constants (seconds)
export const TTL = {
  PRODUCT_LIST: 300,    // 5 min
  PRODUCT_SLUG: 600,    // 10 min
  BRAND: 900,           // 15 min
  CATEGORY: 1800,       // 30 min
};
