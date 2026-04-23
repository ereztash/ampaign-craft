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

// The original helper took the FIRST entry from X-Forwarded-For, which is
// the value the client sent before any proxy hit it. A determined attacker
// could rotate that header freely and never hit a rate limit. Prefer the
// trust-anchored `cf-connecting-ip` header (set by Supabase's Cloudflare
// ingress and not forwarded from the client), and fall back to the LAST
// entry of X-Forwarded-For since the trusted proxy appends its view of
// the real client IP. Spoofing the IP now requires spoofing a header the
// platform itself rewrites, not a header the client controls.
export function getClientKey(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  const fwd = req.headers.get("x-forwarded-for") ?? "";
  if (fwd) {
    const parts = fwd.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return "unknown";
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
  return checkKeyedRateLimit(`${endpoint}:${getClientKey(req)}`, limit, windowMs);
}

/**
 * Per-user rate limit for authenticated endpoints. Use this in addition to
 * checkRateLimit on endpoints that can burn real money (LLM calls) — a
 * shared corporate NAT pool can absorb per-IP limits, and a single user
 * rotating IPs can bypass them entirely. Call after verifying the JWT.
 */
export function checkUserRateLimit(
  userId: string,
  endpoint: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  return checkKeyedRateLimit(`user:${endpoint}:${userId}`, limit, windowMs);
}

function checkKeyedRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
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
