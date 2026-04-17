# FunnelForge — Prioritization Log (RICE)

> Updated after each planning session. Sorted by RICE score (highest first).
> Formula: RICE = (Reach × Impact × Confidence%) / Effort (person-weeks)

---

## Active Items (Beta roadmap)

| # | Feature | Reach | Impact | Conf. | Effort | RICE | MoSCoW | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | **Funnel generation (core)** | 100 | 3 | 90% | 2 | 135 | Must | ✅ Shipped |
| 2 | **Multi-step onboarding wizard** | 90 | 3 | 85% | 3 | 76.5 | Must | ✅ Shipped |
| 3 | **Strategy canvas (plan editor)** | 80 | 3 | 80% | 4 | 48 | Must | ✅ Shipped |
| 4 | **Archetype personalisation** | 70 | 2 | 75% | 3 | 35 | Should | ✅ Shipped |
| 5 | **AARRR dashboard + NSM** | 60 | 2 | 90% | 2 | 54 | Should | ✅ Shipped |
| 6 | **PMF survey (Sean Ellis)** | 50 | 3 | 80% | 0.5 | 240 | Should | ✅ Shipped |
| 7 | **NPS widget** | 50 | 2 | 80% | 0.5 | 160 | Should | ✅ Shipped |
| 8 | **Referral program (UTM + loop)** | 40 | 3 | 70% | 1 | 84 | Should | ✅ Shipped |
| 9 | **Consent banner (GDPR)** | 100 | 3 | 95% | 1 | 285 | Must | ✅ Shipped |
| 10 | **Privacy + ToS pages** | 100 | 3 | 95% | 1 | 285 | Must | ✅ Shipped |
| 11 | **Support page + feedback table** | 80 | 2 | 90% | 1 | 144 | Must | ✅ Shipped |
| 12 | **Email digest (weekly)** | 60 | 2 | 70% | 1 | 84 | Should | ✅ Shipped |
| 13 | **Notification center (in-app)** | 60 | 2 | 75% | 1 | 90 | Should | ✅ Shipped |
| 14 | **safeStorage (localStorage safety)** | 100 | 3 | 95% | 0.5 | 570 | Must | ✅ Shipped |
| 15 | **A/B variant infra (ENV-based)** | 80 | 2 | 70% | 0.5 | 224 | Should | ✅ Shipped |
| 16 | **Use-cases library page** | 50 | 2 | 65% | 0.5 | 130 | Could | ✅ Shipped |
| 17 | **"Did this help?" surveys** | 60 | 2 | 70% | 0.5 | 168 | Should | ✅ Shipped |
| 18 | **Health endpoint + SLO docs** | 20 | 3 | 90% | 0.5 | 108 | Must | ✅ Shipped |
| 19 | **CRM module** | 30 | 2 | 50% | 8 | 3.75 | Could | 🕐 Post-Beta |
| 20 | **IndexedDB storage migration** | 20 | 2 | 60% | 4 | 6 | Could | 🕐 Post-Beta |
| 21 | **httpOnly cookie token storage** | 30 | 3 | 70% | 6 | 10.5 | Should | 🕐 Post-Beta |
| 22 | **Session recording (Hotjar/FullStory)** | 100 | 2 | 60% | 2 | 60 | Won't (privacy) | ❌ Deferred |
| 23 | **A/B testing (Statsig/GrowthBook)** | 80 | 2 | 50% | 6 | 13.3 | Could | 🕐 Post-Beta |

---

## Scoring Guide

| Impact | Definition |
|---|---|
| 3 (Massive) | Directly grows NSM (weekly_activated_plans), prevents churn, legal requirement |
| 2 (High) | Improves activation/retention metric, reduces friction |
| 1 (Medium) | Nice-to-have, improves UX but doesn't move the needle |

| Confidence | Definition |
|---|---|
| 90–100% | We've built it before / user research confirms demand |
| 70–89% | Reasonable assumption / similar products show demand |
| 50–69% | Hypothesis — needs validation |
| <50% | Risky — explore/spike before building |

---

## Review Cadence

- **Weekly:** Review top 5 pending items — reprioritize if new evidence.
- **Monthly:** Recalculate RICE based on Beta usage data.
- **Post-Beta:** Major re-sort based on user research findings.

---

*Last updated: 2026-04-17. Owner: Erez.*
