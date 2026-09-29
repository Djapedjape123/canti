// Simple per-IP rate limit for POST /api/reservations.
// The counters live in this server instance's memory: they reset on every
// deploy or cold start, and each Vercel instance counts on its own. That is
// enough to stop a script from flooding the owner with fake requests, which
// is all the demo needs.

export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const RATE_LIMIT_MAX_REQUESTS = 5;
const SWEEP_THRESHOLD = 10_000;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function sweepExpired(now: number): void {
  if (buckets.size < SWEEP_THRESHOLD) return;
  for (const [ip, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(ip);
  }
}

/** true = allowed; false = this IP has used up its requests for the current window. */
export function checkRateLimit(ip: string, now: number = Date.now()): boolean {
  sweepExpired(now);
  const bucket = buckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  bucket.count += 1;
  return true;
}

/** The client's IP: the first address in x-forwarded-for (set by Vercel). */
export function ipFromHeaders(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
