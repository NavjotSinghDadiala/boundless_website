/**
 * BOUNDLESS SOCIETY — FIREBASE PERFORMANCE PROFILER & INSTRUMENTATION
 * 
 * Development-only profiler strictly active when process.env.BOUNDLESS_PERF_DEBUG === "true".
 * Produces structured fine-grained latency and operation counts:
 * - total request time
 * - Firestore read count
 * - Firestore write count
 * - Firestore delete count
 * - transaction duration
 * - individual query duration
 * - individual document get duration
 * - batch write duration
 * - time spent before Firebase
 * - time spent after Firebase
 * 
 * Never emits noisy logs in production. Zero hashing strictly maintained.
 */

export interface StepMetric {
  name: string;
  durationMs: number;
}

export interface ProfilerResult {
  operation: string;
  totalMs: number;
  reads: number;
  writes: number;
  deletes: number;
  transactions: number;
  transactionDurationMs: number;
  beforeFirebaseMs: number;
  afterFirebaseMs: number;
  steps: StepMetric[];
}

export class FirebaseProfiler {
  readonly operation: string;
  readonly startTime: number;
  private steps: StepMetric[] = [];
  private reads = 0;
  private writes = 0;
  private deletes = 0;
  private transactions = 0;
  private transactionDurationMs = 0;
  private beforeFirebaseMs = 0;
  private afterFirebaseMs = 0;
  private readonly isEnabled: boolean;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = performance.now();
    this.isEnabled =
      process.env.BOUNDLESS_PERF_DEBUG === "true" ||
      (process.env.NODE_ENV !== "production" && process.env.BOUNDLESS_PERF_LOG === "true");
  }

  setBeforeFirebase(ms: number): void {
    this.beforeFirebaseMs = ms;
  }

  setAfterFirebase(ms: number): void {
    this.afterFirebaseMs = ms;
  }

  addCounts(counts?: {
    reads?: number;
    writes?: number;
    deletes?: number;
    transactions?: number;
  }): void {
    if (!counts) return;
    if (counts.reads) this.reads += counts.reads;
    if (counts.writes) this.writes += counts.writes;
    if (counts.deletes) this.deletes += counts.deletes;
    if (counts.transactions) this.transactions += counts.transactions;
  }

  recordStep(
    name: string,
    durationMs: number,
    counts?: { reads?: number; writes?: number; deletes?: number; transactions?: number }
  ): void {
    this.steps.push({ name, durationMs });
    this.addCounts(counts);
  }

  async step<T>(
    name: string,
    fn: () => Promise<T>,
    counts?: {
      reads?: number;
      writes?: number;
      deletes?: number;
      transactions?: number;
      isTransaction?: boolean;
    }
  ): Promise<T> {
    const start = performance.now();
    try {
      const res = await fn();
      const dur = performance.now() - start;
      this.steps.push({ name, durationMs: dur });
      this.addCounts(counts);
      if (counts?.isTransaction) {
        this.transactions += 1;
        this.transactionDurationMs += dur;
      }
      return res;
    } catch (err) {
      const dur = performance.now() - start;
      this.steps.push({ name: `${name} (failed)`, durationMs: dur });
      throw err;
    }
  }

  end(): ProfilerResult {
    const totalMs = performance.now() - this.startTime;

    const result: ProfilerResult = {
      operation: this.operation,
      totalMs,
      reads: this.reads,
      writes: this.writes,
      deletes: this.deletes,
      transactions: this.transactions,
      transactionDurationMs: this.transactionDurationMs,
      beforeFirebaseMs: this.beforeFirebaseMs,
      afterFirebaseMs: this.afterFirebaseMs,
      steps: this.steps,
    };

    if (this.isEnabled) {
      const lines: string[] = [
        `\n[Firebase PERF]`,
        this.operation,
        "-------------------",
      ];

      if (this.beforeFirebaseMs > 0) {
        lines.push(`before Firebase: ${Math.round(this.beforeFirebaseMs)}ms`);
      }

      for (const step of this.steps) {
        lines.push(`${step.name}: ${Math.round(step.durationMs)}ms`);
      }

      if (this.afterFirebaseMs > 0) {
        lines.push(`after Firebase: ${Math.round(this.afterFirebaseMs)}ms`);
      }

      lines.push(`total: ${Math.round(totalMs)}ms`);
      lines.push(`reads: ${this.reads}`);
      lines.push(`writes: ${this.writes}`);
      if (this.deletes > 0) lines.push(`deletes: ${this.deletes}`);
      if (this.transactions > 0) lines.push(`transactions: ${this.transactions}`);
      lines.push("");

      console.log(lines.join("\n"));
    }

    return result;
  }
}

export function createProfiler(operation: string): FirebaseProfiler {
  return new FirebaseProfiler(operation);
}

export interface PerfMetrics {
  operation: string;
  totalMs: number;
  firestoreReads?: number;
  firestoreWrites?: number;
  firestoreDeletes?: number;
  details?: Record<string, any>;
}

export function logPerfMetric(metrics: PerfMetrics): void {
  const isDebug =
    process.env.BOUNDLESS_PERF_DEBUG === "true" ||
    (process.env.NODE_ENV !== "production" && process.env.BOUNDLESS_PERF_LOG === "true");

  if (!isDebug) return;

  const lines = [
    `[PERF] ${metrics.operation}`,
    `total: ${metrics.totalMs.toFixed(2)}ms`,
    metrics.firestoreReads !== undefined ? `firestore reads: ${metrics.firestoreReads}` : null,
    metrics.firestoreWrites !== undefined ? `firestore writes: ${metrics.firestoreWrites}` : null,
    metrics.firestoreDeletes !== undefined ? `firestore deletes: ${metrics.firestoreDeletes}` : null,
  ].filter(Boolean);

  console.log(lines.join(" | "));
}

export async function measureAsyncPerf<T>(
  operation: string,
  fn: () => Promise<T>,
  counts?: { reads?: number; writes?: number; deletes?: number; details?: Record<string, any> }
): Promise<T> {
  const profiler = new FirebaseProfiler(operation);
  try {
    const result = await fn();
    profiler.addCounts(counts);
    profiler.end();
    return result;
  } catch (err) {
    profiler.end();
    throw err;
  }
}
