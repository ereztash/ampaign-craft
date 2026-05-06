# FunnelForge — הוראות המשך עבודה

## ענף פעיל
`claude/plan-repo-cleanup-OiANP`

---

## מה הושלם בסשן האחרון (2026-05-06)

### Repo Cleanup — ניקוי ריפוזיטורי מלא

**קבצים שנמחקו:**
- `all_migrations.sql` — dump מיותר, קיים ב-`supabase/migrations/`
- `bun.lockb` — פורמט בינארי ישן, מוחלף ע"י `bun.lock`
- `package-lock.json` — npm lockfile, הפרויקט משתמש ב-Bun

**ViewModel layer — השלמת מיגרציה מלאה:**
- 26 קבצי `.vm.ts` ב-`src/viewmodels/` (14 חדשים נוצרו בסשן זה)
- 86 טיפוסים/פונקציות שהיו חסרים נוספו לbarrel
- **54 קומפוננטות production** הוגרו מ-`@/engine/*` ל-`@/viewmodels`
- אפס imports ישירים מ-`@/engine/*` נשארו בקומפוננטות production
- `eslint.config.js` allowlist עודכן — קומפוננטות שהוגרו הוסרו

**ViewModels קיימים (`src/viewmodels/`):**
analytics, behavioral-action, blackboard, brand, business-fingerprint,
churn, crm-leads, data-import, differentiation, differentiation-phases,
executive-brief, export, guidance, health, insights, intake, moat,
next-step, outcome-loop, pricing, prospect-intelligence, referral,
sales, stylome, training, user-profile

### Slice 3 — ViewModel layer + ESLint engine-import boundary (2026-05-02)
- `src/viewmodels/health.vm.ts`, `insights.vm.ts`, `user-profile.vm.ts` — adapters ראשוניים
- `eslint.config.js` — rule `no-restricted-imports` error-level ב-`src/components/**`
- Typography / IA ב-StrategyTab: InsightActionCard, Collapsible phase plan

---

## המשך — עבודה ממתינה

### Drafts Inbox — A+B Workstream (ממתין ל-5 ראיונות משתמש)
1. go/no-go: האם משתמש מבין הבדל בין טיוטה אסטרטגית לאופרטיבית ב-<3 שניות?
2. 10 מוקים ויזואליים → module WhatsApp Drafts

### engineActivationRules.ts (Lazy Activation Pattern)
**קובץ להוסיף**: `src/engine/engineActivationRules.ts`
```ts
{ engineId, condition: (signals) => boolean, mode: "passive" | "standby" | "active" }
```

---

## ארכיטקטורת מנועים — החלטות שהתקבלו

### SNR 80/20 — 10 מנועי Tier S (מריצים תמיד)
```
userKnowledgeGraph → funnelEngine → differentiationEngine
→ discProfileEngine → healthScoreEngine → guidanceEngine
→ behavioralActionEngine → gapEngine → costOfInactionEngine → nextStepEngine
```

### 29 מנועי Tier B/C — Lazy Activation Pattern
**4 סוגי טריגרים:**
| סוג | דוגמה | מנועים |
|---|---|---|
| Data threshold | >20 לידים ב-CRM | salesPipelineEngine, churnPredictionEngine |
| Time-in-system | >30 יום פעיל | retentionFlywheelEngine, behavioralCohortEngine |
| Health anomaly | healthScore ירד >10 נק' | bottleneckEngine, gapEngine (escalated) |
| Intent signal | שאל coach על תמחור | pricingWizardEngine, hormoziValueEngine |

---

## ViewModel layer — כללי הארכיטקטורה

- **`src/viewmodels/`** — גבול בין engine output ל-UI props
- Components ו-Pages: import רק מ-`@/viewmodels`, לא מ-`@/engine/*`
- Hooks ו-Services: מותר לייבא מ-`@/engine/*` (הם שכבת האורקסטרציה)
- להוסיף ViewModel חדש לפני הוספת component שצורך engine type חדש

**ESLint enforcement:**
- `no-restricted-imports` — error-level ב-`src/components/**`
- debt allowlist = `eslint.config.js` בלוק "Engine-import debt"

---

## הגדרת "טיוטה" (Draft) שהתגבשה

- **טיוטה** = כל הצעדים בכל תהליך למעט הפעולה הבלתי-הפיכה האחרונה
- **HITL** רק בצעד האחרון
- **טיוטה אסטרטגית**: Toulmin reasoning מלא
- **טיוטה אופרטיבית**: נגזרת מאסטרטגיה מאושרת

---

## סטטוס טכני

- **TypeScript**: עובר נקי (`npx tsc --noEmit` — אפס שגיאות)
- **em-dash gate**: עובר (`bash scripts/check-em-dash.sh`)
- **ESLint**: שגיאת `@eslint/js` קיימת מראש (pre-existing — גירסת ESLint גלובלית 10.x vs. פרויקט 9.x)
- **Dev server**: להריץ עם `--host 127.0.0.1` (:::8080 נכשל ב-EAFNOSUPPORT)

---

## PRs פתוחים

- `perf/reactive-core` (#102) — DRAFT, rebased, ממתין ל-preview env validation

---

## ענפים רלוונטיים

- `claude/plan-repo-cleanup-OiANP` — **ענף פעיל** (repo cleanup + viewmodel migration)
- `perf/reactive-core` — DRAFT, ממתין ל-preview env validation
