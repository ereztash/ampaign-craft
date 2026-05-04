# Frameworks Reference — Internal Use Only

This document preserves the original academic/framework names and theory behind
concepts that appear in the UI with simplified language. The UI copy is written
for SMB owners (non-consultants). This document is for engineers and product
designers who need the original source material.

---

## 1. Hormozi Value Equation

**UI label:** "מה הופך את ההצעה שלך לבלתי-נדחית" / "What makes your offer irresistible"

**Original name:** The Value Equation — Alex Hormozi, *$100M Offers* (2021)

**Formula:** Value = (Dream Outcome × Perceived Likelihood of Achievement) / (Time Delay × Effort & Sacrifice)

**Four dimensions (original names → UI labels):**

| Original | UI (Hebrew) | UI (English) |
|---|---|---|
| Dream Outcome | תוצאה חלומית | Dream Outcome |
| Perceived Likelihood of Achievement | כמה הלקוח מאמין שזה יעבוד לו | How much the customer believes it will work |
| Time Delay | כמה זמן עד שהוא רואה תוצאה | Time until they see results |
| Effort & Sacrifice | מה הוא צריך לעשות / לוותר עליו | What they need to do or give up |

**Optimization Priority → UI:** "איפה הכי כדאי להשקיע מאמץ" / "Where to focus your effort next"

**Engine file:** `src/engine/hormoziValueEngine.ts`

---

## 2. NRR — Net Revenue Retention

**UI label:** "כמה כסף נשאר אצלך מלקוחות חוזרים" / "Revenue retained from returning customers"

**Original name:** Net Revenue Retention (NRR), also known as Net Dollar Retention (NDR)

**Definition:** NRR = (Starting MRR + Expansion − Contraction − Churn) / Starting MRR × 100

**Interpretation:**
- NRR > 100%: existing customers generate more revenue this year than last (growth without new customer acquisition spend)
- NRR = 100%: flat — existing customers cover their own churn
- NRR < 100%: revenue is eroding from the existing base

**Relevance:** Only meaningful for businesses with recurring revenue (`salesModel === "subscription"`). Auto-hidden for `"oneTime"` and `"leads"` sales models.

**Engine file:** `src/engine/executiveBriefEngine.ts`

---

## 3. Stylome Methodology

**UI label:** "הקול הייחודי שלך" / "Your Unique Voice"

**Original concept:** Writing style fingerprinting / voice cloning via System Prompt extraction

**Methodology:**
1. User pastes 3–5 writing samples (WhatsApp messages, emails, social posts)
2. Engine analyzes: sentence length distribution, punctuation patterns, vocabulary register, use of idioms, formality level
3. Output: a System Prompt that instructs an LLM to generate text in the user's voice

**Technical note:** "Stylome" is a portmanteau of *style* + *genome* — the user's writing DNA. The term was coined internally and is not an academic term.

**Engine file:** `src/components/StylomeExtractor.tsx`

---

## 4. Fogg Behavior Model (render gate)

**UI reference:** Not surfaced directly; used internally for adaptive tab rendering

**Original:** BJ Fogg's Behavior Model — B = MAP (Motivation × Ability × Prompt)

**Usage in codebase:** `foggScore` from `behavioralActionEngine` drives `computeRenderGate()` which determines which tabs appear in simplified vs. full mode.

**Engine file:** `src/lib/renderGate.ts`, `src/engine/behavioralActionEngine.ts`

---

*Last updated: 2026-05-04*
