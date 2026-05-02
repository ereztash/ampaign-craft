# First-Screen Audit — DifferentiationResult.tsx

Manual checklist. Fill it in **once per UI change** to the result screen. The goal is not aesthetics; it's cognitive load.

The first screen after a user clicks "Generate" must answer four questions in <5 seconds:

1. **זה המשפט שלך** — the oneLiner is the visual H1.
2. **למה הוא נכון** — one line of provenance / proof.
3. **איפה להשתמש בו עכשיו** — at least one concrete use case (LinkedIn, sales call, profile).
4. **זה מדויק או לא?** — a single binary feedback control.

Tabs `committee` / `tradeoffs` / `metrics` / `report` are **not** the first screen. They are diagnostic depth, not the deliverable.

---

## Audit Questions (per screen)

For each screen the user sees during the differentiation flow, answer:

| # | Question | Threshold |
|---|---|---|
| Q1 | מה השאלה הטבעית של המשתמש ברגע הזה? | one sentence |
| Q2 | האם התשובה מופיעה תוך 5 שניות? | yes / no |
| Q3 | האם יש פעולה אחת ברורה? | yes / no |
| Q4 | כמה מושגים חדשים יש במסך? | ≤2 |
| Q5 | האם נדרש להבין framework כדי לקבל ערך? | no |

---

## Screens

### Screen: `DifferentiationResult.tsx` — primary view (mechanism tab)

| Q | Answer | Notes |
|---|---|---|
| Q1 | _TBD_ |  |
| Q2 | _TBD_ |  |
| Q3 | _TBD_ |  |
| Q4 | _TBD_ |  |
| Q5 | _TBD_ |  |

**Verdict:** _pass / fail_

### Screen: `committee` tab

| Q | Answer | Notes |
|---|---|---|
| Q1 | _TBD_ |  |

(repeat per tab: claims / competitors / committee / tradeoffs / metrics / report)

---

## Action items from this audit

- [ ] _e.g., Hide `metrics` tab behind "More" dropdown — too many concepts on first screen_
- [ ] _e.g., Move feedback control above the fold_

---

## Run log

| Date | Auditor | Verdict | Action items closed |
|---|---|---|---|
| _TBD_ | _TBD_ | _TBD_ | _TBD_ |
