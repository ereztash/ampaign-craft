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

2. Leads added per active session (median): `TBD_manual_estimate`
   מקור מדידה: לא קיים session-start tracking ב-CrmPage; אומדן ידני נדרש מארז (כמה לידים מוזנים בישיבה רגילה)
   חלון: 14 ימים אחרונים
   ברירת מחדל לחישוב delta: 1 (אם ארז לא מציין)

3. Time to first plan (median, minutes): `TBD_manual_estimate`
   מקור מדידה: signalCompletedAt קיים ב-feedbackLoop.ts:34, first_output_saved נרשם, אבל אגרגציה חוצת-משתמשים לא קיימת
   חלון: 30 ימים אחרונים
   ברירת מחדל לחישוב delta: 12 דקות (אם ארז לא מציין)

## Mid-Funnel (3)

4. D7 retention rate: `0%`
   מקור מדידה: Analytics.weeklyActive נרשם ב-Dashboard.tsx:50 אבל לא מתורגם ל-cohort retention; אין user activity log אגרגטיבי
   חלון: cohort 30 ימים אחרונים
   הערה: baseline = 0% כי אין מדידה זמינה

5. Plan completion rate (savedPlans / intakes_completed): `TBD_manual`
   מקור מדידה: Analytics.firstPlanGenerated קיים ב-Wizard.tsx:134, hasCompletedIntake קיים ב-intakeSignal.ts:55, אבל אגרגציה חוצת-משתמשים לא קיימת
   חלון: 30 ימים אחרונים
   ברירת מחדל לחישוב delta: 0 (אם ארז לא מציין)

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

## פעולות ארז (אופציונלי לפני Wedge 1)

מטריקות 2, 3, 5 הן `TBD_manual_estimate`. אם ארז רוצה דיוק, להחליף את הערך:
- מטריקה 2: כמה לידים מוזנים ב-CRM session רגיל בעיניך
- מטריקה 3: כמה דקות עוברות מ-Intake למסך התוצאה הראשון בעיניך
- מטריקה 5: % הערכה של plans שמושלמים אחרי intake מוצלח

אם ארז לא מציין, ה-defaults יוחלו: 1, 12, 0.

Wedge 1 יכול להתחיל עם ה-baseline הנוכחי. כל delta חיובי על 0 הוא הוכחת שיפור.
