/**
 * Minimal fixed-window rate limiter.
 *
 * Deliberately in-memory: it is per-instance, so it is a speed bump against a
 * single abusive client, not a global quota. Anything stronger needs Redis or
 * the platform's own WAF. Every expensive route (model calls, builds) goes
 * through this so one account cannot run up an unbounded bill.
 */
type Window = { count: number; resetAt: number };
const buckets = new Map<string, Window>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  existing.count += 1;
  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.ceil((existing.resetAt - now) / 1000),
    };
  }
  return { ok: true, remaining: limit - existing.count, retryAfter: 0 };
}

/** Clips the map so a long-lived instance cannot leak memory. */
export function sweep(olderThanMs = 60 * 60 * 1000) {
  const now = Date.now();
  for (const [key, window] of buckets) {
    if (window.resetAt + olderThanMs < now) buckets.delete(key);
  }
}
