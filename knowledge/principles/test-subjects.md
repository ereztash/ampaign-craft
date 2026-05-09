# Test Subjects & Phase 2 Strategy

מאגר המועמדים שאותרו בשלושה מחקרי Deep Research נפרדים, אסטרטגיית הטסט המתוקנת, וההחלטות המתודולוגיות המנחות את שלב הולידציה.

---

## MVP Final Status (2026-05-09, tag `mvp-v1.0`)

ה-MVP נסגר עם 3 candidates שעברו pipeline מלא. ראה דוח ב-[`reports/mvp-final.md`](./reports/mvp-final.md).

| # | Candidate | Status | Track | תוצאה |
|---|-----------|--------|-------|-------|
| 1 | Roy Danon / Buildots | ✅ הורץ | depth | 6/9 metrics, P02+P03+P05+P09 stable |
| 2 | Shahar Chen / Aquant | ✅ הורץ | depth + breadth (×2 sources) | 6/9 → 7/9 metrics; ceiling broken P09 7,8,7 → 8,8,8 |
| 3 | Roi Ravhon / Finout | ✅ הורץ | depth | 6/9 metrics, P02+P05+P15 stable |
| 4 | Itamar Friedman / Qodo | reserve | — | לא הורץ ב-MVP |
| 5 | Ben Reuveni / Gloat | reserve | — | לא הורץ ב-MVP |
| 6 | Bar Mor / Agora | reserve | — | לא הורץ ב-MVP |

**Nicolas Bandurek (Data for Business)** — benchmark test attempted but archived 2026-05-09: source-asymmetry between Erez's NotebookLM-based manual synthesis and the engine's web-only bundle would have tested the source gap, not the engine. Bundle moved to `runs/archived/`.

---

## רקע: שלושה מחקרי Deep Research

| מקור | מועמדים שהציע | חוזק | חולשה |
|------|--------------|------|--------|
| **Doc 1** (English TL;DR) | Roy Danon/Buildots, Roi Ravhon/Finout, Bar Mor/Agora, Itamar Friedman/Qodo, Ben Reuveni/Gloat, Shahar Chen/Aquant | רחב, מאומת ידנית באופן חלקי, מציין חברות שנפסלו | חסר female CEO, חסר cybersecurity (Astrix נפסל בגלל Cisco acquisition) |
| **Doc 2** (Hebrew long-form) | Lior Yogev/FundGuard, Bar Mor/Agora, Alon Jackson/Astrix, Roi Ravhon/Finout | עומק verbatim ידני | כולל Astrix שנפסל ב-Doc 1 — Cisco completed May 2026 |
| **Doc 3** (Hebrew, strict) | Idan Plotnik/Apiiro, Ofer Klein/Reco, Ido Wiesenberg/Voyantis, Or Eshed/LayerX | קריטריונים מחמירים על LinkedIn About | bias חזק לסייבר (3/4) |

### הכרעות בקונפליקטים

- **Astrix (Alon Jackson)** — נפסל. Cisco השלימה את הרכישה במאי 2026 (Doc 1 מצטט Calcalist). אינו עוד "חברה ישראלית עצמאית בשלב Growth Stage".
- **Buildots (גודל)** — Doc 1 כולל אותו ב-200 employees (עליון לקריטריון). Doc 3 פוסל. נשמר במאגר עם תיוג "edge of band — re-verify before testing".
- **Finout (LinkedIn About verification)** — Doc 1 ו-Doc 2 כללו עם ground truth מאומת (Pitango ~1,500 מילים). Doc 3 פוסל בקריטריון שונה. נשמר על בסיס verification של תוכן.

---

## המאגר המאוחד (10 candidates, אחרי Astrix)

