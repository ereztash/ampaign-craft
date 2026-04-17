# FunnelForge SLO / SLI Definitions

> **Scope:** Beta phase (first 90 days after launch). Review and tighten post-Beta.

---

## North Star Metric

| Metric | Definition | Target |
|---|---|---|
| Weekly Activated Plans | Count of `first_plan_generated` events in trailing 7 days | 25 plans/week |

Measured at `/admin/aarrr`. Reviewed weekly every Monday.

---

## SLI / SLO Table

| Service | SLI | Measurement | SLO Target |
|---|---|---|---|
| **App availability** | % of health checks returning 200 | `/functions/v1/health` every 5 min | ≥ 99.0% / month |
| **Funnel generation** | % of `ai-coach` requests completing in <10s | Edge function duration logs | ≥ 95% |
| **Auth** | % of sign-in/sign-up requests succeeding | Supabase Auth logs | ≥ 99.5% |
| **Page load** | % of loads with LCP < 3s | Sentry performance / web vitals | ≥ 90% |
| **Meta OAuth** | % of connect attempts succeeding (when Meta enabled) | `meta-token-exchange` success rate | ≥ 90% |

### Error Budget

| SLO | Monthly allowance |
|---|---|
| 99.0% availability | 7.2 hours downtime |
| 95% funnel completion | 36 hours of degraded AI |

When error budget is >50% consumed in the first 2 weeks, freeze feature work and prioritize reliability.

---

## Alerting Thresholds (P-levels)

| Condition | Severity | Action |
|---|---|---|
| Health 503 × 3 consecutive | P0 | Page on-call immediately |
| Funnel success rate < 90% for 10 min | P1 | Alert in 30 min |
| DB latency > 2000ms for 5 min | P1 | Alert in 30 min |
| Meta 401/403 spike > 10% in 5 min | P2 | Alert in 2 hours |
| LCP p75 > 4s | P3 | Next business day |

---

## Review Cadence

| Cadence | Action |
|---|---|
| Weekly | Review NSM + error budget burn rate at Monday standup |
| Monthly | Review SLO compliance, tighten if consistently >99.5% |
| Quarterly | Re-evaluate targets based on Beta learnings |

---

*Created: 2026-04-17. Owner: Erez. Next review: 2026-07-17.*
