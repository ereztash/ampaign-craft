# knowledge/ — COR-SYS Principle Library

## מה זה

שכבת הידע של FunnelForge. הקבצים כאן הם ה-MOAT של המוצר: library של principles מוסברים, עם מבנה generative שמאפשר למודול Differentiation להציע ללקוחות positioning מדיד ומגובה מחקר.

Version 1.0.0 — פיילוט. הפקה מקורפוס של 65 מסמכים: קורסי טראומה של ארז + 5 ספרי ייעוץ ארגוני canonical.

## מבנה התיקייה

```
knowledge/
├── README.md                           — זה
├── SCHEMA.md                           — הסכמה המלאה של principle
├── principles/
│   ├── principles.json                 — machine-readable (לצריכת האפליקציה)
│   ├── principles.csv                  — diff-friendly
│   └── מיפוי_דפוסים_עוס.xlsx          — human-readable, 4 sheets
├── sources/
│   ├── sources.json                    — 65 מסמכי מקור
│   └── sources.csv
├── types/
│   └── principles.ts                   — TypeScript types לצריכת React/Node
└── generator/
    └── moat_generator_spec.md          — spec של מנוע ההתאמה ללקוח
```

## מה להטמיע ואיך

### 1. טעינת ה-library

```typescript
import principleLibrary from '@/../knowledge/principles/principles.json';
import type { PrincipleLibrary, Principle } from '@/../knowledge/types/principles';

const library: PrincipleLibrary = principleLibrary as PrincipleLibrary;
```

Runtime — טעינה חד-פעמית ב-startup. ~60KB. אין צורך ב-lazy loading.

### 2. אינטגרציה למודול Differentiation

ה-wizard הקיים אוסף:
- תיאור שוק
- ICP
- מתחרים (שמות + homepage copy)
- תיאור operations

התוספת:
1. פקטור MatchEngine שבוחר principles רלוונטיים לפי `module_relevance`
2. סריקת competitor copy אל מול `competitor_scan_keywords` של כל principle
3. בדיקת alignment של operations אל מול `ops_signal`
4. חישוב score, הצגת 3 candidates ראשיים

פסאודו-קוד:

```typescript
function generateMoats(diagnostic: ClientDiagnostic): MatchResult {
  const relevantPrinciples = library.principles.filter(p =>
    p.module_relevance.includes("differentiation")
  );

  const candidates = relevantPrinciples.map(p => {
    const unclaimed = scoreUnclaimed(p, diagnostic.competitor_list);
    const aligned = scoreAligned(p, diagnostic.operational_signals);
    const overall = unclaimed * aligned;

    return {
      principle_id: p.id,
      status: classifyStatus(unclaimed, aligned),
      alignment_score: aligned,
      unclaimed_score: unclaimed,
      overall_score: overall,
      rationale: buildRationale(p, diagnostic),
      generated_claim: fillTemplate(p.claim_template, diagnostic),
      generated_defense: p.defense_pattern,
      citations: p.sources
    };
  });

  return {
    client_id: diagnostic.client_id,
    generated_at: new Date().toISOString(),
    candidates: candidates.sort((a,b) => b.overall_score - a.overall_score).slice(0, 5)
  };
}
```

### 3. אינטגרציה למודולים האחרים

כל principle מוקצה למודולים דרך `module_relevance`. המודול בוחר subset:

| Module         | Top principles                    |
|----------------|-----------------------------------|
| Pricing        | P03 (COR), P08 (Triad)            |
| Sales          | P01, P02, P06, P10, P11, P15      |
| Retention      | P01, P03, P04, P05, P09, P11, P14 |
| Marketing      | P03, P05, P09, P13, P15, P16      |
| Differentiation| P02, P08, P09, P13, P14, P16      |

המפתח: הצגת principles ב-UI מתאימה לדומיין, לא חשיפה של כל ה-library לכל מודול.

### 4. Trace UI

לכל recommendation שה-app מציג, צריך כפתור "על מה זה מבוסס". הוא פותח:
- שם הprinciple
- definition_he
- research_backbone (שמות החוקרים)
- רשימת מסמכי מקור (ציטוטים מ-sources.json)
- תאריך היצירה של ה-principle ב-library (versioning)

זה ה-MOAT של השקיפות — מוכיח ללקוח שהמלצה איננה black box.

## עקרונות עדכון ה-library

### Versioning
- `version` ב-principles.json עולה ב-semver.
- `generated_at` מתעדכן עם כל עדכון.
- Backward compatibility נשמרת על-ידי: אין מחיקת principles, רק deprecation עם flag.

### הוספת principle חדש
1. קבע P{NN} חדש (לא ממחזר).
2. מלא את כל 11 השדות החובה.
3. מצא 2+ מסמכי מקור ב-sources/ שתומכים.
4. עדכן את המטריצה ב-Excel.
5. commit עם message: `feat(knowledge): add P{NN} {name_en}`.

### עדכון principle קיים
- אם זה רק שיפור של claim_template / defense_pattern — minor version bump.
- אם זה שינוי בהגדרה או במנגנון — major version bump + flag את כל ה-recommendations הקיימים לבחינה חוזרת.

### QA לפני commit
- כל principle חייב: id ייחודי, לפחות 2 sources, לפחות 1 module, כל 5 עמודות MOAT-generator מלאות.
- Excel, CSV, JSON צריכים להישאר מסונכרנים. סקריפט בנייה ב-scripts/ יוודא.

## פיילוט — מה מכוסה

**כוסה:**
- שני קורסי טראומה: "מבוא להתפתחות מצבי דחק וטראומה", "התערבות במצבי אסון ומצבי טראומה מתמשכים"
- Research backbones: Hobfoll (COR), Lahad (BASIC-PH), פרחי (6-C), עומר ואלון (רציפות), Hill (ABC-X), Maister (Trust), Minto (Pyramid/MECE)
- 16 principles

**לא כוסה (sprint הבא):**
- קורסי שיטות התערבות א-ג
- קורסי תיאוריות אישיות (תגבור P12 Locus of Control + archetype mapping)
- קורסי ייעוץ ארגוני נוספים מעבר ל-5 הקיימים
- מודול Pricing דורש תגבור (רק 2 principles כיום) — מ-"עבודה סוציאלית מודעת עוני" + "מדינת הרווחה"

## MOAT Test — איך נדע שזה עובד

לפני GA של ה-library, ריצה על 3 לקוחות שבדוקם:
1. MatchEngine מייצר top-3 candidates.
2. GPT-4 generic מייצר positioning לאותם לקוחות.
3. Human eval: 10 משתמשי beta (CFO/COO/CEO) מדרגים איזה פחות מפחידים להגן עליו.

Pass: שלך גבוה יותר ב-70%+ מהקריאות.