| # | מנכ"ל | חברה | תעשייה | Source חיצוני עיקרי | תיוג גודל |
|---|-------|------|--------|------------------|----------|
| 1 | Roy Danon | Buildots | Construction tech | Unite.AI Q&A | edge of band (~200) |
| 2 | Roi Ravhon | Finout | FinOps | Pitango Founder Story | 100-150 |
| 3 | Bar Mor | Agora | RealEstate vertical SaaS | Pulse 2.0 | 160-200 |
| 4 | Itamar Friedman | Qodo | DevTools (AI code review) | Not Another CEO Podcast | ~100 |
| 5 | Ben Reuveni | Gloat | HR-tech | HBS Managing Future of Work podcast | upper edge (~178) |
| 6 | Shahar Chen | Aquant | Field-service AI | Authority Magazine ~2,200 words | 100-130 |
| 7 | Lior Yogev | FundGuard | Fintech (asset accounting) | Calcalist Tech video + press releases | 171 |
| 8 | Idan Plotnik | Apiiro | AppSec | SecureTalk podcast + SC World | 130 |
| 9 | Ido Wiesenberg | Voyantis | Growth AI / Predictive | Prescriptive AI article + 37-min Spotify | 128 |
| 10 | Or Eshed | LayerX | Browser security | Brave podcast + FinSMEs Q&A | 51-200 |

### CTM Coverage (משוער, לפני סינתזה)

| ציר | candidates עם hooks חזקים | אחוז |
|----|------------------------|-----|
| **M** | Buildots, Finout, Qodo, Gloat, FundGuard, Apiiro, Voyantis | 7/10 = 70% |
| **T** | Aquant + secondary hooks ב-Buildots, Finout | 1 primary, 2 secondary |
| **C** | Agora + secondary hooks ב-Reco?, LayerX? | 1 primary |

**הערה:** Ofer Klein/Reco לא נכלל ברשימה הסופית כדי לא להחמיר את ה-cyber bias של Doc 3. אם Phase 0 על שני סייבר candidates (Apiiro + LayerX) מחזיר extraction עשיר באותם terms, הוא יתווסף כ-control. אחרת, נשמר בעתודה.

---

## אסטרטגיית הטסט (Phase 0 → 4)

### Architecture: Breadth-First (preferred) + Depth-First (fallback)

ב-2026-05-09, האסטרטגיה עברה revision מהותי. Pattern recognition דורש breadth, לא depth. Architecture הקודמת (single source ≥1,500 מילים) הוחלפה ב-breadth-first על מקורות עצמאיים מרובים.

**שני tracks מקבילים, NON-COMPARABLE בלי calibration נפרד:**

```
Track A — BREADTH-FIRST (preferred)
  Trigger: candidate has ≥3 INDEPENDENT sources (interview/podcast/profile article;
           NOT website/LinkedIn/press releases — those are first-party)
  Schema: recurring_themes (extractor v0.3.0+)
  Phase 1+: synthesis runs against full bundle

Track B — DEPTH-FIRST (fallback)
  Trigger: candidate has 1-2 independent sources (presence-thin)
  Schema: core_differentiation_claim (extractor v0.2.x)
  Phase 1+: synthesis runs against single primary + first-party
  Documented limitation: thin anchor; results not directly comparable to Track A
```

**Cross-method comparability — explicit statement:**

ב-Phase 2, התוצאות מוצגות **בנפרד** עבור Track A ועבור Track B. אסור לקבץ outcomes כדי להגיד "הplaybook עובד ב-X% מהcandidates" — ה-architectures שונים, ה-baselines שונים, ה-decision gates שונים. **המסקנה הסופית של ה-Test היא:**

- "הplaybook לחברות עם presence ציבורית רחבה (Track A)" — תוצאת מסויימת
- "הplaybook לחברות עם presence ציבורית מוגבלת (Track B)" — תוצאת אחרת

Cross-method conclusions ("הplaybook עובד באופן אוניברסלי") דורשות calibration step נפרד שלא נכלל ב-Phase 1-3 הנוכחיים.

### Mapping של candidates ל-Tracks (לפי independent source count, מאומת 2026-05-09)

**Track A (≥3 independent sources):**
1. Buildots / Roy Danon — Unite.AI, Citybiz, BDC Magazine
2. Finout / Roi Ravhon — Pitango Founder Story, VMblog, InfoQ
3. Agora / Bar Mor — Pulse 2.0, Authority Mag, TechCrunch
4. Qodo / Itamar Friedman — NotAnotherCEO, StartupHub.ai, TestGuild
5. Gloat / Ben Reuveni — HBS podcast, Pulse 2.0, Accel
6. Aquant / Shahar Chen — Authority Mag (~2,200w), Emerj, Service Council

