import { adminClient } from "@/lib/tokens";

/**
 * Durable, cross-instance rate limiting.
 *
 * The previous version kept counters in a module-level Map. On serverless that
 * is close to useless: every cold start handed out a fresh quota, so an abuser
 * only had to wait for an instance to recycle. The counter now lives in
 * Postgres (`public.rate_limits` + `check_rate_limit()`), so every instance and
 * every region shares one quota.
 *
 * The function is deliberately fail-open: if the database is unreachable we do
 * not lock users out of the product, we fall back to in-memory limiting. A
 * limiter that takes the whole app down is worse than no limiter.
 */

type Result = { ok: boolean; remaining: number; retryAfter: number };

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, limit: number, windowMs: number): Result {
  const now = Date.now();
  const existing = memory.get(key);
  if (!existing || existing.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  existing.count += 1;
  if (existing.count > limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { ok: true, remaining: limit - existing.count, retryAfter: 0 };
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<Result> {
  try {
    const admin = adminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: Math.max(1, Math.round(windowMs / 1000)),
    });
    if (error || !data) throw error ?? new Error("no rate limit result");
    const row = Array.isArray(data) ? data[0] : data;
    return {
      ok: Boolean(row?.ok),
      remaining: Number(row?.remaining ?? 0),
      retryAfter: Number(row?.retry_after ?? 0),
    };
  } catch {
    // fail open, but still apply some pressure locally
    return memoryLimit(key, limit, windowMs);
  }
}

/** Kept for callers that only need the in-memory path (e.g. tests). */
export function rateLimitSync(key: string, limit: number, windowMs: number): Result {
  return memoryLimit(key, limit, windowMs);
}
