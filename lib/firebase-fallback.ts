// lib/firebase-fallback.ts
// Utilities for falling back to the secondary Firebase when primary quota is exceeded.

export function isQuotaError(err: any): boolean {
  const msg: string = err?.message ?? String(err);
  const code: number = err?.code;
  return code === 8 || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded");
}

export function isUnavailableError(err: any): boolean {
  const msg: string = err?.message ?? String(err);
  return msg.includes("UNAVAILABLE") || msg.includes("ECONNRESET");
}

/**
 * Tries `primaryFn`. If it throws a quota error, calls `fallbackFn` instead.
 * Returns `{ data, overflow }` where `overflow=true` means the fallback was used.
 */
export async function withOverflowFallback<T>(
  primaryFn: () => Promise<T>,
  fallbackFn: () => Promise<T>
): Promise<{ data: T; overflow: boolean }> {
  try {
    const data = await primaryFn();
    return { data, overflow: false };
  } catch (err) {
    if (isQuotaError(err)) {
      console.warn("[overflow] Primary quota exceeded — switching to secondary Firebase");
      const data = await fallbackFn();
      return { data, overflow: true };
    }
    throw err; // Re-throw non-quota errors
  }
}

/**
 * Executes a Firestore transaction with controlled attempts and immediate fail-fast on quota exhaustion.
 * Preserves normal Firestore retry behavior for concurrent conflict resolution,
 * but prevents 30-60+ second uncontrolled gRPC backoff when quota is genuinely exhausted.
 */
export async function runFastTransaction<T>(
  db: FirebaseFirestore.Firestore,
  updateFunction: (transaction: FirebaseFirestore.Transaction) => Promise<T>,
  options?: { maxAttempts?: number }
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 2;
  try {
    return await db.runTransaction(updateFunction, { maxAttempts });
  } catch (err: any) {
    if (isQuotaError(err)) {
      const quotaErr = new Error("Database quota reached. Please retry in a few moments.");
      (quotaErr as any).code = "RESOURCE_EXHAUSTED";
      (quotaErr as any).status = 429;
      throw quotaErr;
    }
    throw err;
  }
}
