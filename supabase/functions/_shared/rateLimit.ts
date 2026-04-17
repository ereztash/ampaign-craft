// In-memory sliding-window rate limiter for Supabase Edge Functions.
//
// Scope: per-instance (cold starts reset the window). Sufficient as a
// first-line defence against casual abuse during Beta; upgrade to a
// DB-backed counter if traffic grows or if you need cross-instance
// enforcement.
//
// Usage:
//   const gate = checkRateLimit(req, "meta-token-exchange", 3, 60_000);
//   if (!gate.allowed) return gate.response;

const windows = new Map<string, number[]>();

export function getClientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || "unknown";
  return ip;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function checkRateLimit(
  req: Request,
  endpoint: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const key = `${endpoint}:${getClientKey(req)}`;
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (windows.get(key) ?? []).filter((t) => t > cutoff);

  if (hits.length >= limit) {
    const retryAfterSec = Math.ceil((hits[0] + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  hits.push(now);
  windows.set(key, hits);
  return { allowed: true, remaining: limit - hits.length, retryAfterSec: 0 };
}

export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({ error: "Rate limit exceeded", retryAfterSec: result.retryAfterSec }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSec),
      },
    },
  );
}
