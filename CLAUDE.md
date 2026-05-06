# FunnelForge — הוראות המשך עבודה

## ענף פעיל
`claude/app-evaluation-strategy-SkmAh`

---

## מה הושלם בסשן האחרון (2026-05-06)

### Slice 4 — מיגרציית ViewModel debt הושלמה במלואה

**מצב סופי**: אפס `@/engine/*` imports ב-`src/components/**`. כל ה-allowlist נוקה.
ESLint rule `no-restricted-imports` פעיל גלובלית בלי חריגים.

**ViewModel files חדשים (re-export pattern):**
- `behavioral-heuristic.vm.ts`, `brand-vector.vm.ts`, `business-fingerprint.vm.ts`
- `churn.vm.ts`, `copy-qa.vm.ts`, `data-import.vm.ts`
- `differentiation.vm.ts`, `differentiation-transcript.vm.ts`
- `executive-brief.vm.ts`, `export.vm.ts`, `guidance.vm.ts`
- `neuro-closing.vm.ts`, `behavioral-action.vm.ts`, `training-data.vm.ts`
- `pricing.vm.ts`, `agent-blackboard.vm.ts`, `quote.vm.ts`
- `referral.vm.ts`, `retention-growth.vm.ts`, `sales-pipeline.vm.ts`
- `stylome.vm.ts`, `uvp-synthesis.vm.ts`, `weekly-loop.vm.ts`
- `moat.vm.ts`, `pulse.vm.ts`

**VMs קיימים שהורחבו:**
- `analytics.vm.ts` — נוספו `calculateEPS`, `generateCrossDomainInsights`, `assignToCohort`
- `intake.vm.ts` — נוספו טיפוסי intake, `getIntakeSignal`, `setIntakeSignal`, `recordRouteVisit`, `detectBehaviorMismatch`
- `next-step.vm.ts` — נוסף `generateWeeklyPulse`
- `user-profile.vm.ts` — נחשף `DISCProfile`, `inferDISCProfile`, `ChurnRiskAssessment`

**קבצים שעודכנו:**
- 52 קבצים ב-`src/components/**` עברו מ-`@/engine/*` ל-`@/viewmodels`
- `eslint.config.js` — נמחק בלוק "Engine-import debt allowlist" (54 entries)
- `src/viewmodels/index.ts` — barrel הורחב לכלול את כל ה-VMs החדשים

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
- debt allowlist נוקה במלואו ב-2026-05-06; אין חריגים כיום

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

- `claude/app-evaluation-strategy-SkmAh` — **ענף פעיל**
- `claude/continue-checkpoint-166-gQl3G` — היסטורי
- `perf/reactive-core` — DRAFT, ממתין ל-preview env validation

---

## משימות ממתינות (לא חסומות בקוד)

### Drafts Inbox — A+B Workstream
ממתין ל-5 ראיונות משתמש (אנושיים — לא ניתן להשלים אוטומטית):
1. go/no-go: האם משתמש מבין הבדל בין טיוטה אסטרטגית לאופרטיבית ב-<3 שניות?
2. 10 מוקים ויזואליים → module WhatsApp Drafts
