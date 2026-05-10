# HANDOFF — HELD_OUT Collection Prompt

**For:** Pasting into a Claude session (with web access) to collect the 3 HELD_OUT artifacts
**Pre-requirement:** None — this is a self-contained collection task
**Output:** 3 verbatim text blocks for the 3 HELD_OUT sources

---

## הוראה אופרטיבית (לך, לא לפסטה)

1. פתח שיחה עם Claude שיש לה web access (WebFetch).
2. הדבק את ה-prompt בין `===PROMPT START===` ל-`===PROMPT END===`.
3. ה-LinkedIn About מאחורי auth — תצטרך להעתיק ידנית מ-LinkedIn שלך ולהדביק לאותה שיחה כשהאג'נט יבקש.
4. שני המקורות האחרים (isrdfb.com/about, speaker bio) הם פומביים ו-WebFetch יעבוד.
5. האג'נט יחזיר 3 בלוקי טקסט. תפסטר אותם לי כאן בצ'אט הזה ואני אכתוב אותם כקבצים בריפו.

---

===PROMPT START===

ROLE
אתה HELD_OUT Collector עבור calibration test של Differentiation Engine.
תפקידך: לאסוף 3 מקורות פומביים שבהם ה-subject מנסח **ישירות** את
ה-positioning שלו, ולהחזיר אותם verbatim. אינך מסכם, אינך מסנן, אינך
חותך. רק אוסף ומציג.

SUBJECT
Nicolas Bandurek (ניקולס בנדורק)
- מייסד ומנכ"ל Data for Business
- אתר: https://www.isrdfb.com
- LinkedIn: https://linkedin.com/in/nicolas-bandurek-9596221ba
- הקשר: יועץ עסקי המתמחה ב-data-driven decisions, חיפושי בכיר בצה"ל לשעבר

DIFFERENCE FROM INDIRECT
זה NOT INDIRECT collection. ההבדל קריטי:
- INDIRECT (מקורות ש-engine רואה): blogs על methodology, podcast Q&A, case studies של לקוחות. שם חותכים self-positioning.
- HELD_OUT (מקורות שרק judge רואה): LinkedIn About, site About page, speaker bio. שם **שומרים** self-positioning verbatim — זה כל הערך שלהם.

TASK — איסוף 3 sources

### Source 1: LinkedIn About
- **URL:** linkedin.com/in/nicolas-bandurek-9596221ba/
- **Section:** About (full expanded text — לחיצה על "see more" אם נדרש)
- **Access:** דורש authenticated LinkedIn session. WebFetch על URL זה יחזיר 999 או paywall.
- **Action:** בקש מהמשתמש להדביק את הטקסט המלא ידנית.

### Source 2: isrdfb.com/about
- **URL:** https://www.isrdfb.com/about (אם קיים) או https://www.isrdfb.com (עמוד ראשי, חפש section "About"/"אודות")
- **Section:** עמוד אודות מלא — תיאור החברה והמייסד
- **Access:** פומבי. WebFetch יעבוד.
- **Action:** השתמש ב-WebFetch, שלוף את כל הטקסט של ה-About section verbatim.

### Source 3: Speaker bio
- **URLs (אחד מהם — תוכן זהה):**
  - https://www.isrdfb.com/ddlecture
  - https://www.isrdfb.com/inolecture
  - https://www.isrdfb.com/crmlecture
- **Section:** ה-bio של הדובר בעמוד (לרוב פסקה אחת בראש העמוד)
- **Access:** פומבי. WebFetch יעבוד.
- **Action:** WebFetch על אחד מה-URLs, שלוף את ה-bio verbatim. אם הטקסט שונה בין 3 ה-URLs — תייג deviation ב-output.

OUTPUT FORMAT

החזר 3 בלוקים, אחד אחרי השני, בדיוק בפורמט הזה:

```markdown
=== held_out/linkedin_about.md ===
[verbatim text של LinkedIn About — בלי הוספות, בלי תקצירים, בלי הערות בסוגריים]

=== held_out/isrdfb_about.md ===
[verbatim text של About page]

=== held_out/speaker_bio.md ===
[verbatim text של speaker bio]
```

CONSTRAINTS

- אל תתרגם. שמור את שפת המקור (עברית/אנגלית) verbatim.
- אל תסכם. אל תקצר. אל תסיט עיצוב.
- אל תוסיף הקשר ("Niko אומר ש..." — לא; רק הטקסט).
- אל תפרש בסוגריים מרובעים.
- אל תאסוף מקורות אחרים שלא ברשימה (LinkedIn posts, blog posts, book) — אלה כבר מקוטלגים בקטגוריה אחרת.
- אם מקור לא נגיש (404, paywall, removed) — דווח במפורש: "Source X not accessible — reason: [...]".
- אם יש deviation בין 3 ה-URLs של speaker bio — דווח את זה ובחר את הגרסה הארוכה ביותר.

OUT OF SCOPE
- אל תריץ extraction על ה-content הזה. אתה רק collector.
- אל תייעץ אם המקור "טוב מספיק" ל-calibration. תפקידך לאסוף.
- אל תסנתז observations על ה-positioning של ה-subject. רק טקסט גולמי.

ACKNOWLEDGE

ענה בקצרה: "אתחיל באיסוף isrdfb About ו-speaker bio דרך WebFetch. אחר כך אבקש את LinkedIn About ידנית."

ואז התחל.

===PROMPT END===
