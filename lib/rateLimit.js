import { adminAuth, adminDb } from "./firebase-admin";

/**
 * Lightweight in-memory rate limiter for Next.js API routes.
 * No external dependencies — uses a Map stored in the module scope.
 * 
 * Note: Resets on server cold starts (acceptable for serverless).
 * For persistent limits across restarts, use Upstash Redis instead.
 */

const store = new Map(); // { key: { count, windowStart } }

// Auto-purge stale entries every 5 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now - entry.windowStart > entry.windowMs * 2) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Check rate limit for a given key.
 * @param {string} key - Unique identifier (e.g. IP address, user ID)
 * @param {object} options
 * @param {number} options.limit - Max requests allowed in the window
 * @param {number} options.windowMs - Window duration in milliseconds
 * @returns {{ allowed: boolean, remaining: number, resetMs: number }}
 */
export function checkRateLimit(key, { limit = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    // Fresh window
    store.set(key, { count: 1, windowStart: now, windowMs });
    return { allowed: true, remaining: limit - 1, resetMs: windowMs };
  }

  entry.count += 1;

  const remaining = Math.max(0, limit - entry.count);
  const resetMs = windowMs - (now - entry.windowStart);

  return {
    allowed: entry.count <= limit,
    remaining,
    resetMs,
  };
}

/**
 * Extract the real client IP from Next.js request headers.
 * Handles proxies (Vercel, Cloudflare, etc.).
 * @param {Request} req
 * @returns {string}
 */
export function getClientIp(req) {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

let cachedStaffEmails = null;
let cachedStaffEmailsExpiresAt = 0;

/**
 * Invalidate staff email cache (called when trips or coordinators are modified)
 */
export function invalidateStaffEmailsCache() {
  cachedStaffEmails = null;
  cachedStaffEmailsExpiresAt = 0;
}

async function getCachedStaffEmails() {
  const now = Date.now();
  if (cachedStaffEmails && now < cachedStaffEmailsExpiresAt) {
    return cachedStaffEmails;
  }

  const emails = new Set();
  if (process.env.ADMIN_EMAIL) {
    emails.add(process.env.ADMIN_EMAIL.toLowerCase().trim());
  }

  try {
    const tripsSnap = await adminDb.collection("trips").get();
    for (const doc of tripsSnap.docs) {
      const coordinators = doc.data().coordinators || [];
      for (const c of coordinators) {
        if (typeof c === "object" && c !== null && c.email) {
          emails.add(c.email.toLowerCase().trim());
        } else if (typeof c === "string") {
          emails.add(c.toLowerCase().trim());
        }
      }
    }
    cachedStaffEmails = emails;
    cachedStaffEmailsExpiresAt = now + 60_000; // 60s TTL
  } catch (err) {
    console.error("Failed to refresh staff emails cache:", err);
  }

  return cachedStaffEmails || emails;
}

/**
 * Helper to identify if a request is from an admin (NextAuth session)
 * or a trip coordinator (Firebase ID token).
 * @param {object} session - NextAuth session object
 * @param {string} [token] - Firebase ID token
 * @returns {Promise<boolean>}
 */
export async function isStaffRequest(session, token) {
  if (session) return true; // NextAuth session = Admin
  if (!token) return false;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email?.toLowerCase().trim();
    if (!email) return false;

    // 1. Super Admin email check
    if (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.toLowerCase().trim()) {
      return true;
    }

    // 2. Cached Trip Coordinator check
    const staffEmails = await getCachedStaffEmails();
    return staffEmails.has(email);
  } catch (err) {
    console.error("isStaffRequest verification failed:", err);
  }
  return false;
}

