# Security deploy runbook

This runbook covers the ops-side steps that accompany the
security-hardening merge (commits `1bc437e..846071a`, merged as
`e9b56a4` on main). Follow in order; each step is self-contained.

## 0. Pre-flight

- [ ] Confirm you have the Supabase service role key for the target
      environment handy.
- [ ] Confirm you have Vercel deploy rights for the target project.
- [ ] Announce a short maintenance window in `#ops` (migrations can run
      live, but step 3 below briefly breaks quote sharing until the
      new edge function is deployed).

## 1. Apply migrations

Run against every environment (staging first, then production):

```bash
supabase link --project-ref <project-ref>
supabase db push
```

The migrations added in this release:

| File | Purpose |
|------|---------|
| `20260423_001_tier_audit_log.sql` | Stripe tier audit trail |
| `20260423_002_embeddings_hnsw_and_ttl.sql` | HNSW index + 30d TTL on web_search_result |
| `20260423_003_crit_p0_rls_hardening.sql` | CRIT-01/02/03 fixes |
| `20260423_004_crit06_stripe_atomic.sql` | Atomic tier-change RPC |
| `20260423_005_queue_security_definer_and_jsonb_cap.sql` | Queue funcs SECURITY DEFINER + JSONB cap |
| `20260423_006_avatars_storage_policies.sql` | Avatar bucket policies |
| `20260423_007_user_integrations_encryption.sql` | pgcrypto helpers for tokens |
| `20260423_008_subscription_state_and_cost_cap.sql` | Stripe state machine + daily cost cap |
| `20260423_009_security_audit_log.sql` | Generic security audit log |
| `20260423_010_pg_cron_schedules.sql` | Daily cleanup cron entries |

Verify:

```sql
-- Expect 10 rows for this release
SELECT count(*) FROM supabase_migrations.schema_migrations
WHERE version LIKE '20260423_%';
```

## 2. Enable pg_cron (once per project)

If migration `20260423_010` emits `pg_cron not available`, enable the
extension in Dashboard -> Database -> Extensions -> `pg_cron`, then
re-run just that migration.

Verify:

```sql
SELECT jobname, schedule, command
FROM cron.job
WHERE jobname IN ('cleanup-expired-embeddings', 'cleanup-old-events');
```

## 3. Deploy edge functions

**Order matters.** Deploy `get-quote-by-token` and the updated
existing functions before the frontend so quote sharing is not broken
between deploys.

```bash
# New function
supabase functions deploy get-quote-by-token

# Updated functions (all carry at least one security fix)
supabase functions deploy ai-coach
supabase functions deploy agent-executor
supabase functions deploy create-checkout
supabase functions deploy customer-portal
supabase functions deploy embed-content
supabase functions deploy meta-token-exchange
supabase functions deploy outreach-agent
supabase functions deploy mcp-server
supabase functions deploy queue-processor
supabase functions deploy research-agent
supabase functions deploy stripe-webhook
supabase functions deploy webhook-receive
```

Smoke test each:

```bash
curl -i https://<ref>.supabase.co/functions/v1/get-quote-by-token?token=invalid \
  -H "apikey: $ANON_KEY"
# Expect 404 (token format rejected) or 401 depending on anon rules.
```

## 4. Deploy frontend

After all edge functions are live:

```bash
git pull origin main
npm ci
npm run build
# Vercel handles deploy; or:
vercel --prod
```

The `SharedQuote` page now fetches quotes via
`supabase.functions.invoke("get-quote-by-token")` instead of a direct
`.eq("share_token", ...)`; the old path no longer returns rows because
the permissive RLS policy was dropped.

## 5. Backfill encrypted integration tokens

Required once, per environment. Needs a 32-character encryption key
stored in Supabase Vault (or any secret manager). Never commit the
key.

In the Supabase SQL editor (run as the service role):

```sql
SELECT set_config('my.encryption_key', '<paste 32+ char key here>', false);
\i scripts/backfill-user-integration-tokens.sql
```

Alternatively via psql from an ops workstation:

```bash
psql "$SUPABASE_DB_URL" \
  -c "SELECT set_config('my.encryption_key', '$ENC_KEY', false);" \
  -f scripts/backfill-user-integration-tokens.sql
```

The script only touches rows where `tokens_encrypted IS NULL`, so
re-running is safe.

Verify:

```sql
SELECT
  count(*) FILTER (WHERE tokens_encrypted IS NOT NULL) AS encrypted,
  count(*) FILTER (WHERE tokens::text <> '{}') AS legacy_non_empty
FROM user_integrations;
-- encrypted should grow; legacy_non_empty should drop to 0.
```

Once every row is encrypted and the app is reading via
`read_user_integration_tokens`, open a follow-up PR to drop the
legacy `tokens` column.

## 6. Supabase Dashboard config

### 6a. Meta OAuth redirect URI

Dashboard -> Authentication -> URL Configuration (or the Meta app
config on developers.facebook.com). Add exactly:

- `https://funnelforge.co.il/*` (or your production domain)
- `https://staging.funnelforge.co.il/*`
- `http://localhost:8080/*` (dev only)

**Do not** leave wildcards or `*.funnelforge.*`. The OAuth flow now
validates a `state` parameter client-side (CRIT-05), but an explicit
allowlist on Meta's side is the second wall.

### 6b. Password-reset rate limits

Dashboard -> Authentication -> Rate Limits:

- **Password recovery**: set to `3 requests per hour per IP` and `5
  requests per hour per email` if those fields are available. Supabase
  defaults are permissive enough that bulk enumeration is possible
  from a single IP pool.

### 6c. JWT expiry

Dashboard -> Authentication -> JWT settings: confirm `JWT expiry` is
**3600s** (1h). Shorter expiry reduces the window of a stolen token.

### 6d. MFA for admin accounts

Dashboard -> Authentication -> Providers -> Phone / TOTP: enable TOTP.
Then have every user in `user_roles` with role='admin' enroll. An MFA
enforcement policy at the RLS level is future work (requires reading
`auth.jwt() ->> 'aal'`); for now enforce via process.

## 7. Post-deploy verification

Run each from an authenticated browser with a non-admin test user:

- [ ] `UPDATE profiles SET tier='business' WHERE id=auth.uid();` should
      fail with a policy violation (CRIT-01).
- [ ] `curl $REST/rest/v1/sentinel_view -H "apikey: $ANON"` should
      return 401 (CRIT-02).
- [ ] Viewing another user's shared quote URL should only work when
      the exact share_token is known (CRIT-03).
- [ ] Attempting a Stripe webhook replay (old signature) should be
      rejected (CRIT-06).
- [ ] Uploading a 3MB `.svg` as avatar should fail client-side AND
      the storage bucket should reject it server-side (CRIT-07 +
      avatar bucket policy).
- [ ] MCP `get_agent_tasks` called by user A should not return rows
      owned by user B (CRIT-08).
- [ ] Gitleaks workflow should run green on the next PR.

## 8. Rollback

If a critical regression is found:

```bash
# Revert the merge commit on main
git revert -m 1 e9b56a4
git push origin main

# Revert migrations in reverse order (some are destructive on rollback
# so read each file first):
supabase migration repair --status reverted --version 20260423_010
# ... and so on for 009 -> 001
```

`tier_audit_log`, `security_audit_log`, and `user_daily_cost` are
additive tables and can stay. The RLS policy drops in CRIT-01/02/03
need to be manually re-created from the pre-merge state if rolling
back.
