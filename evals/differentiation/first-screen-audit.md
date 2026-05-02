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

### Screen 1: `DifferentiationResult.tsx` — primary view (mechanism tab default)

Reference: `src/components/DifferentiationResult.tsx:74-114` — the `InsightActionCard` block at the top.

| Q | Answer | Notes |
|---|---|---|
| Q1 | "מה הבידול שלי, ואיך אני משתמש בו?" | the user just submitted a 5-phase form |
| Q2 | **yes** | `mechanismStatement.oneLiner` is the blockquote H1 inside `InsightActionCard` (line 99-104). |
| Q3 | **partially** | 3 actions ("מדויק" / "לא מדויק" / "רוצה גרסה חדה יותר") not 1. Plan §6 calls for binary; staying with 3 until live IBAR justifies simplification. |
| Q4 | 3 — "מודול / תשובה / השתמש בזה" | acceptable; "השתמש בזה" is functional, not jargon. |
| Q5 | **no** | The card stands on its own; no framework reference needed to act. |

**Verdict (current state):** **partial pass.** The first screen does deliver the 4 things (oneLiner, why, where, feedback) inside `InsightActionCard`. The main risk is below the card: 3 primary tabs + a "More" dropdown competing for attention.

### Screen 2: `mechanism` tab content (`DifferentiationResult.tsx:156-197`)

This is the panel that opens **below** the InsightActionCard when the user is on the default tab.

| Q | Answer | Notes |
|---|---|---|
| Q1 | "תן לי את הפרטים מאחורי המשפט" | follow-up after reading the H1 |
| Q2 | **yes** — מנגנון/הוכחה/anti-statement מופיעים בכרטיס | each in its own labeled section (line 159-176) |
| Q3 | **no** — אין CTA | this is read-only context; that's correct for this tab |
| Q4 | 2 — "מנגנון", "הוכחה", "anti-statement" (3, borderline) | "anti-statement" is jargon. Consider renaming to "מה אתה לא". |
| Q5 | **no** | self-explanatory copy |

**Verdict:** **pass with one note** — rename the `antiStatement` label.

### Screen 3: `claims` tab — Claim audit (gap analysis)

| Q | Answer | Notes |
|---|---|---|
| Q1 | "אילו טענות שלי מאומתות, ומה לעשות עם החלשות?" | classic diagnostic question |
| Q2 | **yes** | each gap is a labeled card (verified/weak/empty) with recommendation |
| Q3 | **no** — אין כפתור פעולה ספציפי | could add "תקן את החלשות" CTA in future |
| Q4 | 2 — verified/weak/empty status | low |
| Q5 | **no** |  |

**Verdict:** **pass.**

### Screen 4: `competitors` tab

| Q | Answer | Notes |
|---|---|---|
| Q1 | "מי המתחרים שלי באמת ומה לעשות איתם?" |  |
| Q2 | **yes** | per-competitor card with archetype + counter-strategy |
| Q3 | **partial** | shows counter-strategy but no copy/use button |
| Q4 | 1 — "ארכיטיפ" (acceptable jargon for the audience) |  |
| Q5 | **borderline** | "ארכיטיפ" requires reading the value to understand |

**Verdict:** **pass with one note** — consider tooltip explanation on first hover.

### Screen 5: `committee`/`tradeoffs`/`metrics`/`report` (secondary tabs)

These are correctly demoted to a "More" dropdown (`DifferentiationResult.tsx:131-152`). No first-screen audit needed — by design they are not the first screen.

---

## Action items from this audit (pre-live-IBAR)

These can be done before the live harness run because they don't affect IBAR scoring directly:

- [ ] Rename `antiStatement` UI label from "Anti-statement" to "מה אתה לא" / "What you're not" (`mechanism` tab, line 173).
- [ ] Add brief tooltip on `archetype` badge in competitors tab.

**Deferred to post-live-IBAR (don't touch until data justifies):**

- [ ] Maybe collapse 3 check actions into 2 ("מדויק / לא מדויק") — only if live `ownership.feels_mine` rate is bimodal.
- [ ] Maybe add a dedicated "use this" per-channel copy customizer — only if `applicability` IBAR fails.

---

## Run log

| Date | Auditor | Verdict | Action items closed |
|---|---|---|---|
| 2026-05-02 | claude (auto-audit, current state) | mostly-pass; 2 minor copy tweaks pending | none yet — items logged |
