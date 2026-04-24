# SCHEMA.md — מבנה הנתונים של הקורפוס

## principles.json

```json
{
  "version": "1.0.0",
  "generated_at": "2026-04-24",
  "pilot_scope": "string — תיאור ה-scope של הפיילוט",
  "source_doc_count": 65,
  "principle_count": 16,
  "principles": [ /* מערך של Principle */ ]
}
```

## Principle

| שדה | סוג | תיאור |
|---|---|---|
| `id` | `"P01"..."P16"` | קוד יציב, לא ממחזרים |
| `name_he` | string | שם עברי |
| `name_en` | string | שם אנגלי |
| `definition_he` | string | הגדרה בעברית, 1-3 משפטים |
| `research_backbone` | string[] | חוקרים/תיאוריות |
| `sources` | string[] | `["D001", "D002", ...]` |
| `frequency` | number | מספר המסמכים שמכילים את ה-principle |
| `module_relevance` | string[] | `["differentiation", "marketing", ...]` |
| **`claim_template`** | string | טענה עם `{placeholders}` לפרמטריזציה |
| **`market_stance`** | string | עמדת שוק — מה לומר כש-principle מאומץ |
| **`ops_signal`** | string[] | סיגנלים תפעוליים שמעידים על נוכחות |
| **`competitor_scan_keywords`** | string[] | מונחים לחיפוש אצל מתחרים |
| **`defense_pattern`** | string | איך מגינים מפני התקפה — עם מקורות |

5 השדות המודגשים הם ה-MOAT-generator layer. בלעדיהם, principle הוא ידע סטטי. איתם, הוא engine.

## sources.json

```json
{
  "version": "1.0.0",
  "count": 65,
  "sources": [ /* מערך של SourceDoc */ ]
}
```

## SourceDoc

| שדה | סוג | תיאור |
|---|---|---|
| `id` | `"D001"..."D0NN"` | מזהה יציב |
| `filename` | string | שם קובץ מקורי |
| `course` | string | שם הקורס |
| `folder` | string | נתיב תת-תיקייה (optional) |
| `cluster` | string | אשכול תמטי |
| `core_claim` | string | טענת ליבה (1 משפט) |
| `mechanism` | string | מנגנון/פורמולה/שרשרת סיבתית |
| `researchers` | string[] | חוקרים מצוטטים |
| `named_frameworks` | string[] | מסגרות בעלות שם |
| `principles_tagged` | string[] | `["P01", "P03"]` |
| `size_bytes` | number | גודל מקור |

## Conventions

### IDs
- Principles: `P` + 2-digit zero-padded (`P01`, `P16`).
- Sources: `D` + 3-digit zero-padded (`D001`, `D065`).
- IDs אף פעם לא ממוחזרים אחרי deprecation.

### Citations
בכל שדה שמפנה למקורות, הפורמט הוא `D0XX`. ה-app יכולה להצליב עם sources.json להפקת ציטוט מלא.

### Placeholders ב-claim_template
פלייס-הולדר עטוף ב-`{}`. רשימת placeholders סטנדרטיים (לא exhaustive):
- `{user_state}`, `{stress_context}`, `{generic_support}`, `{drop_signal}`, `{our_design}`, `{short_task_type}`, `{success_marker}`, `{timeframe}`, `{recovery_metric}`
- `{ICP_transition_event}`, `{continuity_type}`, `{continuity_restoration_mechanism}`
- `{current_resource_at_risk}`, `{loss_framing}`, `{gain_framing}`
- `{competitor_list}`, `{competitor_common_positioning}`

ה-MatchEngine אחראי על מילוי ה-placeholders מה-ClientDiagnostic. אם placeholder לא ממופה, ה-candidate נדחה מהדירוג (לא מוצג ללקוח).

### Lists serialization (CSV)
ב-CSV, lists מפורדים ב-`|` (pipe). זה מאפשר diff-friendly ו-single-cell storage.

## Migration

### v1.0.0 → v1.1.0
הוספת principle חדש (דוגמה: P17):
1. הוספה ב-principles.json
2. הוספת עמודה ב-Excel sheet 2 (overlap matrix)
3. הוספת שורה ב-Excel sheet 3 (ranked principles)
4. עדכון principles.csv
5. קבצי sources/ לא משתנים אלא אם נוסף מקור חדש
6. `version: "1.1.0"`, `generated_at` מתעדכן

### v1.0.0 → v2.0.0 (breaking)
שינוי במבנה Principle (למשל: שינוי claim_template לאובייקט):
1. כתיבת migration script ב-scripts/migrate_v1_to_v2.ts
2. הפעלה על principles.json
3. עדכון principles.ts (TypeScript types)
4. עדכון כל ה-consumers
5. major version bump

