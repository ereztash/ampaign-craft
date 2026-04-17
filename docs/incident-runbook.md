# FunnelForge Incident Runbook

## On-call Contact

| Role | Contact | Escalation after |
|---|---|---|
| Primary | Erez (owner) | Immediate |
| Backup | — | — |

---

## Severity Levels

| Level | Definition | Response SLA | Example |
|---|---|---|---|
| P0 | Complete outage — no users can load the app | 15 min | Supabase DB down, deploy failure |
| P1 | Core flow broken for >50% of users | 30 min | funnel generation failing, auth broken |
| P2 | Feature degraded but workaround exists | 2 hours | Meta connect broken, AI coach timeout |
| P3 | Minor UI issue, affects <5% of users | Next business day | Wrong locale string, cosmetic bug |

---

## Pre-Incident: Health Monitoring

**Health endpoint:** `GET /functions/v1/health`

Response schema:
```json
{
  "status": "healthy|degraded|down",
  "ts": "ISO8601",
  "subsystems": {
    "database": { "status": "ok|degraded|down", "latencyMs": 12 },
    "ai": { "status": "ok|degraded" },
    "meta": { "status": "ok|degraded" }
  }
}
```

**Alerts to configure:**
- HTTP status 503 for >2 consecutive checks → PagerDuty / email alert.
- `database.latencyMs > 2000` → P2 investigation.
- `ai.status = degraded` → check `ANTHROPIC_API_KEY` in hosting ENV.

---

## P0 Playbook: App Completely Down

1. **Assess:** Load `https://funnelforge.app` and `/functions/v1/health`.
2. **Check Supabase Status:** https://status.supabase.com
3. **Check Vercel/Netlify Status:** provider's status page.
4. **If deploy is the cause:**
   ```bash
   git log --oneline -5          # identify last deploy
   git revert <commit> --no-edit
   git push origin main           # triggers redeploy
   ```
5. **If DB is the cause:** Supabase incident → wait + post status update.
6. **Meta kill-switch** (if Meta is causing cascading failures):
   - Set `VITE_META_ENABLED=false` in hosting ENV → redeploy (~2 min).
   - See full procedure: [rollback-sop.md](./rollback-sop.md).

---

## P1 Playbook: Funnel Generation Broken

1. Check Anthropic status: https://status.anthropic.com
2. Check `ANTHROPIC_API_KEY` in ENV — not expired/rotated?
3. Check Sentry for recent `ai-coach` / `generate-copy` function errors.
4. Verify `ai-coach` edge function logs in Supabase Dashboard → Functions → Logs.
5. If rate-limited (429): check `rateLimit.ts` in-memory state — cold restart resets counters.
6. Temporary mitigation: disable AI generation behind `HIDE_INCOMPLETE=true`, ship static placeholder.

---

## P1 Playbook: Auth / Login Broken

1. Check Supabase Auth service status.
2. Local auth fallback should automatically activate — verify users see "local mode".
3. Check `AuthContext.tsx` — `checkSupabase()` has 3s timeout. If Supabase is slow, local auth kicks in.
4. If email confirmations broken: check Supabase SMTP settings in Dashboard → Auth → Email Templates.

---

## P2 Playbook: Meta Integration Down

1. Check Meta Graph API status: https://developers.facebook.com/status
2. Check OAuth scope — ads_read only is configured. If Meta changed requirements: check `metaApi.ts`.
3. Token expiry: Meta tokens expire in 60 days. Check `sessionStorage["meta_auth"]` expiry field.
4. Kill-switch: `VITE_META_ENABLED=false` → redeploy. UI shows "Meta temporarily unavailable" banner.

---

## Post-Incident

1. **Resolve** the incident (fix + deploy).
2. **Write post-mortem** within 24h:
   - Timeline (UTC): detection → first response → mitigation → resolution.
   - Root cause.
   - Impact: affected users, duration.
   - Action items (min 2: one preventive, one detective).
3. **Update this runbook** if the playbook was incomplete.
4. **ADR** if an architectural change was made.

---

## Key URLs

| Resource | URL |
|---|---|
| Health check | `/functions/v1/health` |
| Supabase Dashboard | https://supabase.com/dashboard |
| Supabase Status | https://status.supabase.com |
| Anthropic Status | https://status.anthropic.com |
| Meta API Status | https://developers.facebook.com/status |
| Sentry | (configure `VITE_SENTRY_DSN`) |
| AARRR Dashboard | `/admin/aarrr` |

---

*Last updated: 2026-04-17. Review trigger: any P0/P1 incident or 90 days.*
