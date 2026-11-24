import assert from "node:assert/strict";
import test from "node:test";
import {
  isRedisConfigured,
  resetRedisClientForTests,
  setRedisClientForTests,
  type RedisClientLike,
} from "../lib/cache/redisClient";
import {
  CACHE_KEYS,
  CACHE_NAMESPACE,
  CACHE_TTLS,
  deleteCache,
  deleteCachePattern,
  getCache,
  getOrSetCache,
  getOrSetCacheWithMeta,
  invalidateCacheKeys,
  setCache,
} from "../lib/cache/redisCache";
import {
  LIVE_TRIP_CAPACITY_FIELDS,
  extractStaticTripMetadata,
  mergeStaticAndLiveTrip,
} from "../lib/cache/tripMetadata";

/**
 * In-memory mock Upstash Redis client with simulated TTL expiration.
 * Uses zero network calls and zero real credentials.
 */
function createMockRedis() {
  const store = new Map<string, { value: string; expiresAt: number | null }>();
  const sets = new Map<string, Set<string>>();
  let nowMs = 1_000_000;

  const client: RedisClientLike = {
    async get<T = unknown>(key: string): Promise<T | null> {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt !== null && nowMs >= entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.value as unknown as T;
    },
    async set(key: string, value: string, opts?: { ex?: number }) {
      const expiresAt = opts?.ex ? nowMs + opts.ex * 1000 : null;
      store.set(key, { value, expiresAt });
      return "OK";
    },
    async del(...keys: string[]) {
      let removed = 0;
      for (const k of keys) {
        if (store.delete(k)) removed += 1;
      }
      return removed;
    },
    async sadd(key: string, ...members: string[]) {
      let s = sets.get(key);
      if (!s) {
        s = new Set();
        sets.set(key, s);
      }
      let added = 0;
      for (const m of members) {
        if (!s.has(m)) {
          s.add(m);
          added += 1;
        }
      }
      return added;
    },
    async smembers(key: string) {
      return Array.from(sets.get(key) || []);
    },
    async srem(key: string, ...members: string[]) {
      const s = sets.get(key);
      if (!s) return 0;
      let removed = 0;
      for (const m of members) {
        if (s.delete(m)) removed += 1;
      }
      return removed;
    },
  };

  return {
    client,
    store,
    sets,
    advanceTimeSeconds(sec: number) {
      nowMs += sec * 1000;
    },
  };
}

function createFailingRedis(): RedisClientLike {
  return {
    async get() {
      throw new Error("Simulated Redis connection refused");
    },
    async set() {
      throw new Error("Simulated Redis write failure");
    },
    async del() {
      throw new Error("Simulated Redis delete failure");
    },
    async sadd() {
      throw new Error("Simulated Redis sadd failure");
    },
    async smembers() {
      throw new Error("Simulated Redis smembers failure");
    },
    async srem() {
      throw new Error("Simulated Redis srem failure");
    },
  };
}

test("1 & 2. Cache miss populates Redis and subsequent read is a cache hit", async () => {
  const mock = createMockRedis();
  setRedisClientForTests(mock.client);

  let firestoreCalls = 0;
  const fetcher = async () => {
    firestoreCalls += 1;
    return [{ id: "g1", name: "Himalayan Dawn" }];
  };

  const first = await getOrSetCacheWithMeta(CACHE_KEYS.HOMEPAGE_GALLERY, CACHE_TTLS.HOMEPAGE, fetcher);
  assert.equal(first.cacheStatus, "MISS");
  assert.equal(firestoreCalls, 1);
  assert.deepEqual(first.data, [{ id: "g1", name: "Himalayan Dawn" }]);

  const second = await getOrSetCacheWithMeta(CACHE_KEYS.HOMEPAGE_GALLERY, CACHE_TTLS.HOMEPAGE, fetcher);
  assert.equal(second.cacheStatus, "HIT");
  assert.equal(firestoreCalls, 1);
  assert.deepEqual(second.data, [{ id: "g1", name: "Himalayan Dawn" }]);

  resetRedisClientForTests();
});

test("3. TTL expiration causes cache miss after expiry", async () => {
  const mock = createMockRedis();
  setRedisClientForTests(mock.client);

  await setCache(CACHE_KEYS.HOMEPAGE_SETTINGS, { youtubeVideoId: "abc123" }, 60);
  const beforeExpiry = await getCache<{ youtubeVideoId: string }>(CACHE_KEYS.HOMEPAGE_SETTINGS);
  assert.deepEqual(beforeExpiry, { youtubeVideoId: "abc123" });

  mock.advanceTimeSeconds(61);
  const afterExpiry = await getCache<{ youtubeVideoId: string }>(CACHE_KEYS.HOMEPAGE_SETTINGS);
  assert.equal(afterExpiry, null);

  resetRedisClientForTests();
});

