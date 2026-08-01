import { Redis } from "ioredis";

let redisClient: Redis | null = null;
const memoryCache = new Map<string, { value: any; expiresAt: number }>();

export const initCacheService = () => {
  if (process.env.REDIS_URL) {
    try {
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      redisClient.on("error", (err) => {
        console.warn("⚠️ Redis connection error, falling back to memory cache:", err.message);
      });

      redisClient.connect().then(() => {
        console.log("⚡ Connected to Redis Caching Service");
      }).catch(() => {
        console.warn("⚠️ Redis connection failed. Using in-memory fallback cache.");
        redisClient = null;
      });
    } catch (e) {
      console.warn("⚠️ Failed to initialize Redis client. Using in-memory fallback cache.");
    }
  } else {
    console.log("ℹ️ No REDIS_URL configured. Using in-memory fallback cache.");
  }
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  if (redisClient) {
    try {
      const data = await redisClient.get(key);
      if (data) return JSON.parse(data) as T;
    } catch (err) {
      console.warn(`Cache get failed for key ${key}, checking fallback:`, err);
    }
  }

  const cached = memoryCache.get(key);
  if (cached) {
    if (Date.now() > cached.expiresAt) {
      memoryCache.delete(key);
      return null;
    }
    return cached.value as T;
  }

  return null;
};

export const setCache = async (key: string, value: any, ttlSeconds: number = 300): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
      return;
    } catch (err) {
      console.warn(`Cache set failed for key ${key}:`, err);
    }
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

export const deleteCache = async (key: string): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.del(key);
    } catch (err) {
      console.warn(`Cache delete failed for key ${key}:`, err);
    }
  }
  memoryCache.delete(key);
};

export const isRedisConnected = (): boolean => {
  return redisClient !== null && redisClient.status === "ready";
};
