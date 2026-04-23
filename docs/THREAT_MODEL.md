# FunnelForge threat model

Last reviewed: 2026-04-23. Owner: platform. Review cadence: quarterly or
when a new external surface is added.

## Scope

In scope:
- The React SPA shipped from Vercel (`src/`).
- All Supabase Edge Functions under `supabase/functions/`.
- All Postgres schemas, RLS policies, and RPCs under
  `supabase/migrations/`.
- The Supabase `avatars` storage bucket.

Out of scope (upstream responsibility):
- Stripe, Anthropic, OpenAI, Meta, Resend control planes.
- The Supabase platform (control plane, realtime gateway, Auth service).
- Vercel's build / CDN / edge infrastructure.
- End-user devices and browsers.

## Trust boundaries

```
+------------------+  HTTPS + JWT   +------------------------+
|  Browser (SPA)   | -------------> |  Supabase REST + Edge  |
|  - localStorage  |                |  - service_role key    |
|  - sessionStorage|                |  - RLS-anchored views  |
+------------------+                +------------------------+
      |                                     |
      | HTTPS                               | HTTPS
      v                                     v
+--------------------+            +---------------------------+
|  Vercel static CDN |            |  Third-party APIs         |
+--------------------+            |  Stripe / Anthropic /     |
                                  |  OpenAI / Meta / Resend   |
                                  +---------------------------+
```

The single most important trust boundary is between the browser and the
edge functions: everything the client sends is treated as untrusted.
Inside the edge functions we re-verify the JWT, and every DB call runs
either with the caller's JWT (RLS-gated) or with the service role
(RLS-bypassing) but with explicit user-id filters.

## Assets

1. User account credentials (email + password managed by Supabase Auth).
2. Stripe subscription state and identifiers on `profiles`.
3. Meta OAuth access tokens and webhook API keys on `user_integrations`.
4. Saved plans, quotes, and shared context on behalf of each user.
5. Anthropic / OpenAI credit (any call we make costs money).
6. Shared codebase and engine embeddings under `code_embeddings`.

## Actors

| Actor | Authentication | Trust level |
|---|---|---|
| Anonymous visitor | none | untrusted |
| Authenticated user | Supabase JWT | limited to their own rows |
| Admin | Supabase JWT + `has_role('admin')` | trusted for ops |
| Stripe webhook | HMAC signature | trusted for payment events |
| Meta / OAuth callback | signed token + state (CSRF) | trusted when state matches |
| Service role (edge functions) | service_role key | fully trusted |

## STRIDE summary

### Spoofing

- JWT verification uses Supabase's public keys; tokens are short-lived
  (1h) and refreshable. Login rate-limited by Supabase.
- Meta OAuth now uses a `state` parameter validated on callback
  (closed CRIT-05).
- Stripe webhook uses HMAC-SHA256 with timing-safe compare + 5-minute
  replay window + `stripe_events_processed` dedup.

### Tampering

- RLS enforces row-level ownership on every user table.
- `profiles.tier` can only be mutated by the service role
  (closed CRIT-01).
- `process_stripe_tier_change` RPC is atomic and state-machine-aware so
  late / reordered Stripe events cannot corrupt tier or subscription
  status (closed CRIT-06 and Stripe ordering race).
- Avatar uploads are restricted to `{user_id}/*` at the storage-policy
  level plus MIME + size caps.

### Repudiation

- `tier_audit_log` records every `profiles.tier` transition with the
  originating Stripe event id.
- `security_audit_log` records every `user_roles` and
  `user_integrations` mutation with actor / subject / diff.
- Sentry captures exceptions; the logger redacts secrets before
  forwarding.

### Information disclosure

- `sentinel_view` no longer grants SELECT to `anon` (closed CRIT-02).
- `quotes` share-token access routes through the `get-quote-by-token`
  edge function which matches the exact token rather than the old
  permissive RLS (closed CRIT-03).
- Share tokens are 128-bit CSPRNG hex (closed CRIT-04).
- `mcp-server.get_agent_tasks` now scopes to the caller's user id
  (closed CRIT-08).
- Error responses on auth / signature failures are generic
  ("Unauthorized" / "Bad request"); full errors stay server-side.
- CSP was tightened (no `unsafe-eval`, `frame-ancestors 'none'`,
  `form-action 'self'`).

### Denial of service / cost abuse

- In-memory per-instance rate limits on every edge function; per-user
  rate limits on every expensive endpoint anchored to the JWT so
  header-spoofing cannot rotate the limiter.
- `bump_user_daily_cost` atomic daily cap closes the
  wait-one-minute-and-continue drain.
- XLSX upload guarded with 2MB size cap, MIME allowlist, and 5-second
  parse timeout (mitigation for unpatched xlsx CVEs).
- JSONB size CHECK (256KB) on `shared_context`; 128KB cap on
  `webhook-receive.data`.

### Elevation of privilege

- `user_roles` writes are admin-only (and now audited).
- Queue helper functions (`claim_events`, `fail_event`, etc.) are
  `SECURITY DEFINER` and REVOKEd from authenticated/anon.
- `match_content` runs as caller so its `match_user_id` parameter
  cannot override RLS on `content_embeddings`.
- Queue processor cross-checks `payload.userId` against
  `event.user_id` before invoking handlers.
- Prod bundle hard-wires `ALLOW_LOCAL_AUTH=false`; the local-auth
  fallback path cannot be reached in production even if env flags are
  tampered with.

## Top residual risks

1. **xlsx supply chain**: two HIGH CVEs (prototype pollution + ReDoS)
   are pinned in lockfile with no upstream fix. Mitigations (size cap,
   MIME allowlist, timeout) reduce but do not eliminate risk.
   **Planned**: migrate to `exceljs`.
2. **`user_integrations.tokens` backfill**: plaintext rows still exist
   in DB; `tokens_encrypted` column and pgcrypto helpers are ready.
   **Planned**: ops task to provision encryption key in Supabase Vault
   and run backfill.
3. **In-memory rate limiter**: resets on cold start. Fine for Beta
   volume, needs DB-backed counter for GA.
4. **No 24/7 SOC / SIEM**: Sentry catches app errors but there is no
   security-specific alerting pipeline.
5. **No external pen test** yet. Scheduled before GA.

## Remediation roadmap (deltas since last review)

- CRIT-01 .. CRIT-08: resolved, see commits on
  `claude/review-security-efficiency-1DOaX`.
- HIGH: rate-limit trust, CSP unsafe-eval, Sentry redaction, queue
  function privilege, JSONB size cap, avatar storage policy, token
  encryption scaffold, supply-chain CI gate, input validation helpers,
  subscription state machine, daily cost cap, shared JWT helper,
  centralised audit log: all resolved in the same branch.
- MEDIUM: pending HSM / key rotation, SOC 2 readiness, bug bounty.

## Disclosure

See [SECURITY.md](../SECURITY.md) at the repository root.
