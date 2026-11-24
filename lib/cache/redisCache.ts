import { getRedisClient, isRedisConfigured } from "./redisClient";

export const CACHE_NAMESPACE = "boundless:v1:";
const KEY_INDEX_SET = `${CACHE_NAMESPACE}_index:keys`;
const DEFAULT_TIMEOUT_MS = 1500;

/**
 * Deterministic, human-readable cache keys (zero hashing).
 * Strictly limited to public, non-personalized datasets.
 */
export const CACHE_KEYS = {
  TEAM_ALL: `${CACHE_NAMESPACE}team:all`,
  teamProfile: (slug: string) => `${CACHE_NAMESPACE}team:profile:${normalizeSegment(slug)}`,

  HOMEPAGE_GALLERY: `${CACHE_NAMESPACE}homepage:gallery`,
  HOMEPAGE_PREVIOUS_TRIPS: `${CACHE_NAMESPACE}homepage:previous_trips`,
  HOMEPAGE_PROUD_STATS: `${CACHE_NAMESPACE}homepage:proud_stats`,
  HOMEPAGE_PROUD_MARQUEE: `${CACHE_NAMESPACE}homepage:proud_marquee`,
  HOMEPAGE_SETTINGS: `${CACHE_NAMESPACE}homepage:settings`,

  MEETUPS_COMPLETED: `${CACHE_NAMESPACE}meetups:public:completed`,
  MEETUPS_CAMPAIGNS: `${CACHE_NAMESPACE}meetups:public:campaigns`,
  MEETUPS_SECTIONS: `${CACHE_NAMESPACE}meetups:public:sections`,

  TRIPS_PUBLIC_META_ALL: `${CACHE_NAMESPACE}trips:public:meta:all`,
  tripPublicMeta: (tripId: string) => `${CACHE_NAMESPACE}trips:public:meta:${normalizeSegment(tripId)}`,
} as const;

export const CACHE_TTLS = {
  TEAM: 1800,
  HOMEPAGE: 600,
  MEETUPS: 300,
  TRIP_META: 300,
} as const;

interface CacheEnvelope<T> {
  __v: 1;
  data: T;
}

function normalizeSegment(segment: string): string {
  return String(segment || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_");
}

function ensureNamespacedKey(key: string): string {
  const trimmed = String(key || "").trim();
  if (!trimmed) return "";
  return trimmed.startsWith(CACHE_NAMESPACE) ? trimmed : `${CACHE_NAMESPACE}${trimmed}`;
}

function sanitizeErrorReason(err: unknown): string {
  if (!err) return "unknown_error";
  const raw = err instanceof Error ? err.message : String(err);
  // Never leak URLs, tokens, or auth headers in logs
  if (raw.includes("timeout")) return "redis_timeout";
  if (raw.toLowerCase().includes("fetch") || raw.toLowerCase().includes("network")) {
    return "redis_network_error";
  }
  return "redis_operation_error";
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("redis_timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Retrieve a cached JSON value by key.
 * Returns null on miss, unconfigured Redis, timeout, error, or malformed JSON.
 */
export async function getCache<T = unknown>(key: string): Promise<T | null> {
  const fullKey = ensureNamespacedKey(key);
  if (!fullKey || !isRedisConfigured()) {
    return null;
  }

  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const raw = await withTimeout(client.get<string | CacheEnvelope<T>>(fullKey));
    if (raw === null || raw === undefined) {
      return null;
    }

    let parsed: unknown;
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.warn(`[RedisCache] Malformed JSON for key "${fullKey}". Evicting and falling back.`);
        await withTimeout(client.del(fullKey)).catch(() => {});
        return null;
      }
    } else if (typeof raw === "object") {
      parsed = raw;
    } else {
      return null;
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as CacheEnvelope<T>).__v === 1 &&
      "data" in (parsed as CacheEnvelope<T>)
    ) {
      return (parsed as CacheEnvelope<T>).data;
    }

    console.warn(`[RedisCache] Unexpected cache envelope for key "${fullKey}". Evicting and falling back.`);
    await withTimeout(client.del(fullKey)).catch(() => {});
    return null;
  } catch (err) {
    console.warn(`[RedisCache] GET failed for "${fullKey}" (${sanitizeErrorReason(err)}). Failing open.`);
    return null;
  }
}

/**
 * Store a JSON-serializable value in Redis with an explicit TTL in seconds.
 * Registers the key in a bounded namespace index for safe prefix invalidation.
 */