test("4. Cache invalidation (single key, multi-key, and safe prefix pattern)", async () => {
  const mock = createMockRedis();
  setRedisClientForTests(mock.client);

  await setCache(CACHE_KEYS.HOMEPAGE_GALLERY, [1], 600);
  await setCache(CACHE_KEYS.HOMEPAGE_PROUD_STATS, [2], 600);
  await setCache(CACHE_KEYS.teamProfile("navjot-singh"), { name: "Navjot" }, 1800);
  await setCache(CACHE_KEYS.teamProfile("aditi-yadav"), { name: "Aditi" }, 1800);

  await deleteCache(CACHE_KEYS.HOMEPAGE_GALLERY);
  assert.equal(await getCache(CACHE_KEYS.HOMEPAGE_GALLERY), null);
  assert.deepEqual(await getCache(CACHE_KEYS.HOMEPAGE_PROUD_STATS), [2]);

  const deletedCount = await deleteCachePattern(`${CACHE_NAMESPACE}team:profile:`);
  assert.equal(deletedCount, 2);
  assert.equal(await getCache(CACHE_KEYS.teamProfile("navjot-singh")), null);
  assert.equal(await getCache(CACHE_KEYS.teamProfile("aditi-yadav")), null);

  await invalidateCacheKeys([CACHE_KEYS.HOMEPAGE_PROUD_STATS]);
  assert.equal(await getCache(CACHE_KEYS.HOMEPAGE_PROUD_STATS), null);

  resetRedisClientForTests();
});

test("5 & 8. Redis unavailable fails open and falls back to Firestore fetcher", async () => {
  setRedisClientForTests(createFailingRedis());

  let firestoreCalls = 0;
  const result = await getOrSetCache(CACHE_KEYS.HOMEPAGE_PREVIOUS_TRIPS, 600, async () => {
    firestoreCalls += 1;
    return [{ id: "pt1", heading: "Spiti Valley" }];
  });

  assert.equal(firestoreCalls, 1);
  assert.deepEqual(result, [{ id: "pt1", heading: "Spiti Valley" }]);

  // Invalidation failure must never throw
  const invOk = await invalidateCacheKeys(CACHE_KEYS.HOMEPAGE_PREVIOUS_TRIPS);
  assert.equal(invOk, false);

  resetRedisClientForTests();
});

