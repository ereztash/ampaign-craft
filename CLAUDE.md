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

### Slice 2 — Dashboard tab compression
**קבצים לבדוק:**
- `src/pages/ResultsDashboard.tsx` — 11+ טאבים
- `src/components/AARRRDashboard.tsx` — 8 טאבים
- **פעולה**: לזהות אילו טאבים כמעט לא נגמרים → Progressive disclosure (Primary tabs + "More" dropdown)

### Slice 3 — View-model layer + ESLint rule
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

- **Tests**: 4751 עוברים, אין שגיאות חדשות
- **ESLint**: שגיאת `@eslint/js` קיימת מראש (pre-existing, לא נגרמה בסשן זה)
- **Dev server**: להריץ עם `--host 127.0.0.1` (:::8080 נכשל ב-EAFNOSUPPORT)

---

## ענפים רלוונטיים

- `claude/attention-time-value-cJRys` — ענף פעיל (C workstream)
- `claude/subscription-with-overage` — 402/credits flow + streaming (merged לענף הראשי)