**Track B (1-2 independent sources, fallback handling required):**
- Voyantis / Ido Wiesenberg — 2-3 (Spotify 37m + ?Prescriptive AI status)
- LayerX / Or Eshed — 2 (Brave podcast, FinSMEs)
- Apiiro / Idan Plotnik — 2 (SecureTalk, SC World)
- Reco / Ofer Klein — 1-2 (Business Insider × 2 — same publication, possibly count as 1)
- FundGuard / Lior Yogev — 1 (Calcalist Tech video)

### Validation Quality — Dual-Path Logic (Track A only)

ב-Track A, `validation_quality` נקבע דטרמיניסטית לפי **OR פנימי** של שני נתיבים:

```
Path (a) — RECURRENCE WITH LEXICAL SIMILARITY:
  ≥3 distinct recurring_themes total
  AND ≥2 themes שמקיימים את שני התנאים:
    (i)  מופיעים ב-≥2 independent sources
    (ii) ≥1 verbatim term/phrase מתוך ceo_terminology נצפה
         identical (לא רק "דומה") בין ה-appearances
  Rationale: הסיכון ב-loose recurrence בtriangulation על n=3
             הוא שטחי (noise statistical). דרישת שיתוף terminology
             ספציפי מסננת pseudo-recurrence.

Path (b) — DEPTH-WITH-SELF-REINFORCEMENT (לא "validation"):
  ≥1 theme שמופיע במקור עצמאי 1 בעמקות ≥200 words CEO-speech
  AND אותו theme (במונחים identical או paraphrase קרוב)
      מהדהד ב-first-party content (LinkedIn/website)
  IMPORTANT NAMING: זה לא "external validation". First-party הוא
                    הניסוח של החברה/מנכ"ל עצמם. נוכחות הtheme גם
                    שם משקף consistency של מסר, לא אישור עצמאי.
                    ה-path משרת fallback מתודולוגי, לא תוקף-חיצוני.

low = שום נתיב לא מתקיים
```

**הסבר על Path (a) constraint (i)+(ii) המחמיר:** במקור הצעתי "≥2 sources בכל לשון". המציאות עם n=3 הוא שזה רעש. שלושה ראיונות שונים באותם מילים כלליים יכולים להיראות כ-"recurrence" שטחי. דרישת term identical מסננת.

### Validation Quality — Track B (depth-first)

נשאר identical לlogic של גרסת Extractor 0.2.x:
```
quality = "high" אם פחות מ-2 כשלים מ-3:
  - summary_3_5_sentences ≥80 מילים
  - ≥2 verbatim quotes >30 מילים
  - ≥3 terms ב-in_ceo_own_terminology
```

### עקרונות מבניים (תקפים לשני ה-tracks)

1. **3-tier separation בין LLM calls** — Extractor (no playbook), Synthesizer (full playbook), Mapper (playbook index only). אסור context-sharing.
2. **Ground truth = ניסוח המנכ"ל עצמו**, לא ניחוש מראש איזה principle "אמור" לעלות. כל decision gate נמדד מול ה-extraction של אותו candidate.
3. **No "Expected outcome" pre-anchoring.** אין לכתוב מראש "ב-Buildots צפוי P05 בציון 8-9". זה confirmation bias.
4. **Tag-and-continue ל-extraction דליל.** מועמדים עם `validation_quality: low` נכנסים לסינתזה אבל לא ל-decision gates.
5. **Phase 4 (Disqualifier stress) נדחה** עד שיש signal אמפירי מ-Phase 1-3 על איזה disqualifier לבחון.
6. **Dual-track non-comparable.** תוצאות Track A ו-Track B לא מתקבצות ל-aggregate metric יחיד; כל phase report מציג את שני ה-tracks בנפרד עם decision gates שונים.

---

### Phase 0 — Ground Truth Extraction

**רץ על:** כל 10 המועמדים (או כל subset שיוחלט). פעם אחת לכל candidate.

**Process:**
1. Extractor LLM מופעל ב-context נפרד, ללא הפלייבוק
2. מקבל source content (interview/podcast transcript) + מטא-דאטה
3. מייצר `extraction.json` לפי [extractor.md](./prompts/extractor.md)
4. קוד דטרמיניסטי מסמן `validation_quality: high|low` לפי שלושת הקריטריונים:
   - `summary_2_3_sentences` ≥80 מילים
   - ≥2 supporting verbatim quotes ≥30 מילים
   - ≥3 distinct terms ב-`in_ceo_own_terminology`
   - **2+ failures → low**

