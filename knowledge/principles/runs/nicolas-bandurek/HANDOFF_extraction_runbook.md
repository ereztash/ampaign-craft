# HANDOFF 1 — Engine Extraction Runbook

**For:** Operator running the calibration test on Nicolas Bandurek
**Stage:** 2 of 4 (Curation → **Extraction** → Judge → Verdict)
**Pre-requirement:** Stage 1 complete — `input/`, `held_out/`, `curation_log.md` exist as separate artifacts.

## מטרה

להריץ את ה-Differentiation Engine על `input/` של ניקו ולקבל `engine_output_nico.json`. ה-engine **לא** ראה את `held_out/` ולא יראה אותו אף פעם.

## Pre-flight

```bash
# 1. ודא Supabase MCP מחובר. אם לא:
mcp__supabase__authenticate

# 2. ודא קבצי curation במקום:
ls knowledge/principles/runs/nicolas-bandurek/input/
ls knowledge/principles/runs/nicolas-bandurek/held_out/
ls knowledge/principles/runs/nicolas-bandurek/curation_log.md

# 3. ודא ש-ANTHROPIC_API_KEY עדיין ב-Supabase secrets (לא בסביבה המקומית)
```

## הרצה

```bash
# Track A — breadth-first (3 INDIRECT sources עצמאיים)
npm run playbook:extract -- --candidate nicolas-bandurek --track breadth
npm run playbook:approve -- --candidate nicolas-bandurek
npm run playbook:synth -- --candidate nicolas-bandurek
npm run playbook:map -- --candidate nicolas-bandurek
```

## פלט צפוי

`knowledge/principles/runs/nicolas-bandurek/output/engine_output_nico.json`

מבנה:

```json
{
  "candidate": "nicolas-bandurek",
  "track": "breadth",
  "claims": [
    {
      "claim_id": "C1",
      "principle_code": "P0X",
      "mechanism": "...",
      "evidence_type": "lexical | structural | both",
      "sources": ["blog_01", "podcast_ep75"],
      "confidence": 0.0-1.0,
      "verbatim_anchor": "..."
    }
  ],
  "metadata": {
    "extractor_model": "...",
    "synthesizer_model": "...",
    "mapper_model": "...",
    "run_timestamp": "..."
  }
}
```

## Validation לפני המעבר ל-judge

- מספר claims בין 5 ל-7. אם פחות — bug. אם יותר — תעד.
- כל claim עם `principle_code` תקין מ-15 העקרונות בפלייבוק.
- אין claim שמסתמך על `held_out/*` (לא אמור להיות אפשרי, אבל ודא).
- `evidence_type` קיים בכל claim.

## אם יש כשל

- אל "תכפר" ע"י הרצה מחדש עם זרעים שונים. אם ה-engine קרס — זה ממצא.
- תעד את ה-stderr. הוא חלק מה-handoff ל-judge.
- אם ה-extraction נכשל ב-Track A (breadth) — אל תיפול ל-Track B (depth) אוטומטית. הטסט תוכנן ל-breadth (≥3 sources עצמאיים). מעבר ל-depth ישנה את משמעות התוצאה.
