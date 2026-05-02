# FunnelForge — הוראות המשך עבודה

## ענף פעיל
`claude/user-data-insights-Zs5ts`

---

## מה הושלם בסשן האחרון (2026-05-02)

### Cognitive Friction Audit — InsightActionCard pattern
כל 5 המודולים + אשף הטופס קיבלו את הפטרן:
**ANSWER → WHY → CONFIDENCE → USE IT → CHECK**

**קבצים שנוצרו/שונו:**
- `src/components/InsightActionCard.tsx` — Reference implementation חדש
- `src/components/MultiStepForm.tsx` — StepInsight pill מעל כל שלב
- `src/components/DifferentiationResult.tsx` — InsightActionCard בראש
- `src/components/SalesTab.tsx` — InsightActionCard + תיקון ויזואלי (ר' להלן)
- `src/components/PricingIntelligenceTab.tsx` — InsightActionCard בראש
- `src/components/RetentionGrowthTab.tsx` — InsightActionCard בראש
- `src/components/PlanningTab.tsx` — InsightActionCard בראש

### Jargon Audit — ניקוי ז'רגון מכל המשטחים הנגישים למשתמש
| קובץ | מה תוקן |
|---|---|
| `src/engine/funnelEngine.ts` | שמות שלבים B2B, תיאורים, שמות ערוצים, KPIs, tips — ICP/Tripwire/PLG/CLG/Trust Moat הוסרו |
| `src/components/ResultsDashboard.tsx` | NEURO_LABELS: קורטיזול/דופמין/אוקסיטוצין → קשב/החלטה/נאמנות |
| `src/components/StrategyTab.tsx` | NEURO_LABELS כפול זוהה ותוקן; CLG → "אסטרטגיית קהילה" |
| `src/components/TutorialFlow.tsx` | "קורטיזול, reactance, CTA" → עברית פשוטה |
| `src/components/IntelligenceSynthesisDashboard.tsx` | Radar chart axes: Cortisol/Oxytocin/Dopamine → עומס רגשי/חיבור/מוטיבציה |
| `src/components/BrandDiagnosticTab.tsx` | "Tripwire Offer", "דיסוננס קוגניטיבי" → עברית פשוטה |
| `src/engine/salesPipelineEngine.ts` | vectorLabel + psychology: ניקוי נוירוכימיה מכל 6 frameworks |

### SalesTab — תיקונים ויזואליים
- `DISCProfileCard` הועבר מראש הדף → לתוך Collapsible "פסיכולוגיית מכירה"
- Sales Type Badge הורד מהצף → שולב בכותרת כרטיס ה-Pipeline
- Funnel centering: `marginInlineStart` חד-צדדי → `mx-auto` סימטרי
- כפילות כותרת "איך לסגור" → Section 6 שונה ל"גישות לסגירה"

---

## המשך — עבודה ממתינה

### Slice 3 — View-model layer + ESLint rule
- להגדיר ViewModel interfaces שמפרידים engine output מ-UI props
- להוסיף ESLint rule שאוסר import ישיר מ-engine לתוך component ללא ViewModel

### Typography / IA improvement (הוצע, לא בוצע — ממתין לאישור)
- InsightActionCard בראש StrategyTab עם "3 הפעולות הדחופות עכשיו"
- שלבי אסטרטגיה מלאים מאחורי "הצג תוכנית שלבים מלאה ▼"

### Drafts Inbox — A+B Workstream (ממתין ל-5 ראיונות משתמש)
1. go/no-go: האם משתמש מבין הבדל בין טיוטה אסטרטגית לאופרטיבית ב-<3 שניות?
2. 10 מוקים ויזואליים → module WhatsApp Drafts

---

## ארכיטקטורת מנועים — החלטות שהתקבלו

### SNR 80/20 — 10 מנועי Tier S (מריצים תמיד)
```
userKnowledgeGraph → funnelEngine → differentiationEngine
→ discProfileEngine → healthScoreEngine → guidanceEngine
→ behavioralActionEngine → gapEngine → costOfInactionEngine → nextStepEngine
```

### 29 מנועי Tier B/C — Lazy Activation Pattern
**קובץ להוסיף**: `src/engine/engineActivationRules.ts`
```ts
{ engineId, condition: (signals) => boolean, mode: "passive" | "standby" | "active" }
```

**4 סוגי טריגרים:**
| סוג | דוגמה | מנועים |
|---|---|---|
| Data threshold | >20 לידים ב-CRM | salesPipelineEngine, churnPredictionEngine |
| Time-in-system | >30 יום פעיל | retentionFlywheelEngine, behavioralCohortEngine |
| Health anomaly | healthScore ירד >10 נק' | bottleneckEngine, gapEngine (escalated) |
| Intent signal | שאל coach על תמחור | pricingWizardEngine, hormoziValueEngine |

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
- **ESLint**: שגיאת `@eslint/js` קיימת מראש (pre-existing, לא נגרמה בסשן זה)
- **Dev server**: להריץ עם `--host 127.0.0.1` (:::8080 נכשל ב-EAFNOSUPPORT)

---

## PRs פתוחים

- `perf/reactive-core` (#102) — DRAFT, rebased, ממתין ל-preview env validation

---

## ענפים רלוונטיים

- `claude/user-data-insights-Zs5ts` — **ענף פעיל**
- `perf/reactive-core` — DRAFT, ממתין ל-preview env validation
