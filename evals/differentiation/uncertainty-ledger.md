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

| Run ID | Date | Mode | Personas tested | IBAR summary | Genericity | Kill criteria | Outcome |
|---|---|---|---|---|---|---|---|
| 001-mock | 2026-05-02 | mock | 20 | clarity 12/20 (FAIL) · ownership 12/20 · applicability 14/20 · improvability 0/20 · preference 19/20 | 8/20 | none triggered | mock fail-biased — expected; live run pending |
| 002-proxy | 2026-05-02 | proxy (Haiku 4.5 via Supabase edge function) | 20 | **clarity 0/20** (FAIL) · **ownership 0/20** · **applicability 0/20** · improvability 0/20 · **preference 7/20** | **20/20** | **ALL FOUR** triggered | engine output fails red-team interrogation across the board |

### Notes on run 002 (proxy / live)

- Real Anthropic Haiku 4.5 calls. ~120 LLM calls total: 20 oneLiners + 20 ChatGPT baselines + 20×4 red-team prompts + 1 premortem.
- Genericity score distribution: min 72, p25 85, median 89, p75 92, max 95. **Every** persona scored ≥70 — the engine is producing marketing-speak, not differentiated claims.
- Kill switches all flipped: not a single-dimension failure to patch. The synthesis prompt itself produces output that an adversarial reviewer can't defend.
- Failure pattern is **uniform across personas**, not concentrated. 4-5 dimensions failed for almost every persona; no ICP escape valve.

### Per-segment breakdown (run 002)

| Segment | n | ff_wins (vs ChatGPT+template) | mean genericity | gen_failures |
|---|---|---|---|---|
| b2b_services | 4 | 1 | 89 | 4/4 |
| b2c_services | 4 | 3 | 91 | 4/4 |
| b2b_saas | 3 | 0 | 83 | 3/3 |
| b2c_creator | 3 | 3 | 80 | 3/3 |
| edge_case | 3 | 0 | 91 | 3/3 |
| failure_state | 3 | 0 | 94 | 3/3 |

**Signal:** the only places where FF *sometimes* beats ChatGPT are b2c_services and b2c_creator — segments where the form data carried specific numbers (e.g., p04 lawyer "85 M&A deals", p06 clinic Dr. Rosen by name, p13 creator's ingredient claims). When the form was sparse (edge_case, failure_state), FF lost or tied 100% of the time.

### Status updates from run 002

| # | Assumption | Previous | New | Reason |
|---|---|---|---|---|
| #4 | clarity ≥16/20 | untested | **tested-fail** | clarity 0/20; critic returned coherent=false or genericity≥70 for all |
| #5 | ownership feels-mine ≥12/20 | untested | **tested-fail** | ownership 0/20; LLM-as-persona rejected every output as "marketing speak" |
| #6 | applicability ≥10/20 | untested | **tested-fail** | applicability 0/20; usability.would_use=false for all 20 |
| #7 | preference over ChatGPT ≥8/20 | untested | **tested-fail** | 7/20 wins; below threshold but close |
| #10 | engine works on edge personas | untested | **tested-fail** | edge_case 0/3, failure_state 0/3 — those segments are the hardest hit |
| #12 | engine doesn't return generic statements | untested | **tested-fail** | 20/20 above genericity 70; median 89 |
| #1 | user wants a sendable line | untested | **needs-user** | LLM red-team can't validate demand |
| #11 | secondary tabs don't confuse | untested | **needs-user** | requires real-user UX observation |
| #2, #3 | promise = 10 min, oneLiner is primary output | untested | **untested** | not yet probed by the harness |
| #9 | feedback translates to better v2 | untested | **untested** | v1→v2 iteration not implemented |

### Premortem categories (worst persona)

| Category | Count |
|---|---|
| positioning | 6 |
| trust | 3 |
| real | 3 |
| measurement | 2 |
| market | 2 |
| price | 2 |
| complexity | 1 |
| ux | 1 |

The dominant failure category is **positioning** — the synthesis prompt produces vague claims ("the only", "uniquely combines", "deep understanding") instead of falsifiable, measurable differentiators.
