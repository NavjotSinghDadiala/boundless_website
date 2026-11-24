import { Redis } from "@upstash/redis";

/**
 * Minimal Redis REST interface used by the cache layer.
 * Allows clean mocking in isolated unit tests without network or real credentials.
 */
export interface RedisClientLike {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: string, opts?: { ex?: number }): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  srem(key: string, ...members: string[]): Promise<number>;
}

let cachedClient: RedisClientLike | null | undefined = undefined;
let testClientOverride: RedisClientLike | null | undefined = undefined;

/**
 * Safely validates whether Upstash Redis REST credentials are configured on the server.
 * Never logs or exposes credential values.
 */
export function isRedisConfigured(): boolean {
  if (typeof window !== "undefined") {
    return false;
  }

  if (testClientOverride !== undefined) {
    return testClientOverride !== null;
  }

  const url = (process.env.UPSTASH_REDIS_REST_URL || "").trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();

  if (!url || !token) {
    return false;
  }

  if (!url.startsWith("https://")) {
    return false;
  }

  return true;
}

/**
 * Returns a lazy singleton Upstash Redis REST client, or null if caching is disabled/unconfigured.
 * Strictly server-side; never exposes or logs credentials.
 */
export function getRedisClient(): RedisClientLike | null {
  if (typeof window !== "undefined") {
    return null;
  }

  if (testClientOverride !== undefined) {
    return testClientOverride;
  }

  if (cachedClient !== undefined) {
    return cachedClient;
  }

  if (!isRedisConfigured()) {
    cachedClient = null;
    return null;
  }

  try {
    const url = (process.env.UPSTASH_REDIS_REST_URL || "").trim();
    const token = (process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();

    cachedClient = new Redis({
      url,
      token,
      automaticDeserialization: false,
    }) as unknown as RedisClientLike;

    return cachedClient;
  } catch {
    console.warn("[RedisCache] Failed to initialize Upstash Redis client. Caching disabled.");
    cachedClient = null;
    return null;
  }
}

/**
 * Test-only hook to inject a mock Redis client or disable Redis (null).
 */
export function setRedisClientForTests(client: RedisClientLike | null | undefined): void {
  testClientOverride = client;
  cachedClient = undefined;
}

/**
 * Test-only hook to reset cached client state so env-var changes are re-read.
 */
export function resetRedisClientForTests(): void {
  testClientOverride = undefined;
  cachedClient = undefined;
}
