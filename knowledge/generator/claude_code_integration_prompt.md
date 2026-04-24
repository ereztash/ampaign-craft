# פרומפט להטמעת MOAT-generator ב-ampaign-craft

## Mission

אתה מטמיע מנוע MOAT מבוסס-ידע לתוך FunnelForge (ampaign-craft). התיקייה `knowledge/` אינה פיצ'ר. היא ה-MOAT של המוצר עצמו. תתייחס בהתאם.

## Context שחובה להפנים לפני כתיבת קוד

המוצר הנוכחי טוען לבסיס מחקרי (PSM, Hormozi, Decoy, CoI, DISC). המסגרות האלה ציבוריות וניתנות להעתקה על ידי כל מתחרה.

תיקיית `knowledge/` היא הנכס הראשון שאי אפשר להעתיק. זו ספריית principles מאוצרת, 16 עקרונות, כל אחד עם:

- בסיס מחקרי (Hobfoll, Lahad, פרחי, Maister, Hill, Minto)
- מסמכי מקור (65 סיכומים אקדמיים בעברית, שארז כתב ב-3 שנות התואר)
- claim_template עם placeholders
- market_stance מוכן
- ops_signal[] לזיהוי alignment
- competitor_scan_keywords[] לזיהוי claimed/unclaimed
- defense_pattern מגובה

כשלקוח רץ במודול Differentiation, ה-MOAT-generator ממפה את מצבו אל הספרייה ומחזיר Top-3 MOATs ייחודיים לו, עם ציטוט לכל אחד. כל recommendation מתקשר למנגנון בעל-שם במחקר קליני/ארגוני peer-reviewed.

זה מה שמאפשר ל-FunnelForge לשרוד תחרות. לא ה-UI. לא ה-wizard. העובדה שלכל output יש קו חזרה למחקר שמתחרים לא סינתזו.

## סדר קריאה (לעומק, לא סריקה)

קרא בסדר הבא. אל תדלג. אל תקרא רק את הכותרות.

1. `knowledge/README.md` — מטרה, מבנה תיקייה, מיפוי principles למודולים
2. `knowledge/SCHEMA.md` — מבנה הנתונים המדויק של Principle ו-SourceDoc
3. `knowledge/types/principles.ts` — TypeScript contract: Principle, MatchResult, MoatCandidate, ClientDiagnostic, SourceDoc
4. `knowledge/generator/moat_generator_spec.md` — pipeline של הניקוד, חוזה UI, error handling
5. `knowledge/principles/principles.json` — 16 ה-principles בפועל. קרא את כולם. לא sample.
6. `knowledge/sources/sources.json` — רגיסטר מסמכי המקור

## Comprehension Gate

לפני כתיבת שורת קוד אחת, כתוב ב-PR draft (או בתגובה לסשן) את התשובות שלך לארבע השאלות הבאות. לא בנוסח גנרי. בנוסח שמראה שקראת.

1. למה `unclaimed_score × alignment_score` הוא מכפלה ולא סכום? מה המשמעות העסקית של אם אחד מהם 0?
2. מה ההבדל בין principle במצב `claimed` לבין `claimable-unaligned`? תן דוגמה מ-16 ה-principles.
3. למה כל MoatCandidate נושא citations? מה מאבדים אם מסירים אותם?
4. למה candidate שיש לו placeholder לא-ממומש נדחה במקום להיות מוצג עם placeholder גלוי?

אם אתה לא יכול לענות על השאלות האלה במילים שלך, חזור לקריאה.

## Mandate — scope מצומצם

Pilot: מודול Differentiation בלבד. אל תיגע ב-Marketing, Sales, Pricing, Retention בסבב הזה.

בתוך Differentiation:

- [ ] טעינת `principles.json` + `sources.json` ב-app startup. לא per-request.
- [ ] שירות חדש: `src/services/moat/MatchEngine.ts` שמיישם את ה-scoring pipeline כפי שמוגדר ב-spec.
- [ ] חיבור ל-output של ה-Differentiation wizard הקיים. הצעד הסופי של ה-wizard מעביר ClientDiagnostic ל-MatchEngine.
- [ ] קומפוננט חדש: `MoatCandidateCard.tsx` עם claim, market_stance, score, וכפתור "על מה זה מבוסס".
- [ ] מודאל trace: `MoatTraceModal.tsx` שמראה research_backbone + רשימת מסמכי המקור.
- [ ] Unit tests: שלושה תרחישים — all-claimed market, all-unclaimed market, mixed.
- [ ] E2E smoke: mock ClientDiagnostic → MatchResult חוזר בלי crash.

