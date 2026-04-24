# פרומפט B — אינטגרציה של knowledge/ כ-grounding layer מעל MOAT הקיים

## Mission

אתה מוסיף שכבת grounding מחקרי למערכת MOAT קיימת. המערכת הקיימת (`src/engine/optimization/` + `src/engine/differentiationEngine.ts` + 42 MOAT tests ירוקים) עובדת. אסור לשבור אותה. התוספת שלך היא **additive enrichment** — היא מחברת את ה-output הקיים (hidden values, claims, recommendations) אל ספריית עקרונות מחקרית עם ציטוטים.

## Critical Context — מה כבר קיים

campaign-moat-layer-4oQcn מכיל:

1. **GRAOS M-Layer (M1-M6)** ב-`src/engine/optimization/` — 50 tests.
2. **GRAOS MOAT Layer (E1-E6)** — עוד 42 tests. Ten gates ב-entry point אחד: `generateReflectiveAction`.
3. **Blackboard architecture** — 12+ agents, `blackboardClient` הוא הקובץ היחיד שנוגע ב-Supabase.
4. **5 Differentiation Pillars** (DISC, Hormozi, Neuro-closing, Hebrew NLP, Multi-agent) — כולם עם live call sites, נבדקים דרך `verify-runtime-calls.ts`.
5. **Differentiation Engine** ב-`src/engine/differentiationEngine.ts` — עם 8 hidden values ו-5 competitor archetypes ב-`differentiationKnowledge.ts`.
6. **MOAT contract** (חובה לכבד): zero mutations מחוץ ל-`src/engine/optimization/`; zero frontend changes; כל gate הוא opt-in; backwards compatible.

**אתה מתווסף. לא מחליף.**

## הספרייה החדשה — מה היא

`knowledge/` הוא ספריית עקרונות מחקרית. 16 principles מ-65 מסמכי מקור (קורסי טראומה של ארז + 5 ספרי ייעוץ canonical). כל principle נושא:
- research_backbone (חוקרים בעלי שם)
- sources (מסמכי מקור)
- **5 MOAT-generator fields**: claim_template, market_stance, ops_signal, competitor_scan_keywords, defense_pattern

מה הוא **לא**: עוד MatchEngine לצד הקיים. **כן**: tracing layer שמעשיר את ה-output הקיים עם ציטוטים למחקר.

## סדר קריאה

**חלק א' — המערכת הקיימת (חובה קודם):**

1. `README.md` — קטעי "GRAOS MOAT Layer E1-E6" + "MOAT contract" + "5 Differentiation Pillars"
2. `src/engine/optimization/reflectiveAction.ts` — entry point, 10 gates, INERT_FALSIFIER
3. `src/engine/optimization/blackboardClient.ts` — Supabase contract (readRecent, readFailures, recordFailure)
4. `src/engine/differentiationEngine.ts` — API surface (scoreClaimVerification, buildHiddenValueProfile, calculateDifferentiationStrength)
5. `src/engine/differentiationKnowledge.ts` — HIDDEN_VALUES[8], COMPETITOR_ARCHETYPES[5]
6. `src/types/differentiation.ts` — HiddenValueType, CompetitorArchetypeId
7. `src/engine/__tests__/moatEngines.test.ts` — מה ה-42 tests בודקים (ברמת describe/it)
8. `src/engine/optimization/__tests__/*.test.ts` — 92 optimization tests (skim)
9. `src/components/ResultsDashboard.tsx` — איך `generateReflectiveAction` נקרא (feature-flagged)

**חלק ב' — הספרייה החדשה:**

10. `knowledge/README.md`
11. `knowledge/SCHEMA.md`
12. `knowledge/types/principles.ts`
13. `knowledge/generator/moat_generator_spec.md`
14. `knowledge/principles/principles.json` — כל ה-16 principles
15. `knowledge/sources/sources.json` — כל ה-65 sources

## Comprehension Gate

לפני קוד, ענה ב-PR draft על 5 שאלות:

1. **Contract preservation:** למה MOAT contract מחייב שהשכבה החדשה שלך תהיה strictly additive ו-opt-in? מה נשבר אם תהפוך אותה ל-default-on?

2. **Gate placement:** יש לך שלוש אופציות להוספת grounding: (א) gate 11 ב-`generateReflectiveAction`, (ב) post-processor על differentiationEngine output, (ג) subsystem חדש `src/engine/moat/` נפרד. תטיע בעד אחת ותסביר למה השתיים האחרות פחות נכונות כאן.

