# Business Baseline — Revenue-First Strategy

תאריך יצירה: 2026-05-03
תאריך מילוי: 2026-05-03
סטטוס: FILLED — מוכן ל-Wedge 1

הערה: רוב המדדים ב-baseline = 0 כי לא נמדדו לפני האסטרטגיה. זה תקין. delta יחושב מ-0, וכל מספר חיובי הוא delta חיובי.

## Leading Indicators (3)

1. WhatsApp sends per user per day: `0`
   מקור מדידה: לא קיים היום, יוסף ב-Wedge 3 דרך captureOutcome("navigated") ב-WhatsAppSendButton.handleSend
   חלון: 7 ימים אחרונים
   הערה: baseline = 0 כי כל send דרך wa.me deep link לא נרשם

2. Leads added per active session (median): `1`
   מקור מדידה: לא קיים session-start tracking ב-CrmPage; default מקובל מ-ארז
   חלון: 14 ימים אחרונים
   הערה: bias check בנקודת הבדיקה של שבוע 1

3. Time to first plan (median, minutes): `12`
   מקור מדידה: signalCompletedAt קיים ב-feedbackLoop.ts:34, first_output_saved נרשם, אגרגציה חוצת-משתמשים לא קיימת
   חלון: 30 ימים אחרונים
   הערה: default מקובל מ-ארז. bias check בנקודת הבדיקה של שבוע 1, target המרכזי של Wedges 5+6

## Mid-Funnel (3)

4. D7 retention rate: `0%`
   מקור מדידה: Analytics.weeklyActive נרשם ב-Dashboard.tsx:50 אבל לא מתורגם ל-cohort retention; אין user activity log אגרגטיבי
   חלון: cohort 30 ימים אחרונים
   הערה: baseline = 0% כי אין מדידה זמינה

5. Plan completion rate (savedPlans / intakes_completed): `STRUCTURALLY_UNMEASURABLE`
   מקור מדידה: Analytics.firstPlanGenerated קיים ב-Wizard.tsx:134, אבל אין אירוע `aarrr.activation.intake_completed` ב-eventQueue; hasCompletedIntake נשמר רק ב-localStorage (intakeSignal.ts:8 "Not synced to Supabase")
   חלון: 30 ימים אחרונים
   הערה: ה-default 0% החשוד הוא case 1 (אין תשתית). Wedge עתידי יכול להוסיף intake_completed event ל-eventQueue. לא חוסם את האסטרטגיה הנוכחית כי מטריקות 1-4, 6-9 ניתנות למדידה דרך השינויים של ה-wedges עצמם.

6. Stale leads re-engaged rate: `0%`
   מקור מדידה: לא קיים lastOutreachAt על leads, יוסף ב-Wedge 3
   חלון: 14 ימים אחרונים
   הערה: baseline = 0% by definition

## Outcome (3)

7. Self-reported revenue impact (% users עם revenue_reported): `0%`
   מקור מדידה: outcome_reports עם outcome_type='revenue_reported' לא מופעל היום ב-UI; closure gap #2 בונה
   חלון: 60 ימים אחרונים
   הערה: baseline = 0% by definition

8. Closed lead value cumulative (sum NIS): `runtime_query_required`
   מקור מדידה: SELECT SUM(value_nis) FROM leads WHERE status='closed', נדרש ב-checkpoint סוף שבוע 6
   חלון: כלל הזמן עד תאריך המדידה
   ברירת מחדל: יבוצע runtime query בסוף שבוע 6

9. D30 retention rate: `0%`
   מקור מדידה: אותו pattern כמו D7, אין user activity log אגרגטיבי
   חלון: cohort 60 ימים אחרונים
   הערה: baseline = 0% כי אין מדידה זמינה

## סטטוס מילוי

- מטריקות 1, 4, 6, 7, 9: 0% by definition (אין מדידה לפני האסטרטגיה)
- מטריקות 2, 3: defaults אושרו (1 ליד/session, 12 דקות לתוכנית). bias check בשבוע 1.
- מטריקה 5: PENDING_VERIFICATION. נדרשת בדיקה בקריאה הבאה לפני Wedge 1.
- מטריקה 8: runtime query בסוף שבוע 6.

Wedge 1 יכול להתחיל רק אחרי verification של מטריקה 5.
