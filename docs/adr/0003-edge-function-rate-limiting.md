# ADR-0003: Edge Function Rate Limiting — In-Memory Sliding Window

**Date:** 2026-04-17  
**Status:** Accepted  
**Deciders:** Erez Tash

## Context

All 13 Supabase Edge Functions had `Access-Control-Allow-Origin: "*"` and no rate
limiting. Any origin could call them; abuse could spike Anthropic/OpenAI API costs.

## Decision

1. **CORS:** Replace wildcard with origin allowlist in `_shared/cors.ts`. Unrecognized
   origins receive a 403.
2. **Rate limit:** In-memory sliding-window counter in `_shared/rateLimit.ts`.
   Per-IP, per-endpoint limits:
   - `meta-token-exchange`: 3 req/min (OAuth exchange)
   - `ai-coach`, `generate-copy`: 20 req/min
   - `create-checkout`: 10 req/min

## Rationale

In-memory is the fastest implementation with zero infrastructure additions. For Beta
(≤500 users, ≤50 concurrent), cold-start reset risk is negligible. DB-backed rate
limiting adds ~50ms latency per request and requires a migration — disproportionate
for Beta scale.

## Alternatives Considered

| Option | Pros | Cons | Rejected because |
|--------|------|------|-----------------|
| DB-backed counter (Supabase table) | Cross-instance, persistent | 50ms overhead; migration required | Over-engineering for Beta |
| Redis / Upstash | Fast, cross-instance | Cost; new dependency | Premature |
| No rate limiting | Zero effort | Cost explosion risk | Unacceptable |

## Consequences

**Positive:** Zero-cost, zero-latency, stops casual abuse immediately.  
**Negative:** Counter resets on Supabase cold-start (~30s idle). A determined attacker
with cold-start knowledge can bypass.  
**Risks carried forward:** Cross-instance enforcement gap if function scales horizontally.

## Review Trigger

When any single endpoint processes >1,000 req/day or after first abuse incident.
Migrate to DB-backed counter at that point.
