# FunnelForge — הוראות המשך עבודה

## ענף פעיל
`claude/attention-time-value-cJRys`

---

## מה הושלם בסשן הנוכחי

### Slice 1 — LeadCard simplification (committed `33853fb`)
- `CrmPage.tsx`: LeadCard עבר מ-8+ פריטים שווים לסיכום + click-to-detail
- כרטיס: שם + עסק, ערך + פולואפ (רק אם קיים), כפתור אחד (WhatsApp אם יש טלפון, אחרת Email)
- הוסרו: תצוגת טלפון/מייל inline, תצוגה מקדימה של הערות, כפתור Lead Coach
- DropdownMenu מוגן מ-navigation trigger עם `stopPropagation`

---

## המשך — C Workstream (UX Engineering)

### Slice 2 — Dashboard tab compression ✅ (בוצע 2026-04-30)
**מיפוי בפועל** (שונה ממה שב-CLAUDE.md הקודם):
- `ResultsDashboard.tsx` — 10 טאבים, **כבר** משתמש ב-AdaptiveTabNav (3 super-groups: strategy/content/growth) ✅
- `AARRRDashboard.tsx` — 0 טאבים (לא משתמש ב-Tabs), אין מה לדחוס
- **DifferentiationResult.tsx** — 7 טאבים flat → דחוס ל-3 primary + "More" dropdown
  - Primary: `mechanism` / `claims` / `competitors` (תואם 1-1 ל-`pickDefaultTab` mapping מ-IntakeNeed)
  - More: `committee` / `tradeoffs` / `metrics` / `report`
  - הטאב המשני האקטיבי נשאר נראה inline; הטאבים הלא-אקטיביים בתפריט
- ContentTab.tsx (6) ו-IntelligenceSynthesisDashboard.tsx (4) — נשארו flat (סף סביר)

### Slice 3 — View-model layer + ESLint rule (הבא)
- להגדיר ViewModel interfaces שמפרידים engine output מ-UI props
- להוסיף ESLint rule שאוסר import ישיר מ-engine לתוך component ללא ViewModel

---

## ארכיטקטורת מנועים — החלטות שהתקבלו בסשן

### SNR 80/20 — 10 מנועי ה-Tier S (מריצים תמיד)
```
userKnowledgeGraph → funnelEngine → differentiationEngine
→ discProfileEngine → healthScoreEngine → guidanceEngine
→ behavioralActionEngine → gapEngine → costOfInactionEngine → nextStepEngine
```

### 29 מנועי Tier B/C — Lazy Activation Pattern
**ההחלטה**: לא כבויים — לומדים בשקט ומתעוררים לפי טריגר.

**קובץ להוסיף**: `src/engine/engineActivationRules.ts`
```ts
{ engineId, condition: (signals) => boolean, mode: "passive" | "standby" | "active" }
```

**4 סוגי טריגרים שהוגדרו:**
| סוג | דוגמה | מנועים |
|---|---|---|
| Data threshold | >20 לידים ב-CRM | salesPipelineEngine, churnPredictionEngine |
| Time-in-system | >30 יום פעיל | retentionFlywheelEngine, behavioralCohortEngine |
| Health anomaly | healthScore ירד >10 נק' | bottleneckEngine, gapEngine (escalated) |
| Intent signal | שאל coach על תמחור | pricingWizardEngine, hormoziValueEngine |

**תשתית קיימת שתומכת בזה:**
- `blackboard/circuitBreaker.ts` — enable/disable לפי מצב
- `blackboard/sentinelRail.ts` — preconditions למנוע
- `blackboard/partialRunner.ts` — מריץ subset של מנועים
- `intake/intakeSignal.ts` + `intake/feedbackLoop.ts` — צוברים signals בשקט

**הצעד הבא בארכיטקטורה**: להגדיר activation rules לכל 29 המנועים הלא-core ולחבר ל-`partialRunner`.

---

## הגדרת "טיוטה" (Draft) שהתגבשה

- **טיוטה** = כל הצעדים בכל תהליך למעט הפעולה הבלתי-הפיכה האחרונה (שליחה/ביצוע)
- **HITL** (Human In The Loop) רק בצעד האחרון
- **טיוטה אסטרטגית**: כוללת Toulmin reasoning מלא (Claim → Data → Warrant → Backing → Qualifier → Rebuttal)
- **טיוטה אופרטיבית**: נגזרת מאסטרטגיה מאושרת
- **Type D (תצפיות)**: לא רלוונטי לטיוטות

---

## עבודה על חזרה — A+B (ממתין לאימות C)

לפני שמתחילים A+B (Drafts Inbox):
1. לבצע 5 ראיונות משתמשים
2. go/no-go: האם משתמש מבין את הבדל בין טיוטה אסטרטגית לאופרטיבית ב-<3 שניות?
3. רק אז לבנות: 10 מוקים ויזואליים + module WhatsApp Drafts

---

## סטטוס טכני

- **Tests**: ~4750 עוברים (main), 4751 על הענף הפעיל
- **ESLint**: שגיאת `@eslint/js` קיימת מראש (pre-existing, לא נגרמה בסשן זה)
- **Dev server**: להריץ עם `--host 127.0.0.1` (:::8080 נכשל ב-EAFNOSUPPORT)

---

## סדר ה-PRs שנסגרו / נמזגו בסשן ה-cleanup (2026-04-29)

### מוזגו ל-main:
- `#133` README (consultant tiers + Seed Ask)
- `#95` radix-ui patches
- `#93` setup-node v4→v6, `#94` checkout v4→v6, `#97` @types/node bump
- `#98` lucide-react 0.462→1.11 + FacebookIcon inline-SVG fix
- `#117` CRM Lead Coach Phases 2-4 (crmInsightEngine + Pipeline Pulse + LeadCoachPanel)
- `#135` billing: subscription with hidden overage credits (402/credits + LimitReachedModal + usage_counters migration)

### נסגרו כ-stale/superseded:
- `#89`, `#90`, `#138`, `#139` — duplicates/stale
- `#23` campaign moat (old, no description)
- `#34` README (superseded by #133)
- `#38` dark mode cards (stale, 16 days)
- `#53` AARRR research (stale, no description)

### נסגרו כ-deferred (session bréakout required):
- `#96` vitest 3→4 (breaking major)
- `#99` eslint 9→10 (Node 20.19+ + flat config migration)

### נשארים פתוחים:
- `perf/reactive-core` (#102) — DRAFT, rebased על main, ממתין לvalidation ב-preview env

---

## תשתית hygiene שנוספה בסשן זה

- `.github/PULL_REQUEST_TEMPLATE.md` — checklist לכל PR
- `.github/workflows/stale.yml` — סוגר PRs לא פעילים אחרי 21 יום
- `.github/dependabot.yml` — עודכן עם ignore לvitest/eslint major bumps
- `CONTRIBUTING.md` — עודכן עם branching strategy + Dependabot tiers + hygiene baseline

---

## ענפים רלוונטיים

- `claude/attention-time-value-cJRys` — **ענף פעיל** (C workstream: Dashboard tab compression + ViewModel layer)
- `perf/reactive-core` — DRAFT, rebased, ממתין ל-preview env validation
