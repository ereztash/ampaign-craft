# FunnelForge — הוראות המשך עבודה

## ענף פעיל
`claude/outreach-resistance-protocol-msm7K`

---

## מה הושלם בסשן האחרון (2026-05-04)

### תיקון באג CRM — דיאלוג שנסגר על כישלון save

**קובץ שעודכן:** `src/pages/CrmPage.tsx`

**הבאג:** ב-`LeadFormDialog.handleSubmit`, `setOpen(false)` נקרא ללא תנאי אחרי `onSave`, גם כש-`createLead` החזיר `null` (שגיאת Supabase). הדיאלוג נסגר, הטופס אופס, נראה כהצלחה — אבל הליד לא נשמר.

**התיקון:** הוספת `if (!result) return;` לפני `setOpen(false)` — בכישלון הדיאלוג נשאר פתוח.

**אימות ב-Supabase (via MCP):**
- שלושת טבלאות ה-CRM קיימות ב-production: `leads`, `lead_interactions`, `lead_recommendations_cache`
- RLS policies תקינות — INSERT מגביל ל-`auth.uid() = user_id`
- הבעיה הייתה אך ורק UX, לא DB

### מחקר — Outreach Resistance Protocol
דיון קונספטואלי על מסגרת פנייה קרה (לא הוטמע בקוד):
- מסלול התנגדות: `מי זה → למה אני → אמינות → ערך → מה רוצים`
- 6 שלבים: רלוונטיות → אמינות → פרסונליזציה → ערך → אנושיות → בקשה קטנה
- שלב 0 חסר במסגרת המקורית: "האם אני פותח את זה בכלל?" (subject/preview)
- פוטנציאל כ-meta-logic ל-OutreachComposer — שאלה פתוחה: AI-generated draft vs. HITL wizard

---

## מה הושלם בסשן הקודם (2026-05-02)

### Slice 3 — ViewModel layer + ESLint engine-import boundary

**קבצים שנוצרו:**
- `src/viewmodels/health.vm.ts` — `HealthScoreVM` + `toHealthScoreVM` adapter; re-export של `getHealthScoreColor`
- `src/viewmodels/insights.vm.ts` — `InsightVM`, `BottleneckVM`, `LoopStateVM` + adapters
- `src/viewmodels/user-profile.vm.ts` — `DISCProfileVM`, `NextStepVM`, `ChurnRiskVM` + adapters
- `src/viewmodels/index.ts` — barrel, נקודת import יחידה לכל ה-ViewModels

**קבצים שעודכנו:**
- `eslint.config.js` — rule חדשה `no-restricted-imports` ב-`src/components/**` שאוסרת `@/engine/*`; debt allowlist של 16 קומפוננטות שטרם מוּגרו

### Typography / IA — StrategyTab
- `InsightActionCard` בראש הטאב עם "3 הפעולות הדחופות עכשיו" — נגזר מ-worst health-score gaps, נעלם אחרי אישור המשתמש
- כרטיסי שלבי המשפך עטופים ב-Collapsible "תוכנית שלבים מלאה" (ברירת מחדל: פתוח)
- `healthScore` prop type עבר מ-`ReturnType<typeof calculateHealthScore>` ל-`HealthScore` מ-`@/viewmodels`
- תיקון em-dash ב-`PublicLandingDifferentiation.tsx` שעצר את ה-build

---

## המשך — עבודה ממתינה

### מיגרציית ViewModel debt — 16 קומפוננטות (בתוך allowlist)
בסדר עדיפות יורד לפי תדירות שימוש:
1. `GlobalInsightHero.tsx` — bottleneck, health, insights, weeklyLoop
2. `InsightFeed.tsx` — bottleneck, nextStep, pulse, ukg, outcomeLoop
3. `ResultsDashboard.tsx` — מנועים רבים (מיגרציה ראשית)
4. `IntelligenceSynthesisDashboard.tsx` — EPS, crossDomain, predictive, cohort
5. שאר 12 הקומפוננטות ב-allowlist

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

- `claude/outreach-resistance-protocol-msm7K` — **ענף פעיל**
- `claude/continue-checkpoint-166-gQl3G` — ענף קודם (merged לתוך הנוכחי)
- `perf/reactive-core` — DRAFT, ממתין ל-preview env validation
