# Differentiation Module — Uncertainty Ledger

זה הקובץ שמוביל את הוולידציה. כל הנחה שהמודול מסתמך עליה — מנוסחת, מסווגת, ומקבלת סף החלטה. בכל מעבר של ה-harness, ה-`status` מתעדכן.

**Status legend:**
- `untested` — לא נבדק עדיין
- `tested-pass` — עבר את ה-`decision_threshold` ב-Synthetic IBAR
- `tested-fail` — לא עבר; דורש פעולה לפני המשך
- `needs-user` — לא ניתן להפחית עוד עם LLM; דורש משתמש אמיתי

**Types:**
- `customer` — האם הלקוח באמת רוצה את זה
- `ux` — האם המסך עונה על השאלה הטבעית
- `cognitive` — האם המשתמש מבין מה לעשות
- `trust` — האם המשתמש מאמין בפלט
- `architecture` — האם המנועים באמת מזיזים פעולה
- `competitive` — האם זה עדיף על חלופה זמינה

---

## Assumptions

| # | Assumption | Type | How to test (no users) | Decision threshold | Status |
|---|---|---|---|---|---|
| 1 | בעל עסק מבולבל באמת רוצה משפט בידול שאפשר לשלוח ללקוח (לא analysis report) | customer | `usability.would_use=true` ≥ 12/20 פרסונות | ≥12/20 | untested |
| 2 | 10 דקות זה הזמן הנכון להבטיח (לא 2, לא 30) | customer | סקר פרסונות על expectedMinutes (2/10/30 options) | מודל 10 מנצח ב-≥10/20 | untested |
| 3 | One-Liner Card הוא הפלט הראשי הנכון (ולא mechanism+proof+antiStatement כולם יחד) | ux | First-screen audit + comparison: persona מצביע על מה שזיהה כפלט | זיהוי oneLiner כפלט ב-≥16/20 | untested |
| 4 | המשתמש מבין `mechanism statement` בלי הסבר fr framework | cognitive | `clarity` IBAR | ≥16/20 | untested |
| 5 | המשפט שנוצר מרגיש כשל המשתמש (ownership) | trust | `ownership.feels_mine=true` | ≥12/20 | untested |
| 6 | המשתמש יודע איפה להשתמש במשפט (פוסט/פרופיל/הצעה/שיחה) | cognitive | `usability.where.length≥1` | ≥10/20 | untested |
| 7 | הפלט עדיף על ChatGPT רגיל עם prompt גנרי | competitive | `comparison.winner="ff"` | ≥8/20 | untested |
| 8 | הפלט עדיף על template "We help X do Y unlike Z" | competitive | `comparison.winner="ff"` נגד template | ≥10/20 | untested |
| 9 | פידבק "לא שלי" מתורגם לשיפור v2 ברור | architecture | iterate v1→v2 לפי `ownership.what_to_change`; clarity v2 > v1 | שיפור ב-≥8/20 | untested |
| 10 | המנוע עובד גם על קצוות קשים (סקפטי AI, מוצף משאלון, קהל לא ברור) | architecture | per-persona breakdown; אין פרסונה שגורמת ל-genericity_failure | אף פרסונה לא נופלת ב-≥3 ממדים | untested |
| 11 | ה-result fields מעבר ל-oneLiner (committee, tradeoffs, contraryMetrics) לא מבלבלים | ux | First-screen audit Q4: ≤2 מושגים חדשים במסך הראשון | ידנית | untested |
| 12 | המנוע לא מחזיר משפטים גנריים בקלטים שונים | architecture | embedding similarity של oneLiner בין 20 פרסונות | מקסימום cosine ≤0.85 | untested |
| 13 | המשתמש *יפעל* (יעתיק, יערוך, ישלח) — לא רק "יבין" | customer | **לא ניתן להפחית עם LLM** | — | needs-user |
| 14 | המשתמש ישלם על זה | customer | **לא ניתן להפחית עם LLM** | — | needs-user |
| 15 | המשתמש יחזור שבוע אחרי לעדכן | retention | **לא ניתן להפחית עם LLM** | — | needs-user |

---

## Kill Criteria (referenced from plan §9)

חמישה תנאי-עצירה. כל אחד בינארי:

1. `genericity_failure > 8/20` → engine ציון #12 נכשל → לחזור למנוע.
2. `preference over GPT < 8/20` → ציון #7 נכשל → לא ל-UI rewrite.
3. `applicability < 8/20` → ציון #6 נכשל → לעדכן promise headline ב-`intakeMatrix.ts`.
4. `clarity < 12/20` → ציון #4 נכשל → לחזור ל-engine/copy.
5. רוב הכשלים מפרסונה אחת → ציון #10 נכשל → להוציא קטגוריה מ-ICP.

---

## נסיון לזיהוי הנחות חסרות (premortem-driven)

לקראת run-001, נריץ premortem prompt ב-`harness/redTeamPrompts.ts`. כל סיבת כישלון שעולה משם ולא נמצאת בטבלה — מתווספת כשורה חדשה לפני הריצה הבאה.

---

## Run log

| Run ID | Date | Personas tested | IBAR summary | Outcome |
|---|---|---|---|---|
| 001 | TBD | 20 | TBD | — |