3. **Hidden value ↔ Principle mapping:** קח HIDDEN_VALUE "autonomy". תאר איך הוא מתקשר ל-P06 ול-P12. מה זה מוסיף שלא היה קודם?

4. **Citation integrity:** אם user מקבל recommendation על archetype "laser_focused" אבל אין principle שמצטט archetype זה ב-sources שלו, מה ה-UI מציג? (אסור לזייף ציטוט. אסור גם להסתיר את ה-recommendation.)

5. **Test isolation:** ה-42 MOAT tests הקיימים לא אמורים להישבר. מה המנגנון שמבטיח ש-tests אלה לא מושפעים מהקוד החדש?

בלי תשובות אמינות לחמש אלה, חזור לקריאה.

## Mandate — scope ו-architecture

### ארכיטקטורה: subsystem חדש `src/engine/moat/`

```
src/engine/moat/
├── principleLibrary.ts              — טעינת principles.json ב-startup, exports typed
├── hiddenValuePrincipleMap.ts       — STATIC mapping (8×~3 rows)
├── archetypePrincipleMap.ts         — STATIC mapping (5×~2 rows)
├── principleTraceEnricher.ts        — fn: enrichDifferentiationWithCitations(result) → result + trace
├── __tests__/
│   ├── principleLibrary.test.ts
│   ├── principleTraceEnricher.test.ts
│   └── hiddenValueMap.test.ts
```

### אילוצים