**Decision gate:**
- אם <3 candidates יוצאים `high` עם CTM coverage שכולל לפחות M + T + C → חזרה לחיפוש candidates נוספים לפני המשך.
- אם ≥3 candidates `high` ויש כיסוי CTM → ממשיכים ל-Phase 1.

---

### Phase 1 — Mechanical Calibration (n=1, Buildots)

**רץ על:** Buildots בלבד (Q&A מובנה, ground truth עשיר).

**Inputs נדרשים:**
- Unite.AI Q&A (primary source)
- LinkedIn headline + About מהפרופיל של Roy Danon
- Website hero + About first paragraph מ-buildots.com
- אופציונלי: pricing page, 1-2 case study intros

**הערה מהירה ל-Phase 0:** ה-Synthesizer חוסם synthesis על single-source input (ראה [synthesizer.md](./prompts/synthesizer.md)). יש לאסוף את ה-4 secondary sources לפני ההפעלה.

**Process:**
1. Synthesizer LLM מופעל ב-context נפרד עם הפלייבוק המלא + multi-source bundle
2. מייצר `synthesis.json` לפי [synthesizer.md](./prompts/synthesizer.md)
3. הסינתזה רצה 2-3 פעמים לבחינת stability

**Decision gate (מבני בלבד, לא תוצאתי):**
- האם 15 principleOutputs קיימים?
- האם כל ציון ≥6 כולל ≥1 evidenceQuote ≥30 מילים?
- האם evidence quotes verbatim בתוך ה-source?
- האם variance בין הרצות ≤1.5 נקודות לכל principle?
- האם כל disqualifier triggered מציין evidence?
- האם כל competing pair resolution מציין tiebreaker dimension verbatim מהפלייבוק?

**אם כן בכל הקריטריונים** → ממשיכים ל-Phase 2.
**אם לא** → תקלה ב-prompt, יש להחזק. לא ממשיכים עם prompt לא-יציב.

---

### Phase 2 — Ground Truth Comparison (n=3)

**רץ על:** Buildots (כבר יש סינתזה מ-Phase 1) + Aquant + Agora.

**Process:**
1. Synthesizer רץ על Aquant + Agora
2. Mapper רץ על שלושת ה-extractions (מ-Phase 0) + playbook-index
3. Comparison Layer (קוד דטרמיניסטי) מחשב metrics:
   - **Ground-Truth Coverage:** עבור כל principle ב-mapping עם confidence ≥medium, האם הוא קיבל ציון ≥7 בסינתזה?
   - **Hallucination Rate:** עבור כל principle בסינתזה עם ציון ≥7, האם יש לו ייצוג ב-mapping? אם לא — productive divergence או הזיה?
   - **CTM Axis Match:** האם ה-axis של principle הסינתזה עם הציון הגבוה תואם ל-axis של ה-mapping primary?

**Decision gate:**
- Ground-Truth Coverage ≥60% עבור כל candidate `validation_quality: high`
- Hallucination Rate <30% (כלומר, לא יותר מ-30% מהציונים הגבוהים בסינתזה הם principles שלא מופיעים ב-mapping)
- CTM Axis Match ≥60% (כלומר, ה-axis של ה-top principle תואם)

**אם נכשל באחד** → תיעוד התקלה, וניתוח האם מקור הבעיה ב-prompt, בפלייבוק, או ב-extraction. בלי לעבור ל-Phase 3 לפני שמבינים.

---

### Phase 3 — Within-M Discrimination (n=3)

**רץ על:** Qodo + Apiiro + FundGuard (3 candidates שהוערכו ידנית כשונים זה מזה ב-research, מתוך 7 ה-M-candidates).

**Process:**
1. Synthesizer + Mapper + Comparison Layer רצים על שלושתם
2. Comparison Layer מבצע השוואה בין ה-3 candidates: distribution similarity, top-3 principles, evidence type diversity

