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
- docs/business-baseline.md נוצר עם 9 placeholders
- כל ה-9 ב-state `<TBD>`
- STOP — חסום עד שארז ימלא ידנית

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