## אילוצים של ה-MVP

- Alignment scoring דרך substring matching. לא embeddings בסבב הזה.
- Placeholder filling: החלטה שלך — או manual (שלב wizard נוסף שבו המשתמש ממלא), או LLM JSON mode. אם בחרת LLM, תעד איזה מודל ולמה. זו החלטה תיעודית לארז.
- אין A/B testing framework.
- אין UI לעריכת ה-library. הספרייה read-only מהאפליקציה.

## Acceptance Criteria (falsifiable)

המשימה לא הסתיימה עד שכל חמישה אלה עוברים:

**T1 — Claimed detection.** ClientDiagnostic עם 3 מתחרים שה-positioning שלהם מכיל `grow your revenue | scale | accelerate`, MatchEngine חייב לסווג את P03 (שימור משאבים) כ-`claimable-unaligned` עם `unclaimed_score > 0.7`.

**T2 — Aligned detection.** ClientDiagnostic עם `operational_signals = ["onboarding emphasizes protecting existing data", "churn reason = underutilization of existing features"]`, MatchEngine חייב לסווג את P03 כ-`claimable-aligned` עם `alignment_score > 0.8` ו-`overall_score > 0.6`.

**T3 — Citation presence.** Trace Modal מראה, לכל candidate, לפחות 2 מסמכי מקור עם filename + course + core_claim. אם פחות מ-2 — failure.

**T4 — No uncited output.** אין principle שמופיע ב-UI ללא לפחות citation אחד. אם יש, זה bug קריטי.

**T5 — No-match graceful.** אם אין principle שעובר score > 0.3, ה-UI מציג הודעה מפורשת "אין MOAT מובחן בשוק הזה עם ה-positioning הנוכחי". לא רשימת candidates ריקה.

## Guardrails

**אל תעשה:**
- תיקון או עריכה של `principles.json`. היא generated upstream. אם חסר שדה, הצע ב-commit message, שאל את ארז לפני שאתה מוסיף.
- הוספה של principle בקוד. אותה סיבה.
- הטמעה של טקסט principle ב-string constants בקוד. תמיד קרא מה-JSON.
- עקיפת Trace Modal. כל recommendation חייב להציג כפתור trace.
- יצירת claim ללא placeholders ממולאים או rejection מפורשת.

**כן לעשות:**
- לבצע stash ל-שינויים לא committed לפני ה-branch (ארז יודע על `feature/meta-ads-monitor` עם 109 שינויים פתוחים).
- ליצור branch: `knowledge/moat-generator-v1` מתוך `main` מעודכן.
- לתעד כל החלטת תכנון ב-comment מעל הפונקציה הרלוונטית, לא רק ב-commit message.
- להתייחס ל-library כתשתית MOAT. אם אתה עומד לעשות משהו שמנתק את הקשר ל-citation, עצור.

## Branch & commits

- Branch from main: `knowledge/moat-generator-v1`
- Commits atomic. לא mega-commit אחד.
  - `chore(moat): import knowledge types`
  - `feat(moat): implement MatchEngine scoring pipeline`
  - `feat(moat): add MoatCandidateCard component`
  - `feat(moat): add MoatTraceModal component`
  - `feat(moat): wire MatchEngine to DifferentiationTab`
  - `test(moat): unit + E2E coverage`
- PR title: `feat(moat): integrate principle-grounded MOAT generator into Differentiation`
- PR body כולל: אילו T1-T5 עוברים, מה נדחה ולמה, open design question אחד לארז.

## Report back

כשסיימת, ייצר summary markdown קצר:

- איזה acceptance criteria עברו
- מה דולג ולמה
- מה נשבר אם ה-library עוברת מ-v1.0.0 ל-v1.1.0
- שאלת design פתוחה אחת לארז

## Meta

התיקייה הזו הושקעה בה אנליזה של 65 מסמכים מ-3 שנות תואר בעבודה סוציאלית + 5 ספרי ייעוץ canonical. כל שדה של כל principle עבר סינתזה ידנית. זו לא עבודה שנעשתה במכונה.

העבודה שלך כאן היא לחבר את הספרייה הזו אל הקוד כך ש-FunnelForge יהפוך למוצר היחיד בשוק שבו כל recommendation לעסק צומח מתוך מחקר קליני-ארגוני בעל שם.

תזכור את זה כשאתה כותב.
