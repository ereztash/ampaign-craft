# Wedge Progress — Revenue-First Strategy

ענף פעיל: `claude/improve-app-utility-l9ps6`
תאריך התחלה: 2026-05-03

## Pre-flight Status

### Check 0.1: Arch Lint Sanity
- InsightFeed.tsx imports captureRecommendationShown: PASS (line 13)
- WhatsAppSendButton.tsx does NOT import captureRecommendationShown: PASS
- Result: PASS — לא Fallback A/B/C

### Check 0.2: Data Infrastructure (sweep של 7 ה-wedges)
- Wedge 1 (lead.phone): PASS — שדה קיים ב-services/leadsService.ts:30
- Wedge 2 (crmInsights.staleLeads + leadCoachEngine recommend): PASS עם הערה — הפונקציה נקראת `generateLeadRecommendations` (engine/leadCoachEngine.ts:387), לא `recommend`. שימוש מתואם.
- Wedge 3 (outcomeLoopEngine.captureOutcome): PASS — engine/outcomeLoopEngine.ts:268
- Wedge 4 (CrmPage AddLead state + LeadDetail routing): PASS — pages/CrmPage.tsx:148, pages/LeadDetail.tsx exists
- Wedge 5 (signalCompletedAt + first_output_saved telemetry): PASS — engine/intake/feedbackLoop.ts:34, kind:"first_output_saved" line 28
- Wedge 6 (getIntakeSignal + getDifferentiationPreFill reference): PASS — engine/intake/intakeSignal.ts:27, lib/adaptiveFormRules.ts:15
- Wedge 7 (profiles.acquisition_source): PARTIAL — column exists (integrations/supabase/types.ts:117). מספר closed leads >=5 לא ניתן לאימות סטטי, יידרש runtime check ב-pre-condition של Wedge 7.

### Check 0.3: Baseline Metrics Snapshot
- docs/business-baseline.md מולא לפי הנחיות ארז
- 6 metrics ב-baseline 0 (by definition: לא נמדדו לפני האסטרטגיה)
- 3 metrics (2, 3, 5) ב-TBD_manual_estimate עם defaults אם ארז לא מציין: 1, 12 דקות, 0%
- 1 metric (8) ב-runtime_query_required לסוף שבוע 6
- מוכן ל-Wedge 1

## Notes לקריאות הבאות

### תיקון שמות פונקציות (פעולה א')
ב-Wedge 2 וב-Wedge 3 הפרומפט המקורי מתייחס ל-`leadCoachEngine.recommend`. השם הנכון בקוד:
- `generateLeadRecommendations` ב-engine/leadCoachEngine.ts:387
- חתימה: `(input: LeadCoachInput) => LeadRecommendation[]`
- בעת יישום Wedge 2/3, להשתמש בשם הנכון

### Wedge 7 Runtime Gate (פעולה ב')
לפני התחלת Wedge 7 (שבועות 4-5), חובה להריץ runtime check:
```
SELECT COUNT(*) FROM leads
WHERE status='closed' AND acquisition_source IS NOT NULL
```
- אם count >= 5: להמשיך ל-Wedge 7
- אם count < 5: לדחות Wedge 7 ב-30 יום, רישום ב-Deferred למטה
- אחרי 30 יום עדיין < 5: להעביר ל-deep-refactor.md, לבטל Wedge 7 בסבב הנוכחי

### Branch Workflow Decision (פעולה ד')
סטטוס: CONFIRMED על ידי ארז.
כל הסבב על branch אחד `claude/improve-app-utility-l9ps6` עם commit נפרד פר wedge. reversibility דרך git revert. אם אחרי Wedge 3 history מבלבל, מעבר ל-branch-per-wedge.

### Pre-Wedge-1 Verification (חובה בקריאה הבאה)
ארז סימן את ה-default 0% של מטריקה 5 (Plan completion rate) כחשוד. לפני התחלת Wedge 1:

1. הרצת בדיקה: count(savedPlans) חלקי count(distinct users שהשלימו Intake)
   - מקור: supabase profiles + plans tables, או localStorage funnelforge-plans + funnelforge-intake-signal
   - גודל מדגם: כל המשתמשים הזמינים, חלון 30 יום
2. אם הספירה > 0%: לעדכן business-baseline.md מטריקה 5 לערך האמיתי, ולהמשיך ל-Wedge 1
3. אם הספירה = 0% אמיתי: STOP, לדווח לארז. שבעת ה-wedges לא יזיזו את הצוואר העיקרי. ארז יחליט אם wedge 0 חדש (Plan Completion) קודם ל-1.

### Composite Call Permission
הקריאה הבאה היא composite מותר: verification של 5 דקות + (תנאי) Wedge 1 implementation. חריגה מ-one-wedge-per-session מאושרת על ידי ארז.

## Wedge Status Tracker

| Wedge | Name | Week | Status | Files | Lint | C1/C2/C3 | Decision |
|---|---|---|---|---|---|---|---|
| 1 | WhatsApp defaultPhone | 1 | NOT_STARTED | — | — | — | — |
| 2 | Stale Leads → Drafts | 1 | NOT_STARTED | — | — | — | — |
| 3 | WhatsApp Tracking | 1 | NOT_STARTED | — | — | — | — |
| 4 | AddLead Split | 2-3 | NOT_STARTED | — | — | — | — |
| 5 | TTV Badge | 2-3 | NOT_STARTED | — | — | — | — |
| 6 | Intake Pre-fill | 2-3 | NOT_STARTED | — | — | — | — |
| 7 | Channel ROI Strip | 4-5 | NOT_STARTED | — | — | — | — |

## Deferred

(ריק)

## Checkpoints

(ריק עד סוף שבוע 1)
