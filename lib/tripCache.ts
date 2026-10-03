/**
 * Lightweight, in-memory TTL cache for public trip metadata.
 * Designed to absorb high-concurrency registration rushes (~1000 concurrent students).
 * 
 * Rules:
 * - Public trip metadata is shared by all students (safe to cache).
 * - NEVER cache student-personalized data (profiles, registrations, uploaded files).
 * - Automatic eviction after TTL (default: 15s).
 * - Immediate invalidation when an admin updates, deletes, or mutates a trip.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const tripMemoryCache = new Map<string, CacheEntry<any>>();

// Default TTL: 15 seconds (short enough to be fresh, long enough to absorb 1000-user rush)
const DEFAULT_TTL_MS = 15_000;

/**
 * Retrieve cached public trip data if valid.
 */
export function getTripCache<T>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | null {
  const entry = tripMemoryCache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > ttlMs) {
    tripMemoryCache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Store public trip data in memory.
 */
export function setTripCache<T>(key: string, data: T): void {
  tripMemoryCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Immediately invalidate trip cache.
 * If tripId is provided, invalidates both the single-trip and all-trips cache.
 * If omitted, invalidates all trip cache entries.
 */
export function invalidateTripCache(tripId?: string): void {
  if (tripId) {
    tripMemoryCache.delete(`trip:public:${tripId}`);
    tripMemoryCache.delete(`trip:public:id:${tripId}`);
  }
  tripMemoryCache.delete("trips:public:all");
}
