# Rollback SOP — FunnelForge Beta

Short, operational runbook for shutting down features without redeploying code
(feature flags) or rolling back the full app (git revert + redeploy).

## Who can authorize

- **Primary**: Erez.
- **Delegate**: whoever is on call when Erez is unavailable, with Slack
  confirmation back to Erez before acting.

---

## Scenario 1 — Disable Meta integration only

**When to use**:
- Spike of Meta 401/403 errors > 10% over a 5-minute window.
- Meta App Review rejection / scope complaint from Meta.
- Bug report that specifically mentions OAuth loop, token hijacking, or
  unintended ad-account changes.

**Action** (~2 minutes):

1. Open your hosting dashboard (Vercel / Netlify / Lovable).
2. Set env var `VITE_META_ENABLED=false`.
3. Redeploy (production).
4. Confirm: visit `/analytics` → "Meta Ads integration is currently
   unavailable" banner appears instead of Connect button.

**Impact**: Meta OAuth flows, token storage, and ad-account data fetching are
all short-circuited. Existing plans continue to render; only the live monitor
goes dark.

**Restore**: set `VITE_META_ENABLED=true` (or remove the var) and redeploy.

---

## Scenario 2 — Full app rollback

**When to use**:
- Any runtime JS error impacting > 5% of sessions (Sentry signal).
- Critical data-loss risk (plans not saving, broken localStorage migration).
- Security incident affecting production.

**Action** (~5 minutes):

1. Identify the last known-good commit on `main`:
   ```
   git log --oneline -20
   ```
2. Revert the offending commit(s):
   ```
   git revert <bad-sha>
   git push origin main
   ```
3. Wait for CI + auto-deploy to complete.
4. Verify `/` loads without console errors and a saved plan still opens.

**Prefer `git revert` over `git reset --hard`** — preserves history and lets
us re-apply the fix later.

---

## Scenario 3 — Block a specific Supabase Edge Function

**When to use**: one edge function is being abused (rate-limit insufficient)
or misbehaving, but the rest of the app is fine.

**Action**:

1. In Supabase dashboard → Functions → `<function-name>` → Settings.
2. Set env `FUNCTION_DISABLED=true` (or equivalent in the shared CORS helper).
3. The function will start returning 503 for any non-OPTIONS request.

Alternative: tighten CORS allow-list in
`supabase/functions/_shared/cors.ts` to remove the affected origin and
redeploy only that function.

---

## Post-incident

1. Open a GitHub issue titled `Beta incident — <YYYY-MM-DD>`.
2. Paste Sentry event IDs, timeline, and scope of impact.
3. Root-cause fix on a feature branch → PR → review → merge.
4. Remove any temporary `VITE_META_ENABLED=false` once the fix is confirmed
   in production.