- **Feature flag:** `VITE_PRINCIPLE_GROUNDING_ENABLED`. off by default ב-v1.
- **No mutations to optimization/** — subsystem שלך מקביל, לא מקונן.
- **No frontend changes מחוץ ל-trace modal חדש** — קומפוננט חדש יחיד: `src/components/moat/PrincipleTraceModal.tsx`. שאר ה-UI לא משתנה.
- **Read-only library:** `principles.json` לא מעודכן בקוד.
- **No LLM calls בשלב v1** — substring/exact matching בלבד ל-enrichment.

### מיפוי סטטי ראשוני (פתיחה לדיון ב-PR)

```typescript
// src/engine/moat/hiddenValuePrincipleMap.ts
export const HIDDEN_VALUE_TO_PRINCIPLES: Record<HiddenValueType, PrincipleId[]> = {
  autonomy:       ["P06", "P12"],   // cognitive comm + locus of control
  risk:           ["P03", "P08"],   // COR + resilience triad
  identity:       ["P15"],          // trust equation
  legitimacy:     ["P15", "P16"],   // trust + pyramid
  cognitive_ease: ["P16"],          // MECE
  status:         ["P15"],          // trust equation (status signal)
  empathy:        ["P11", "P06"],   // structure prevents secondary trauma + cognitive comm
  narrative:      ["P14", "P13"],   // persistent trauma + ABC-X
};
```

**אתה** מעדכן/מאתגר את המיפוי הזה ב-PR אחרי שקראת את כל ה-16 principles. כל שינוי צריך rationale ב-comment.

### Scope של v1

- [ ] `principleLibrary.ts` — typed loader + validation ב-startup
- [ ] `hiddenValuePrincipleMap.ts` + `archetypePrincipleMap.ts` — static mappings
- [ ] `principleTraceEnricher.ts` — מקבל `DifferentiationResult`, מחזיר `{result, trace: PrincipleTrace[]}`
- [ ] `PrincipleTraceModal.tsx` — פותח-נסגר, מציג principle name/definition/researchers/source docs
- [ ] Wiring ל-DifferentiationTab — אחרי result + feature flag, קריאה ל-enricher + trigger ל-modal
- [ ] 3 test files — library loading, map integrity, enricher correctness
- [ ] verify שכל ה-92 optimization tests + 42 moat tests + 582 core tests עדיין ירוקים

### Scope שלא בv1

- Principle-based MatchEngine (סריקת competitors, scoring) — v1.1
- Dynamic mapping (embeddings/alignment scoring) — v1.2, אחרי 30+ principles
- Claim template filling עם LLM — v1.1
- Integration ל-Pricing / Sales / Retention / Marketing — v2

## Acceptance Criteria (falsifiable)

**T1 — Library loads.** App startup loads 16 principles ו-65 sources ללא error. Memory footprint < 150KB.

**T2 — Map integrity.** לכל 8 hidden values יש לפחות 1 principle ממופה. לכל principle שמופיע במפה, יש רשומה אמיתית ב-principles.json. Test failure אם ref לקוי.

**T3 — Trace correctness.** `enrichDifferentiationWithCitations` על `DifferentiationResult` עם top hidden value "autonomy" מחזיר trace שכולל P06 + P12 עם research_backbone + לפחות 2 source docs לכל principle.

**T4 — No missing citations.** אם hidden value/archetype מופיע ב-result אבל אין principles ממופים אליו, trace לא שותק — מציג "no research mapping yet" ו-lo שוגה. לא מייצר ציטוט מזויף.

**T5 — Feature flag off = full backwards compat.** כש-`VITE_PRINCIPLE_GROUNDING_ENABLED=false`, ה-UI של DifferentiationTab זהה בייט-ל-בייט למצב לפני. אין re-render נוסף. אין network call נוסף.

**T6 — All existing tests green.** 42 MOAT + 92 optimization + 582 core = 716 tests. אסור ל-flakes בגלל הקוד החדש.

**T7 — Honest metric survives.** `npx tsx scripts/verify-runtime-calls.ts` ממשיך לעבור. הsubsystem החדש מופיע כ-REACHABLE אם ה-flag on, כ-IMPORTED_BUT_UNCALLED אם off (זה OK — flag-gated).

## Guardrails

**אל תעשה:**
- עריכת קובץ כלשהו ב-`src/engine/optimization/`
- עריכת `differentiationEngine.ts` או `differentiationKnowledge.ts`
- שינוי `blackboardClient.ts` או migrations קיימים
- הוספת principle ב-TS (tampering עם הספרייה). הספרייה upstream, read-only.
- שבירת feature flag (ברירת מחדל off, period).
- הוספת frontend changes מחוץ ל-PrincipleTraceModal ולטריגר שלו.
- LLM calls.

**כן לעשות:**
- Branch מ-`origin/claude/campaign-moat-layer-4oQcn` (הוא לא ממוזג ל-main עדיין, stacked PR הוא הדפוס הנכון).
- Commits atomic עם הודעות ברורות.
- Comment מעל כל פונקציה שמסביר את ה-trace ל-principle ספציפי.
- תיעוד decisions ב-commit messages, לא רק ב-code.

## Branch

- **Base:** `origin/claude/campaign-moat-layer-4oQcn`
- **Work branch:** `knowledge/moat-integration-v1`
- **Target PR:** stacked על campaign-moat-layer

אחרי שהוא ממוזג ל-main, `git rebase --onto main campaign-moat-layer-4oQcn knowledge/moat-integration-v1` יעביר אותך.

### Commit sequence

```
chore(moat): scaffold src/engine/moat/ subsystem
feat(moat): load principleLibrary from knowledge/principles.json
feat(moat): add hiddenValuePrincipleMap static mapping
feat(moat): add archetypePrincipleMap static mapping
feat(moat): implement principleTraceEnricher
feat(moat): add PrincipleTraceModal component
feat(moat): wire enrichment into DifferentiationTab (flag-gated)
test(moat): add principleLibrary + map + enricher tests
docs(moat): extend README with principle grounding layer
```

## Report back

כשגמרת:

1. אילו T1-T7 עוברים, אילו נדחו ולמה.
2. שינויים שעשית ל-static mapping הראשוני ו-rationale.
3. מדידה של תוספת runtime cost (שני ביצועים: flag-off = 0, flag-on = X ms).
4. שאלה design אחת פתוחה לארז (למשל: איך מתנהגים כשהמיפוי מרובה-principles-per-value פולט 5+ ציטוטים — UI cap?).

## Meta

ה-MOAT של המוצר הזה היה עד עכשיו **ארכיטקטוני** (E1-E6 gates, falsifiers, adaptive verifier). אתה מוסיף לו ממד **אפיסטמי** — כל output נסמך על מחקר בעל שם עם ציטוטים שהלקוח יכול לבדוק בעצמו. זה ההבדל בין "המערכת חכמה" לבין "המערכת מבוססת".

העבודה שלך כאן יוצרת את ההבדל בין FunnelForge לבין כל competitor שאי פעם יצליח לחקות את הארכיטקטורה. הארכיטקטורה ניתנת להעתקה תוך 6 חודשים. הגרוף מחקרי של 3 שנות תואר עם sourceis spezifisch של ארז — לא ניתן להעתקה.

תזכור כשאתה כותב.

