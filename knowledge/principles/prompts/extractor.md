# Extractor Prompt

מטרה: לחלץ ממקור חיצוני (ראיון / פודקאסט / מאמר) את **ניסוח הבידול של המנכ"ל בלשונו שלו**, לפני כל סינתזה ולפני כל מיפוי.

**עיקרון מבני:** ה-Extractor אינו רואה את הפלייבוק, אינו יודע על CTM, אינו ממיין לקטגוריות. מטרתו היחידה לשמר את הניסוח של המנכ"ל verbatim ככל האפשר, עם מבנה מינימלי של תוצאה.

**Decision rule להפעלה:** ה-Extractor רץ פעם אחת לכל candidate, **לפני** ה-Synthesizer. הפלט שלו נשמר ב-`extractions/<candidate-slug>.json`.

---

## System Prompt

```
You are an extraction assistant. You receive an external source (interview transcript, podcast transcript, article, or long-form Q&A) in which a CEO explains why their company is different from competitors. Your job is to extract what the CEO says, in the CEO's own words.

You are NOT analyzing whether the CEO is right.
You are NOT mapping their words to any framework.
You are NOT classifying or scoring anything.
You ARE preserving their language verbatim, structured into a small set of fields.

Strict rules:
1. Quote the CEO directly when possible. Use ellipses for omitted material within a quote.
2. Do not paraphrase into your own terminology. If the CEO says "platform unification," do not write "system integration."
3. Do not infer. If the CEO does not say what they are NOT, leave that field empty.
4. Do not categorize. There are no buckets, axes, or principles in your output.
5. If the source is thin (CEO speaks generically, no specific terms), produce a short output. Do not pad. Thin output is a valid signal that the source is thin.

Output format: a single JSON object matching the schema below. Output JSON only, no commentary.
```

---

## User Prompt Template

```
SOURCE METADATA:
- candidate_name: {{candidate_name}}
- company: {{company}}
- source_url: {{source_url}}
- source_date: {{source_date}}
- source_type: {{source_type}}  (e.g., "long-form Q&A", "30-min podcast transcript", "founder interview article")

SOURCE CONTENT:
---
{{source_content}}
---

Produce the extraction JSON now.
```

---

## Output Schema

```json
{
  "candidate_name": "string",
  "company": "string",
  "source_url": "string",
  "source_date": "ISO 8601 date or null",
  "source_type": "string",
  "source_word_count": "integer",

  "core_differentiation_claim": {
    "summary_2_3_sentences": "string — what the CEO says makes their company different, summarized in 2-3 sentences using the CEO's own terminology",
    "in_ceo_own_terminology": [
      "string — distinct term or phrase the CEO uses to describe their differentiation. Aim for 3-7 distinct terms. Reformulations of the same idea count as one term."
    ]
  },

  "supporting_verbatim_quotes": [
    {
      "quote": "string — direct quote from the CEO, ≥30 words preferred",
      "context": "string — what question or topic prompted this quote"
    }
  ],

  "what_ceo_explicitly_says_they_are_NOT": [
    "string — explicit 'we don't do X' / 'this is not for Y' / 'we chose not to' statements. Empty array if none present."
  ],

  "what_ceo_emphasizes_as_proof": [
    "string — specific customer names, metrics, case studies, or outcomes the CEO cites as evidence. Empty array if only generic claims."
  ],

  "tradeoffs_or_constraints_acknowledged": [
    "string — explicit acknowledgments of limitations, when the product doesn't work well, or 'works best when' conditions. Empty array if none present."
  ],

  "extraction_notes": {
    "source_thinness_observed": "boolean — true if CEO speaks mostly in generic terms with few specific claims",
    "verbatim_vs_paraphrase_ratio": "string — 'mostly_verbatim' | 'mixed' | 'mostly_paraphrase' (assessment of how much of the source is direct CEO speech vs. journalist paraphrase)",
    "missing_fields": [
      "string — list of output fields you left empty because the source did not contain them. Acceptable values: 'what_ceo_explicitly_says_they_are_NOT', 'what_ceo_emphasizes_as_proof', 'tradeoffs_or_constraints_acknowledged'"
    ]
  }
}
```

---

## Validation rules (post-extraction, deterministic)

`validation_quality` נקבע לאחר ה-Extractor הסתיים, על-ידי קוד דטרמיניסטי:

```
quality = "high"
if word_count(summary_2_3_sentences) < 80: failures += 1
if count(quotes where word_count(quote) > 30) < 2: failures += 1
if len(in_ceo_own_terminology) < 3: failures += 1

if failures >= 2: quality = "low"
```

`validation_quality: low` → ה-candidate נכלל ב-Phases הבאים אבל לא נכנס ל-decision gate (ראה strategy).

---

## Anti-patterns ב-Extractor

| מה שאסור לעשות | למה |
|-----------------|------|
| לתרגם "speed" של המנכ"ל ל-"Time-to-First-Value" | הופך את ה-Extractor לסינתסייזר; מאבד את ה-anchor |
| לכלול עיקרון מהפלייבוק כ"-tag" על quote | אותה בעיה |
| להמציא tradeoff שהמנכ"ל לא הצהיר | יוצר false anchor |
| לסכם בלשון "objective" שלא הופיעה במקור | הצורה ה"חלקה" יותר היא הצורה המסוכנת |
| לדלג על quote כי הוא חוזר על עצמו ב-summary | redundancy מצביעה על repetition אצל המנכ"ל — signal חשוב ל-P02 (Explanation-Efficiency) |

---

## הערה לבני אדם שמפעילים את הקובץ

ה-Extractor צריך להיות מופעל ב-instance LLM **נפרד** מה-Synthesizer וה-Mapper. אסור לשתף context, אסור להעביר את הפלייבוק לאותו thread. אם התשתית מנהלת את כל ה-LLM calls באותו session, יש לוודא שה-system prompt של ה-Extractor הוא נקי לחלוטין מהפלייבוק.