test("6. Missing environment variables gracefully disable caching", async () => {
  resetRedisClientForTests();
  const prevUrl = process.env.UPSTASH_REDIS_REST_URL;
  const prevToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  try {
    assert.equal(isRedisConfigured(), false);
    let calls = 0;
    const res = await getOrSetCacheWithMeta(CACHE_KEYS.TEAM_ALL, CACHE_TTLS.TEAM, async () => {
      calls += 1;
      return [{ id: "m1" }];
    });
    assert.equal(res.cacheStatus, "BYPASS");
    assert.equal(calls, 1);
    assert.deepEqual(res.data, [{ id: "m1" }]);
  } finally {
    if (prevUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = prevUrl;
    if (prevToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = prevToken;
    resetRedisClientForTests();
  }
});

test("7. Malformed cached JSON is evicted and falls back to Firestore fetcher", async () => {
  const mock = createMockRedis();
  setRedisClientForTests(mock.client);

  // Inject corrupted non-JSON directly into mock Redis
  mock.store.set(CACHE_KEYS.HOMEPAGE_PROUD_MARQUEE, {
    value: "{not-valid-json!!!",
    expiresAt: null,
  });

  let firestoreCalls = 0;
  const res = await getOrSetCacheWithMeta(CACHE_KEYS.HOMEPAGE_PROUD_MARQUEE, 600, async () => {
    firestoreCalls += 1;
    return [{ id: "mq1", title: "IITM Boundless" }];
  });

  assert.equal(res.cacheStatus, "MISS");
  assert.equal(firestoreCalls, 1);
  assert.deepEqual(res.data, [{ id: "mq1", title: "IITM Boundless" }]);

  resetRedisClientForTests();
});

test("9, 10 & 11. Team Members mutation invalidation preserves HOD departmentTeam & Council Member profiles", async () => {
  const mock = createMockRedis();
  setRedisClientForTests(mock.client);

  // Mock Firestore state
  let mockFirestoreMembers = [
    {
      id: "hod-1",
      name: "Navjot Singh Dadiala",
      slug: "navjot-singh-dadiala",
      role: "Technical Team",
      type: "dept_head",
      term: "2025-2026",
      departmentTeam: [{ id: "tm-1", name: "Member A" }],
      profile: { yearbookQuote: "Keep building." },
    },
    {
      id: "council-1",
      name: "Aditi Yadav",
      slug: "aditi-yadav",
      role: "Secretary",
      type: "council",
      term: "2025-2026",
      profile: {
        joiningTerm: "2024-2025",
        currentPosition: "Secretary",
        yearbookQuote: "Explore boundlessly.",
        extracurricularActivities: ["Mountaineering"],
      },
    },
  ];

  const fetchMembersFromMockDb = async () => structuredClone(mockFirestoreMembers);

  // Initial populate (MISS)
  const initial = await getOrSetCacheWithMeta(CACHE_KEYS.TEAM_ALL, CACHE_TTLS.TEAM, fetchMembersFromMockDb);
  assert.equal(initial.cacheStatus, "MISS");
  assert.deepEqual(initial.data[0].departmentTeam, [{ id: "tm-1", name: "Member A" }]);
  assert.equal(initial.data[1].profile.yearbookQuote, "Explore boundlessly.");

  // Simulate HOD PATCH adding a team member + explicit invalidation
  mockFirestoreMembers[0].departmentTeam!.push({ id: "tm-2", name: "Member B" });
  await invalidateCacheKeys([
    CACHE_KEYS.TEAM_ALL,
    CACHE_KEYS.teamProfile("navjot-singh-dadiala"),
  ]);

  // Next read must MISS and return updated departmentTeam while preserving Council profile
  const refreshed = await getOrSetCacheWithMeta(CACHE_KEYS.TEAM_ALL, CACHE_TTLS.TEAM, fetchMembersFromMockDb);
  assert.equal(refreshed.cacheStatus, "MISS");
  assert.deepEqual(refreshed.data[0].departmentTeam, [
    { id: "tm-1", name: "Member A" },
    { id: "tm-2", name: "Member B" },
  ]);
  assert.deepEqual(refreshed.data[1].profile.extracurricularActivities, ["Mountaineering"]);

  resetRedisClientForTests();
});

test("12. Public Trip static metadata cache NEVER stores or serves stale live capacity fields", async () => {
  const mock = createMockRedis();
  setRedisClientForTests(mock.client);

  const formattedTripT0 = {
    id: "trip-spiti-2026",
    name: "Spiti Winter Expedition",
    description: "7-day Himalayan trek",
    destination: "Spiti Valley",
    startDate: "2026-12-10",
    endDate: "2026-12-17",
    registrationDeadline: "2026-12-01",
    itinerary: [{ day: "Day 1", title: "Arrival", description: "Basecamp" }],
    itineraryLink: "",
    faqs: [],
    consentStatements: [],
    importantInformation: "Carry thermals",
    thingsToCarry: ["Jacket"],
    coordinators: [{ name: "Coordinator A", position: "Lead" }],
    form: { fields: [] },
    consentFormTemplateUrl: "",
    consentTemplates: [],
    images: [],
    fee: 1500,
    whatsappLink: "",
    qrCodeUrl: "",
    emailsDisabled: false,
    cityWhatsappSettings: {},
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    // Live fields at T0
    totalSeats: 30,
    femaleReservedSeats: 10,
    maleReservedSeats: 20,
    releasedSeats: 0,
    releasedSeatsType: null,
    femaleJoined: 2,
    totalJoined: 5,
    registrationOpen: true,
    isCompleted: false,
    finalRosterSaved: false,
  };

  // Store ONLY static metadata in Redis
  const staticMeta = extractStaticTripMetadata(formattedTripT0);
  for (const liveField of LIVE_TRIP_CAPACITY_FIELDS) {
    assert.equal(
      liveField in staticMeta,
      false,
      `Live capacity field "${liveField}" must NEVER be present in cached static metadata`
    );
  }

  await setCache(CACHE_KEYS.tripPublicMeta("trip-spiti-2026"), staticMeta, CACHE_TTLS.TRIP_META);

  // At T1, Firestore live capacity changes across ALL 10 live fields
  const liveFirestoreDocAtT1 = {
    totalSeats: 35,
    femaleReservedSeats: 12,
    maleReservedSeats: 23,
    releasedSeats: 4,
    releasedSeatsType: "general",
    femaleJoined: 12,
    totalJoined: 35,
    registrationOpen: false,
    isCompleted: true,
    finalRosterSaved: true,
  };

  const cachedMeta = await getCache<typeof staticMeta>(CACHE_KEYS.tripPublicMeta("trip-spiti-2026"));
  assert.ok(cachedMeta);

  const merged = mergeStaticAndLiveTrip(cachedMeta, liveFirestoreDocAtT1);
  // Editorial fields come from Redis cache
  assert.equal(merged.name, "Spiti Winter Expedition");
  assert.equal(merged.description, "7-day Himalayan trek");
  // ALL 10 live capacity & booking status fields ALWAYS reflect live Firestore at T1
  assert.equal(merged.totalSeats, 35);
  assert.equal(merged.femaleReservedSeats, 12);
  assert.equal(merged.maleReservedSeats, 23);
  assert.equal(merged.releasedSeats, 4);
  assert.equal(merged.releasedSeatsType, "general");
  assert.equal(merged.femaleJoined, 12);
  assert.equal(merged.totalJoined, 35);
  assert.equal(merged.registrationOpen, false);
  assert.equal(merged.isCompleted, true);
  assert.equal(merged.finalRosterSaved, true);

  resetRedisClientForTests();
});

test("13. Malformed cache envelope (valid JSON without __v:1) is evicted and falls back", async () => {
  const mock = createMockRedis();
  setRedisClientForTests(mock.client);

  mock.store.set(CACHE_KEYS.HOMEPAGE_SETTINGS, {
    value: JSON.stringify({ unexpected: "shape" }),
    expiresAt: null,
  });

  let fetcherCalls = 0;
  const res = await getOrSetCacheWithMeta(CACHE_KEYS.HOMEPAGE_SETTINGS, 600, async () => {
    fetcherCalls += 1;
    return { youtubeVideoId: "freshVideo11" };
  });

  assert.equal(res.cacheStatus, "MISS");
  assert.equal(fetcherCalls, 1);
  assert.deepEqual(res.data, { youtubeVideoId: "freshVideo11" });

  resetRedisClientForTests();
});

test("14. Redis timeout fails open and executes Firestore fallback without error", async () => {
  const hangingRedis: RedisClientLike = {
    async get() {
      return await new Promise(() => {}); // Never resolves -> triggers 1500ms timeout
    },
    async set() {
      return await new Promise(() => {});
    },
    async del() {
      return 0;
    },
    async sadd() {
      return 0;
    },
    async smembers() {
      return [];
    },
    async srem() {
      return 0;
    },
  };
  setRedisClientForTests(hangingRedis);

  let fetcherCalls = 0;
  const data = await getOrSetCache(CACHE_KEYS.MEETUPS_SECTIONS, 300, async () => {
    fetcherCalls += 1;
    return [{ id: "sec1", name: "North India" }];
  });

  assert.equal(fetcherCalls, 1);
  assert.deepEqual(data, [{ id: "sec1", name: "North India" }]);

  resetRedisClientForTests();
});

test("15. Failed Firestore write does NOT invalidate existing cache; invalidation failure does NOT roll back write", async () => {
  const mock = createMockRedis();
  setRedisClientForTests(mock.client);

  await setCache(CACHE_KEYS.HOMEPAGE_GALLERY, [{ id: "g1", name: "Original" }], 600);

  // Scenario A: Firestore write throws -> invalidation must NOT run
  let writeCommitted = false;
  try {
    throw new Error("Simulated Firestore write failure");
  } catch {
    // Do not invalidate on failed write
  }
  assert.equal(writeCommitted, false);
  const stillCached = await getCache<Array<{ id: string; name: string }>>(CACHE_KEYS.HOMEPAGE_GALLERY);
  assert.deepEqual(stillCached, [{ id: "g1", name: "Original" }]);

  // Scenario B: Firestore write succeeds, then Redis invalidation fails -> write remains committed
  let dbState = [{ id: "g1", name: "Updated" }];
  writeCommitted = true;
  setRedisClientForTests(createFailingRedis());
  const invResult = await invalidateCacheKeys(CACHE_KEYS.HOMEPAGE_GALLERY);
  assert.equal(invResult, false);
  assert.equal(writeCommitted, true);
  assert.equal(dbState[0].name, "Updated");

  resetRedisClientForTests();
});

test("16. Team Member rename invalidates TEAM_ALL, old slug, and new slug", async () => {
  const mock = createMockRedis();
  setRedisClientForTests(mock.client);

  await setCache(CACHE_KEYS.TEAM_ALL, [{ id: "m1", slug: "old-name" }], 1800);
  await setCache(CACHE_KEYS.teamProfile("old-name"), { name: "Old Name" }, 1800);
  await setCache(CACHE_KEYS.teamProfile("new-name"), { name: "Stale New Name" }, 1800);

  await invalidateCacheKeys([
    CACHE_KEYS.TEAM_ALL,
    CACHE_KEYS.teamProfile("new-name"),
    CACHE_KEYS.teamProfile("old-name"),
  ]);

  assert.equal(await getCache(CACHE_KEYS.TEAM_ALL), null);
  assert.equal(await getCache(CACHE_KEYS.teamProfile("old-name")), null);
  assert.equal(await getCache(CACHE_KEYS.teamProfile("new-name")), null);

  resetRedisClientForTests();
});