**Decision gate:**
- האם 3 הסינתזות מציגות distribution **שונה** ב-top-3 principles? (לפחות 2/3 distinct primary)
- האם evidence types (lexical vs structural) שונים בין ה-candidates? (אם כל ה-3 משתמשים רק ב-lexical, הפלייבוק לא מבחין במבנה)
- האם ה-mapping של כל candidate מצביע על חלוקה ייחודית של principles? אם 3 candidates → 3 mappings שונים → סינתזה צריכה להחזיר 3 distributions שונים.

**אם 3 הסינתזות נראות אותו דבר** → discrimination failure. צריך לבדוק אם ה-Synthesizer קולט M-axis בלבד ומתעלם מסיגנלים מבדילים בתוך M.

---

### Phase 4 — Disqualifier Stress Test (נדחה)

**מטרה:** לבחון אם הפלייבוק מיישם disqualifiers נכון.

**מתוכנן מתי:** אחרי Phase 1-3 בלבד. תכנון Phase 4 ייבנה על בסיס:
- איזה disqualifiers הופיעו ב-`disqualifiersChecked` של הסינתזות אבל לא הורידו ציון
- איזה signals של disqualifiers צפויים ב-ground truth של candidate ספציפי שלא נבחר

**אופציה אלטרנטיבית:** Adversarial prompt — הצגת synthesis שהוחזרה ב-Phase 2 ל-LLM שלישי עם הנחיה "מצא Disqualifiers שהוחמצו". זול יותר, ממוקד יותר.

---

## Output structure

### Files generated per candidate

```
extractions/
  buildots-roy-danon.json      # Phase 0 output
  aquant-shahar-chen.json
  ...

mappings/
  buildots-roy-danon.json      # Phase 0.5 output (extraction → playbook index)
  aquant-shahar-chen.json
  ...

syntheses/
  buildots-roy-danon-run1.json # Phase 1+ output (full 15 principles)
  buildots-roy-danon-run2.json # for stability check
  aquant-shahar-chen.json
  ...

comparisons/
  buildots-roy-danon.json      # Phase 2+ output (deterministic metrics)
  aquant-shahar-chen.json
  ...
```

### Cross-candidate aggregations

```
phase-1-calibration-report.md  # mechanical pass/fail per Buildots
phase-2-comparison-report.md   # ground-truth metrics across 3 candidates
phase-3-discrimination-report.md  # within-M distribution analysis
```

---

## Decision Gate Summary Table

| Phase | n | Gate type | Pass criterion | Fail action |
|-------|---|-----------|----------------|------------|
| 0 | 10 | Extraction quality | ≥3 high-quality + CTM coverage | Find more candidates |
| 1 | 1 | Mechanical | All schema checks pass + variance ≤1.5 | Fix synthesizer prompt |
| 2 | 3 | Ground truth alignment | Coverage ≥60%, Hallucination <30%, Axis ≥60% | Diagnose prompt vs playbook vs extraction |
| 3 | 3 | Within-axis discrimination | 2/3 distinct primary, distinct evidence types | Investigate M-axis collapse |
| 4 | TBD | Disqualifier robustness | TBD based on 1-3 results | TBD |

---

## כללי עבודה

1. **כל phase מתועד בקובץ report.md לפני המעבר לפיין הבא.**
2. **אם נכשל decision gate, לא ממשיכים — מתקנים ומריצים שוב.**
3. **`validation_quality: low` candidates נכללים בסינתזה אבל לא נכנסים ל-decision gates.**
4. **Phase 4 לא ייסגר עד שיש evidence מ-Phase 1-3.**
5. **כל decision gate משתמש ב-mapping (לא בשיפוט אנושי) להשוואה בין extraction לסינתזה.**

---

## Open questions לסבב הבא

1. **Reco כ-control לסייבר?** אם Apiiro ו-LayerX מחזירים סינתזות דומות מאוד, נכניס Reco כ-tiebreaker.
2. **ספים כמותיים בPhase 2** (60% / 30% / 60%) — נקבעו על בסיס intuition; ייתכן שצריך לבייל אחרי Phase 1.
3. **מי מבצע את ה-LLM calls?** — yet to define. אופציות: (א) דרך ה-CLI הזה ב-runs נפרדים; (ב) דרך תשתית פנימית של FunnelForge; (ג) Edge function ייעודי.
4. **תיעוד תוצאות חלקיות** — נכון לכלול גם תוצאות Phase 2 שלא עברו את ה-gate, או רק לתעד כשלים?
