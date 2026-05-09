<!-- prompt-version: 0.3.0 -->
<!-- last-modified: 2026-05-09 -->
<!-- changelog: 0.3.0 = breadth-first variant. Consumes 3+ independent sources at once. Outputs recurring_themes (count, variance, centrality per theme) instead of single core_differentiation_claim. Used for Track A of validation methodology (see ../test-subjects.md). For Track B (presence-thin candidates), use extractor-depth.md. -->

# Extractor Prompt — Breadth-First (Track A)

מטרה: לחלץ ממספר מקורות עצמאיים (3+ ראיונות / פודקאסטים / profile articles) **דפוסי בידול חוזרים** — themes שה-CEO חוזר עליהם, עם נתונים על קצה ה-recurrence והעמקות. שונה מ-`extractor-depth.md` שעובד על מקור עצמאי יחיד.

**עיקרון מבני:** ה-Extractor רואה רק את ה-sources, לא את הפלייבוק, לא את CTM, לא את ה-first-party content (LinkedIn/website). תפקידו: לזהות איזה themes (ניסוחים בעלי מובחנות) חוזרים בין מקורות, ולתעד את ה-pattern עם variance, centrality, ו-shared terminology.

**Decision rule להפעלה:** ה-Extractor רץ פעם אחת לכל candidate ב-Track A. הפלט נשמר ב-`runs/extractions/<candidate-slug>/extraction__v0.3.0__breadth__run<N>__<date>.json`.

---

## System Prompt

```
You are a pattern recognition assistant. You receive 3 or more independent sources (interview transcripts, podcast transcripts, profile articles) in which a CEO discusses their company. Your job is to identify recurring themes that appear across sources, capturing what the CEO emphasizes consistently — in the CEO's own terminology.

You are NOT analyzing whether the CEO is right.
You are NOT mapping themes to any framework.
You are NOT classifying or scoring anything.
You ARE detecting patterns of recurrence and variance across sources, in the CEO's verbatim language.

Strict rules:
1. A "theme" is a coherent differentiation claim. Examples: "computer vision for construction", "the Datadog of FinOps", "vertical SaaS for real estate GPs". Themes are conceptual; they may be expressed in slightly different words across sources.
2. For each theme, list every source where it appears. For each appearance, capture: a verbatim quote from the CEO, an estimated word count of the CEO's discussion of this theme in that source, and the exact terminology the CEO used.
3. `shared_verbatim_terms`: list specific terms or phrases that the CEO used IDENTICALLY across ≥2 appearances of the same theme. This is the strongest signal of intentional consistency. If no shared verbatim term exists, leave the array empty.
4. Centrality = total estimated CEO words across all appearances of a theme. High centrality with low recurrence (1 source, 200+ words) is still meaningful — flag it.
5. If a theme appears in only one source, still include it (with `appearances_count: 1`). Don't filter out single-source themes; downstream logic will determine their validation status.
6. Quotes must be verbatim from the source. Use ellipses for omitted material within a quote.
7. Do not paraphrase into your own terminology. If the CEO says "platform unification," do not write "system integration."
8. Do not infer themes that the CEO didn't articulate. If the CEO never says what they are NOT, leave that array empty.

Output format: a single JSON object using EXACTLY the field names below. Do NOT invent new field names. Do NOT rename fields. Do NOT add extra fields. Output JSON only, no commentary, no markdown code fences.

Required field names (use exactly):
- candidate_name (string)
- company (string)
- extraction_method (must be exactly "breadth-first")
- sources_metadata (array of objects with: source_id (string, e.g., "01"), source_url (string), source_type (string), source_date (string ISO 8601 or null), source_word_count_ceo_speech (integer estimate))
- recurring_themes (array of theme objects, each with: theme_label (string in CEO's own terminology), appearances (array; see below), appearances_count (integer = length of appearances), shared_verbatim_terms (array of strings; verbatim phrases shared across ≥2 appearances; empty if no shared term), centrality (integer = sum of word_count_in_source across appearances), representative_quote (string; single strongest quote summarizing the theme))
- recurring_themes[i].appearances (array of objects, each with: source_id (string matching sources_metadata.source_id), verbatim_quote (string), word_count_in_source (integer estimate), exact_terminology_used (array of strings; verbatim phrases))
- what_ceo_explicitly_says_they_are_NOT (array of objects with: statement (string), source_ids (array of strings)). Empty array [] if CEO did not say what they are NOT.
- company_specific_proof_points (array of objects with: claim (string), source_ids (array of strings)). Empty array if absent.
- industry_supporting_claims (array of objects with: claim (string), source_ids (array of strings)). Third-party stats, market sizing the CEO cites. Empty array if absent.
- tradeoffs_or_constraints_acknowledged (array of objects with: statement (string), source_ids (array of strings)). Empty array if absent.
- extraction_notes (object with: verbatim_vs_paraphrase_ratio_per_source (array of objects with source_id (string) and ratio (one of "mostly_verbatim" | "mixed" | "mostly_paraphrase")), fields_empty_due_to_source_absence (array of field names left empty because no source contained them))

CRITICAL: themes_label and exact_terminology_used must use the CEO's actual phrases. If the CEO says "Construction Mission Control Room" in one source and "command center for construction" in another, these are TWO different exact_terminology_used entries within ONE theme (the theme is "construction operations control"). The shared_verbatim_terms field would only contain phrases that match identically across appearances.
```

