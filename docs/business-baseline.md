# Business Baseline — Revenue-First Strategy

תאריך יצירה: 2026-05-03
סטטוס: ממתין למילוי ידני על ידי ארז

חובה למלא לפני התחלת Wedge 1. בלי baseline אין מדידת delta.

## Leading Indicators (3)

1. WhatsApp sends per user per day: `<TBD>`
   מקור מדידה: `<TBD>`
   חלון: 7 ימים אחרונים

2. Time to first plan (median, minutes): `<TBD>`
   מקור מדידה: `<TBD>` (אפשרות: aarrr.activation.first_plan_generated minus aarrr.acquisition.signup_completed)
   חלון: 30 ימים אחרונים

3. Leads added per active session (median): `<TBD>`
   מקור מדידה: `<TBD>` (אפשרות: leads table grouped by user/session)
   חלון: 14 ימים אחרונים

## Mid-Funnel (3)

4. D7 retention (% של signups שחזרו ביום 7): `<TBD>`
   מקור מדידה: `<TBD>` (אפשרות: aarrr.retention.weekly_active)
   חלון: cohort 30 ימים אחרונים

5. % users עם 2+ plans saved: `<TBD>`
   מקור מדידה: `<TBD>` (אפשרות: profiles.savedPlanCount)
   חלון: כלל המשתמשים הפעילים ב-30 הימים האחרונים

6. % users שחיברו לפחות data source אחד: `<TBD>`
   מקור מדידה: `<TBD>` (אפשרות: data_sources table count > 0)
   חלון: כלל המשתמשים הפעילים ב-30 הימים האחרונים

## Outcome (3)

7. Self-reported revenue impact (% users שדיווחו revenue_reported outcome): `<TBD>`
   מקור מדידה: `<TBD>` (אפשרות: outcome_reports table where outcome_type = 'revenue_reported')
   חלון: 60 ימים אחרונים

8. Close rate חציוני בין משתמשים עם 10+ closed leads: `<TBD>`
   מקור מדידה: `<TBD>` (אפשרות: crmInsights.closeRate aggregated)
   חלון: כלל המשתמשים שעומדים בסף

9. Allocation change rate (% users ששינו ערוץ רכישה אחרי הצגת Channel ROI): `<TBD>`
   מקור מדידה: `<TBD>` (לא קיים היום, יידרש tracking ב-Wedge 7)
   חלון: 30 ימים מ-deployment של Wedge 7

## הוראות מילוי

- ארז מחליף כל `<TBD>` במספר אמיתי או "0" אם אין מדידה זמינה
- בכל סעיף שאין מקור מדידה, להוסיף "no_source" כדי לסמן blocker למדידת delta
- כששדה מתמלא, להעביר את השורה למעלה
- אחרי מילוי כל 9 השדות, לעדכן את `docs/wedge-progress.md` ולהפעיל את Wedge 1
