# MOAT Generator Specification

## Purpose

המרת המודול Differentiation מ-wizard סטטי למנוע שמייצר MOAT ייחודי לכל לקוח, מבוסס על PrincipleLibrary.

## I/O Contract

**Input:** `ClientDiagnostic` (ראה `types/principles.ts`)
**Output:** `MatchResult` עם Top-5 `MoatCandidate`

## Scoring Pipeline

### שלב 1 — Principle Filtering
```
filtered = library.principles
  .filter(p => p.module_relevance.includes("differentiation"))
```

### שלב 2 — Unclaimed Scoring
לכל principle, חפש את `competitor_scan_keywords` ב-positioning copy של כל competitor.

```
unclaimed_score(p, competitors) =
  1 - max(
    overlap(p.competitor_scan_keywords, c.keywords_detected) / len(p.competitor_scan_keywords)
    for c in competitors
  )
```

- `1.0` = אף מתחרה לא משתמש במילים האלה → fully unclaimed
- `0.0` = כל מתחרה משתמש בכל המילים → fully claimed
- thresholds: < 0.3 → claimed, 0.3-0.7 → contested, > 0.7 → unclaimed

### שלב 3 — Alignment Scoring
לכל principle, בדוק אם `ops_signal` מופיע ב-`diagnostic.operational_signals`.

```
alignment_score(p, ops) =
  matches(p.ops_signal, ops) / len(p.ops_signal)
```

המימוש הנוכחי: string similarity via embeddings (Cohere multilingual) + threshold 0.75.
גרסת MVP: substring matching. מספיק ל-pilot.

### שלב 4 — Overall Score
```
overall = unclaimed_score * alignment_score
```

מכפלה, לא סכום. סיבה: MOAT חייב את שניהם. principle unclaimed אבל לא aligned = hype. aligned אבל claimed = me-too.

### שלב 5 — Status Classification
```
if overall < 0.3: skip
elif unclaimed < 0.3: status = "claimed"  // competitor already owns
elif alignment < 0.3: status = "claimable-unaligned"  // opportunity but requires pivot
else: status = "claimable-aligned"  // the MOAT
```

### שלב 6 — Template Filling
```
generated_claim = fillPlaceholders(p.claim_template, diagnostic)
```

Placeholders מתמפים מ-ClientDiagnostic. אם placeholder לא נמצא, candidate נדחה.

דוגמה (P03 Resource Conservation):
```
template: "ה-ICP שלך לא קונה כי {feature_list}. הוא קונה כי {current_resource_at_risk}..."
```

החלפה:
- `{feature_list}` ← מ-`diagnostic.current_positioning` (extraction)
- `{current_resource_at_risk}` ← מ-`diagnostic.operational_signals` (extraction)

Extraction layer: LLM קטן (GPT-4o-mini או Claude Haiku) עם prompt מוגדר. JSON mode. Temperature 0.

### שלב 7 — Citation Assembly
```
citations = p.sources.map(id => sourceRegistry.get(id))
```

כל citation כולל: filename, course, core_claim, researchers. זה ה-proof UI.

### שלב 8 — Ranking & Output
```
sort by overall_score desc, take top 5
```

## UI Presentation

### Candidate Card
```
┌─────────────────────────────────────────────┐
│  [P03] שימור משאבים כמנוע התנהגות          │
│                                             │
│  Claim: ה-ICP שלך לא קונה כי {...},        │
│  הוא קונה כי [הגנה על דאטה קיימת].         │
│                                             │
│  Market stance: [market_stance text]        │
│                                             │
│  [על מה זה מבוסס] → פותח modal              │
│  - Hobfoll COR (2001)                       │
│  - Kahneman Loss Aversion                   │
│  - 5 מסמכים ב-corpus                        │
│                                             │
│  Score: 0.82  |  Status: claimable-aligned │
└─────────────────────────────────────────────┘
```

### Trace Modal
כפתור "על מה זה מבוסס" → שימון של:
- הגדרת ה-principle
- חוקרי הבסיס
- רשימת 5+ מסמכי מקור עם ציטוט
- תאריך היצירה של ה-principle

## Error Handling

| Failure | Response |
|---|---|
| No principles match module | Return empty MatchResult with explanation |
| All principles score < 0.3 | UI: "אין MOAT מובחן בשוק הזה עם ה-positioning הנוכחי. המלץ על pivot." |
| Placeholder not extractable | Skip candidate. Log for KB improvement. |
| Competitor list empty | UI: בקשת השלמת diagnostic לפני הרצה |

## Pilot MVP Scope

**In:**
- Top-3 display (לא 5)
- Substring matching במקום embeddings
- Manual placeholder filling דרך follow-up wizard step (לא LLM auto)
- Trace modal עם נתוני JSON בלבד (בלי עיצוב)

**Out (for v1.1):**
- Embeddings-based matching
- LLM-based placeholder extraction
- A/B testing של generated claims
- Principle A/B (שני principles משולבים ב-MOAT אחד)

## Integration Checklist

- [ ] Load principles.json on app startup
- [ ] Load sources.json on app startup
- [ ] Add MatchEngine service ב-src/services/moat/
- [ ] Wire to DifferentiationTab.tsx existing wizard output
- [ ] Add Candidate Card component
- [ ] Add Trace Modal component
- [ ] Unit tests: 3 scenarios (all-claimed, all-unclaimed, mixed)
- [ ] E2E test: run against 3 hypothetical clients, compare to GPT-4 baseline