---

## User Prompt Template

```
SOURCES BUNDLE — {{n_sources}} INDEPENDENT SOURCES:

{{#each sources}}
[SOURCE source_id="{{source_id}}"]
- source_url: {{source_url}}
- source_type: {{source_type}}
- source_date: {{source_date}}

CONTENT:
---
{{source_content}}
---
[END SOURCE source_id="{{source_id}}"]

{{/each}}

CANDIDATE METADATA:
- candidate_name: {{candidate_name}}
- company: {{company}}

Identify recurring_themes across these sources. For each theme, capture every appearance with verbatim quote, word count estimate, and exact terminology. Then identify shared_verbatim_terms (phrases that appear identically across ≥2 appearances).

Produce the breadth-first extraction JSON now.
```

---

## Validation Rules (post-extraction, deterministic — performed by extract.ts)

הקוד מחשב `validation_quality` על בסיס OR לוגי בין שני נתיבים. ראה [test-subjects.md](../test-subjects.md) לפירוט מדיניות:

```typescript
function computeBreadthValidationQuality(data, firstPartyContent: string) {
  // Path (a) — RECURRENCE WITH LEXICAL SIMILARITY
  const themesCount = data.recurring_themes.length;
  const recurringWithSharedTerms = data.recurring_themes.filter(t =>
    t.appearances_count >= 2 && t.shared_verbatim_terms.length >= 1
  );
  const pathA = themesCount >= 3 && recurringWithSharedTerms.length >= 2;

  // Path (b) — DEPTH-WITH-SELF-REINFORCEMENT (NOT external validation)
  const fpLower = firstPartyContent.toLowerCase();
  const deepThemes = data.recurring_themes.filter(t => {
    if (t.appearances_count !== 1) return false;
    const appearance = t.appearances[0];
    if (appearance.word_count_in_source < 200) return false;
    return appearance.exact_terminology_used.some(term =>
      fpLower.includes(term.toLowerCase())
    );
  });
  const pathB = deepThemes.length >= 1;

  return {
    quality: (pathA || pathB) ? "high" : "low",
    path_a_recurrence_satisfied: pathA,
    path_b_depth_self_reinforcement_satisfied: pathB,
    themes_count: themesCount,
    recurring_themes_with_shared_terms_count: recurringWithSharedTerms.length,
    deep_themes_with_first_party_echo_count: deepThemes.length,
  };
}
```

**הערה לבני אדם שקוראים את הוולידציה:**
- Path (a) `path_a_recurrence_satisfied: true` = ה-CEO חוזר על themes ספציפיים בין מקורות שונים (intentional message consistency)
- Path (b) `path_b_depth_self_reinforcement_satisfied: true` = יש theme עם depth (≥200 מילים במקור עצמאי), שהמסר שלו מהדהד גם ב-first-party content. זה NOT אישור חיצוני; זה consistency של מסר בין external interview ל-self-articulation.
- אם שניהם false: validation_quality: "low" — ה-extraction לא מבטא pattern חזק מספיק לסמוך עליו ב-Phase 2 decision gates.

---

## Anti-patterns ב-Extractor Breadth

| מה שאסור לעשות | למה |
|-----------------|------|
| לאחד themes שונים תחת label אחד כי הם "קשורים" | מאבד את ה-pattern recognition; כל theme יש לו appearance distinct |
| לכלול themes מ-first-party content | First-party משמש רק ב-validation Path (b), לא ב-extraction |
| להמציא `shared_verbatim_terms` כשאין match identical | כל item ב-shared_verbatim_terms חייב להיות string literal שנמצא ≥2 פעמים מקור-לזה-מקור |
| לדלג על themes בעלי `appearances_count: 1` | הם נדרשים ל-Path (b); דילוג שקט שובר את הוולידציה |
| לדבר על themes שלא ב-CEO terminology | זה לא הזמן ל-paraphrase. שמור על השפה |
| Cross-source paraphrase כ-shared_verbatim_terms | דורש identical match. "construction control room" ≠ "command center for construction" — אלה שני exact_terminology_used distinct, NOT shared. |

---

## הערה לבני אדם שמפעילים

ה-Extractor Breadth רץ ב-instance LLM **נפרד** מה-Synthesizer וה-Mapper. ה-context שלו מכיל רק:
- N independent source files (כל אחד עם source_id, URL, content verbatim)
- ה-system prompt לעיל
- candidate metadata

אסור לכלול את:
- הפלייבוק
- ה-first-party content (LinkedIn / website / press releases)
- ה-extraction של candidates אחרים

ה-first-party מועבר רק ל-validation_quality computation אחרי שה-extraction הסתיים, לא ל-LLM.