export async function setCache<T = unknown>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<boolean> {
  const fullKey = ensureNamespacedKey(key);
  const safeTtl = Math.max(1, Math.floor(Number(ttlSeconds) || 60));

  if (!fullKey || !isRedisConfigured()) {
    return false;
  }

  const client = getRedisClient();
  if (!client) {
    return false;
  }

  let serialized: string;
  try {
    const envelope: CacheEnvelope<T> = { __v: 1, data: value };
    serialized = JSON.stringify(envelope);
  } catch {
    console.warn(`[RedisCache] Value for "${fullKey}" is not JSON-serializable. Skipping cache write.`);
    return false;
  }

  try {
    await withTimeout(client.set(fullKey, serialized, { ex: safeTtl }));
    // Track key in bounded index set (best-effort; never fails the cache write)
    await withTimeout(client.sadd(KEY_INDEX_SET, fullKey)).catch(() => {});
    return true;
  } catch (err) {
    console.warn(`[RedisCache] SET failed for "${fullKey}" (${sanitizeErrorReason(err)}).`);
    return false;
  }
}

/**
 * Delete a single cached key and remove it from the maintained key index.
 */
export async function deleteCache(key: string): Promise<boolean> {
  const fullKey = ensureNamespacedKey(key);
  if (!fullKey || !isRedisConfigured()) {
    return false;
  }

  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    await withTimeout(client.del(fullKey));
    await withTimeout(client.srem(KEY_INDEX_SET, fullKey)).catch(() => {});
    return true;
  } catch (err) {
    console.warn(`[RedisCache] DELETE failed for "${fullKey}" (${sanitizeErrorReason(err)}).`);
    return false;
  }
}

/**
 * Safely delete all tracked keys matching a deterministic prefix using the maintained key index.
 * Never uses Redis KEYS * or broad flushes.
 */
export async function deleteCachePattern(prefix: string): Promise<number> {
  const fullPrefix = ensureNamespacedKey(prefix);
  if (!fullPrefix || fullPrefix === CACHE_NAMESPACE || !isRedisConfigured()) {
    return 0;
  }

  const client = getRedisClient();
  if (!client) {
    return 0;
  }

  try {
    const indexedKeys = await withTimeout(client.smembers(KEY_INDEX_SET));
    if (!Array.isArray(indexedKeys) || indexedKeys.length === 0) {
      return 0;
    }

    const matching = indexedKeys.filter(
      (k) => typeof k === "string" && k.startsWith(fullPrefix)
    );
    if (matching.length === 0) {
      return 0;
    }

    await withTimeout(client.del(...matching));
    await withTimeout(client.srem(KEY_INDEX_SET, ...matching)).catch(() => {});
    return matching.length;
  } catch (err) {
    console.warn(`[RedisCache] Pattern invalidation failed for "${fullPrefix}" (${sanitizeErrorReason(err)}).`);
    return 0;
  }
}

/**
 * Invalidate one or more explicit cache keys after a successful Firestore write.
 * Fail-safe: logs a sanitized warning on error and never throws.
 */
export async function invalidateCacheKeys(keys: string | string[]): Promise<boolean> {
  const list = (Array.isArray(keys) ? keys : [keys])
    .map(ensureNamespacedKey)
    .filter(Boolean);

  if (list.length === 0 || !isRedisConfigured()) {
    return false;
  }

  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    await withTimeout(client.del(...list));
    await withTimeout(client.srem(KEY_INDEX_SET, ...list)).catch(() => {});
    return true;
  } catch (err) {
    console.warn(
      `[RedisCache] Invalidation failed for ${list.length} key(s) (${sanitizeErrorReason(err)}). Allowing natural TTL expiration.`
    );
    return false;
  }
}

/**
 * Read-through cache helper with status metadata ("HIT" | "MISS" | "BYPASS").
 * Strictly fails open: if Redis is unconfigured or fails, executes fetcher() directly.
 */
export async function getOrSetCacheWithMeta<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<{ data: T; cacheStatus: "HIT" | "MISS" | "BYPASS" }> {
  if (!isRedisConfigured()) {
    const data = await fetcher();
    return { data, cacheStatus: "BYPASS" };
  }

  const cached = await getCache<T>(key);
  if (cached !== null) {
    return { data: cached, cacheStatus: "HIT" };
  }

  const freshData = await fetcher();
  // Best-effort cache write; never fails the request if Redis errors
  await setCache(key, freshData, ttlSeconds).catch(() => {});
  return { data: freshData, cacheStatus: "MISS" };
}

/**
 * Standard read-through cache helper.
 * Always returns the fetched or cached value; fails open to fetcher() on any Redis error.
 */
export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const { data } = await getOrSetCacheWithMeta(key, ttlSeconds, fetcher);
  return data;
}
