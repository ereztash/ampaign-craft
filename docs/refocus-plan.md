# FunnelForge - תוכנית מיקוד (Refocus Plan)

> שלב DISCOVERY בלבד. מסמך זה הוא תוצר קריאה-בלבד. לא בוצע שום שינוי קוד.
> נוצר: 2026-06-01. בסיס: סריקת הריפו החי מול ההכרעות הנעולות.

## ההכרעות הנעולות (כפי שהתקבלו, לא נפתחות מחדש)

1. **קהל יעד חדש**: עצמאי במעבר ממומחיות לעסקה (גיל 25-40, יחיד, לא בעל עסק קטן ולא סוכנות). מיקוד B2C-לעצמאי, לא B2B2C.
2. **מודל עסקי**: Free + מדרגת תשלום אחת. לקרוס מ-Free/Pro/Business למדרגה אחת. ליישר כל מספר ל-pre-revenue.
3. **היקף MVP**: wedge של מודול אחד-שניים דרך `wedgeMode` הקיים. הסתרה/נעילה, לא מחיקה.
4. **אילוצים קשיחים**: solo, בלי תקציב פיתוח, pre-revenue, דדליין השקה קרוב. כל מה שנשאר חייב להיות מתוחזק ע"י אדם אחד. להעדיף החיתוך הקטן ביותר שאפשר לשלוח.

---

## תקציר מנהלים

- **ליבה לשמור**: מודול בידול (`differentiate`, ~3,843 שורות) + מודול תמחור (`pricing`, ~4,851 שורות) + תבנית `InsightActionCard`/HITL + intake + מנועי Tier S (health/guidance/funnel) + Auth + מדרגת Free + לולאת refer-a-friend (`referralEngine`) + `beta_waitlist` הקיים.
- **שומן לנעול/לדחות**: מודול מכירות (`sales`) + מודול שימור (`retention`) (מניחים pipeline/לקוחות קיימים, לא רלוונטי לעצמאי טרום-לקוחות), מדרגת Business + הפיצ'רים שלה (Campaign Cockpit, branded reports, team seats, template publishing), תוכנית reseller (קיימת בדוקס בלבד), billing חי (לדחות מאחורי waitlist קיים).
- **3 ההחלטות הקריטיות**: (C2) איך לקרוס tiers בלי migration מסוכן; (B) checkout חי מול free-first עם ה-waitlist הקיים; (C1) אילו מודולים ב-wedge + ניסוח ה-positioning המדויק.
- **מספר פרוסות מוצע**: 6.

---

## סתירות מול הריפו (במפורש, לא הותאמו בשקט)

| # | ההכרעה הנעולה | מה נמצא בריפו | מסקנה |
|---|---|---|---|
| S1 | קהל = עצמאי (B2C) | README + כל המיצוב = "Israeli SMBs / בעלי עסקים"; קיים `docs/consultant-reseller-program.md` שלם (B2B2C) | סתירת מיצוב. נפתרת ב-D + החלטה A. **`reseller` מופיע 0 פעמים בקוד**, `commission` 3 בלבד -> התוכנית היא דוקס-בלבד, זול לתקן. |
| S2 | מדרגת תשלום אחת | `tier` מאוחסן ב-DB עם `CHECK (tier IN ('free','pro','business'))` (`20260409_005`); `manifest.ts` נועל גם `tier-pro-price-ils=129` וגם `tier-business-price-ils=299` כ-claims ב-README ש-CI בודק | הסרת Business אמיתית = migration + נתונים + identity/numeric audits. ראה החלטה C2. |
| S3 | wedge של 1-2 מודולים | `wedgeMode.ts` תומך כיום רק ב-wedge **חד-מודולרי** (`pricing-only`/`marketing-only`/`differentiate-only`) או `all`. אין combo דו-מודולרי, אין `sales-only`/`retention-only` | wedge של 2 מודולים דורש הרחבת `ENABLED_MAP` + ה-type. שינוי קטן ומרוכז. ראה טבלה A. |
| S4 | pre-revenue, מספרים אמיתיים | `docs/financials.md` מציג Pro ₪99 / Business ₪249 / "save 20%" - **drift קיים** מול הקוד (₪129/₪299/35%); Landing מציג "+N בעלי עסקים" כ-social proof ל-pre-revenue | drift + טענות מנופחות. ראה D. |

---

## טבלה A - מיקוד וצמצום ל-MVP (wedge)

| קובץ/אזור | מצב נוכחי | מצב מבוקש | סיבה | סיכון | החלטה פתוחה? |
|---|---|---|---|---|---|
| `src/lib/wedgeMode.ts` | מודים: `all`/`pricing-only`/`marketing-only`/`differentiate-only`; `DEFAULT_MODE="all"`; `ENABLED_MAP` חד-מודולרי | להוסיף combo דו-מודולרי (למשל `offer-builder` = `differentiate`+`pricing`) ולקבוע אותו כ-`DEFAULT_MODE` | ההכרעה דורשת wedge של 1-2 מודולים לעצמאי | נמוך (מרוכז בקובץ אחד) | **כן** - אילו מודולים (החלטה C1) |
| `SalesEntry`, `RetentionEntry` + `salesPipelineEngine`, `retention*Engine` | חשופים במוד `all` | לנעול דרך wedge (לא למחוק) | מכירות/שימור = שומן לעצמאי טרום-לקוחות | נמוך (הסתרה הפיכה; מחיקה היתה שוברת ספירות numeric) | כן (לאשר שהם מחוץ ל-wedge) |
| `WedgeGuard.tsx`, `LockedModuleScreen.tsx`, `wedgeTelemetry.ts` | מנגנון נעילה + טלמטריית phantom-interest מלא ומחווט | ללא שינוי מבני; להתאים קופי הנעילה לקהל החדש | המנגנון כבר קיים, רק נשען עליו | נמוך | לא |
| `src/pages/Landing.tsx` (CTA) + ברירת-מחדל ניווט | CTA ראשי -> `/wizard` (Marketing) | להפנות ל-wedge הנבחר (`/differentiate` או `/pricing`) | אם `wizard` מחוץ ל-wedge, ה-CTA מוביל למסך נעול | בינוני (זרימת onboarding) | כן (תלוי C1) |
| `src/pages/AdminWedge.tsx` (`/admin/wedge`) | מתג runtime owner-only | להוסיף את המוד החדש לרשימה; ללא שינוי מבני | שליטה ידנית קיימת | נמוך | לא |

---

## טבלה B - שינוי קהל יעד / מיצוב

| קובץ/אזור | מצב נוכחי | מצב מבוקש | סיבה | סיכון | החלטה פתוחה? |
|---|---|---|---|---|---|
| `src/pages/Landing.tsx` (hero, before/after, 5 modules) | "משקיע בשיווק ולא רואה תוצאות?" + "בעלי עסקים ישראליים"; כותרת SMB | מסר ל"עצמאי במעבר ממומחיות לעסקה" (למשל: "מומחה/ית בתחומך, אבל לא יודע/ת איך להפוך את זה להצעה שמוכרת?"); להבליט בידול+תמחור | ההכרעה על קהל | נמוך ל-CI (קופי), גבוה למסר (צריך דיוק) | **כן** (ניסוח positioning מדויק) |
| `src/pages/UseCases.tsx` | דוגמאות לבעלי עסקים/SMB | דוגמאות לעצמאי (יועץ/מאמן/פרילנסר שבונה הצעה ראשונה) | קהל | נמוך | כן (אילו פרסונות) |
| `src/i18n/translations.ts` (~1,530 קריאות `tx(`) | טרמינולוגיה "עסק/בעל עסק" | מעבר ל"עצמאי/מומחה/הצעה"; לשמור `tx({he,en})` ו-copy ממוגדר | קהל | בינוני (היקף; `i18n-key-count` דורש actual >= claimed -> לא להוריד מפתחות) | לא |
| `src/lib/socialProofData.ts` | "+N בעלי עסקים" | ניסוח לעצמאים + להעמיד מספר אמיתי (pre-revenue) | קהל + כנות | בינוני (טענת social proof מנופחת) | כן (החלטה E) |
| Differentiation/Pricing prompts (engine + UI) | מסגור עסקי, "B2B Differentiation Agent" | מסגור "הופך מומחיות להצעה" | קהל | בינוני (prompts משפיעים על פלט LLM; דורש eval) | כן |

---

## טבלה C - שינוי מודל עסקי / תמחור

| קובץ/אזור | מצב נוכחי | מצב מבוקש | סיבה | סיכון | החלטה פתוחה? |
|---|---|---|---|---|---|
| `src/lib/pricingTiers.ts` (`TIERS`, `PricingTier`) | free / pro ₪129 / business ₪299; annual 35%; trial 14 | להציג free + מדרגת תשלום אחת | ההכרעה | גבוה (ripple רחב) | **כן** (שם+מחיר המדרגה; annual? - החלטה D) |
| `src/types/tier.ts` (`Tier`, `ALL_TIERS`, `TIER_DISPLAY_NAMES`) | 3 tiers | תלוי החלטה C2 (להשאיר enum רדום מול להסיר) | SOT לשמות tier; `identity` audit | גבוה (identity audit) | תלוי C2 |
| DB: `profiles.tier` + `valid_tier CHECK` + `tier_audit_log` + RPC `process_stripe_tier_change` | `CHECK (tier IN ('free','pro','business'))`; webhook כותב tier | אם הסרה מלאה -> migration שמשנה CHECK + ממפה שורות `business` קיימות | שלמות נתונים | **גבוה** (migration+RLS+נתונים -> ענף+PR) | **כן** (החלטה C2) |
| `supabase/functions/create-checkout/index.ts` (`PRICE_IDS`, `TRIAL_DAYS`) | ממפה `pro`+`business` ל-Stripe price IDs מ-env | מדרגה אחת; להסיר `business`; (וראה קונפליקט B) | תשלום | גבוה (payments -> ענף+PR) | כן (החלטה B) |
| `PaywallModal.tsx` + 10 צרכני `useFeatureGate` + flags (`campaignCockpit`/`brandedReports`/`seats`/`templatePublishing`) | gating לפי 3 tiers; פיצ'רים business-only | מטריצת פיצ'רים חדשה ל-free/paid | model | בינוני-גבוה | **כן** (מה נכנס ל-paid) |
| `Landing.tsx` pricing preview (`TIERS.map`, `i===1`="הכי פופולרי") + `Plans.tsx` + `PricingEntry.tsx` | 3 כרטיסים, מבליט אמצעי | 2 כרטיסים; להסיר לוגיקת "אמצעי" | model | בינוני (UI) | לא |

---

## טבלה D - יישור מסמכים למציאות

| קובץ/אזור | מצב נוכחי | מצב מבוקש | סיבה | סיכון | החלטה פתוחה? |
|---|---|---|---|---|---|
| `README.md` | "for Israeli SMBs"; "Consultant Reseller Program"; roadmap "Business tier GA"; unit economics 25x; "200+ data points"; תחזיות Y1-Y5 | ליישר לקהל עצמאי, מדרגה אחת, pre-revenue, modeled-not-observed; להסיר/לדחות reseller | כנות + עקביות | גבוה (numeric audit על מחירי tier וספירות) | כן (כמה מהחזון לחשוף) |
| `scripts/consistency/manifest.ts` (`tier-pro-price-ils=129`, `tier-business-price-ils=299`, `trial-days`, ספירות) | נועל את מחירי 2 ה-tiers כ-claims ב-README ש-CI בודק | להסיר/לעדכן את claim ה-`business`; ליישר claim המדרגה היחידה | אחרת `consistency:numeric` **חוסם** | גבוה (CI blocker) | לא (חובה טכנית) |
| `docs/financials.md` | Pro ₪99 / Business ₪249 / "save 20%" (drift!) + תחזיות + reseller | ליישר למדרגה יחידה, להצהיר pre-revenue/modeled, להסיר reseller-at-scale | drift קיים + קהל/model | בינוני (לא ב-CI אך מטעה) | כן |
| `docs/consultant-reseller-program.md` | תוכנית reseller מלאה (B2B2C) | ארכוב/הסרה או מסגור כ"ערוץ עתידי מוקפא" | סותר קהל עצמאי | נמוך (doc) | **כן** (החלטה A) |
| `CLAUDE.md`, `CHOICES.md`, `docs/business-baseline.md`, `docs/market-research.md`, `docs/competitor-research/*`, `docs/prioritization.md`, `docs/wedge-progress.md` | מניחים SMB / 3-tier / reseller | יישור לקהל+model+wedge החדשים | עקביות | נמוך-בינוני (`parameter-count` ב-CHOICES.md ב-numeric audit) | לא |
| `Landing.tsx` claims (21 engines / 31 domains / 40 fields) מול README (128 engines) | טקסונומיות טענות לא מיושרות | לאחד; להעדיף מספרים אמיתיים/צנועים | כנות | בינוני | כן |

---

## החלטות פתוחות (דורשות קלט שלך לפני שלב הביצוע)

### A. קהל: positioning של reseller מול עצמאי
**ממצא**: reseller לא ממומש בקוד (0 `reseller`, 3 `commission` ב-`src`); קיים רק ב-README + doc ייעודי. ה-`referralEngine` הוא refer-a-friend (referrer +1 חודש, referee 14 יום) - תואם עצמאי.
- **(א) [מומלץ]** לשכתב positioning מ-reseller לעצמאי, לארכב `consultant-reseller-program.md`, לשמור refer-a-friend. עלות נמוכה (דוקס בלבד).
- (ב) ליישר קהל ל-B2B2C (היועץ כמשתמש) - **בניגוד להכרעה הנעולה**; דורש לשמר reseller.
- (ג) היברид: עצמאי כ-primary, reseller כ"ערוץ עתידי" מוקפא בדוקס.
- **המלצה: (א)**. נימוק: הקונפליקט רדוד-בקוד ויקר רק בדוקס; ההכרעה הנעולה ברורה.

### B. תשלום: checkout חי מול free-first + waitlist
**ממצא**: `create-checkout` בנוי (דורש `STRIPE_SECRET_KEY` + `STRIPE_PRICE_*` + webhook; אין טיפול במע"מ/חשבונית = נטל תפעולי solo). `request-beta-access` + טבלת `beta_waitlist` (`20260427_001`) **כבר קיימים**.
- **(א) [מומלץ להשקה]** free-first; לחווט את ה-waitlist הקיים ל-CTA של ה-paid; לדחות billing חי. ~אפס build נוסף; מסיר billing-ops מהמסלול הקריטי; מאמת ביקוש לפני כסף.
- (ב) live single-tier checkout עכשיו. הקוד קיים, אבל דורש הקמת Stripe + חשבונית/מע"מ + ניטור webhook; סיכון לדדליין solo.
- **המלצה: (א) להשקה, (ב) כ-fast-follow**. נימוק: אילוצי solo + דדליין; מנגנון ה-waitlist כבר בנוי.

### C1. אילו מודולים ב-wedge
**ממצא (fit ל"עצמאי במעבר ממומחיות לעסקה")**: בידול = HIGH, תמחור = HIGH, שיווק = MEDIUM, מכירות = LOW, שימור = LOW.
- (א) wedge דו-מודולרי "בנה ותמחר את ההצעה" = `differentiate`+`pricing` (דורש הרחבת `wedgeMode`).
- **(ב) [מומלץ להשקה ראשונה]** `differentiate-only` (קיים כבר; החיתוך הקטן ביותר; אפס שינוי wedge).
- (ג) `marketing-only` (`wizard`) - ברירת המחדל ההיסטורית, אך פחות מדויק לקהל.
- **המלצה: (ב) להשקה צמודת-דדליין, שדרוג ל-(א) מיד אחרי**. נימוק: "החיתוך הקטן ביותר שאפשר לשלוח".

### C2. איך לקרוס tiers (גוזר את סיכון ה-migration)
**ממצא**: `tier` ב-DB תחת `CHECK (tier IN ('free','pro','business'))` + RPC מבוקר + `tier_audit_log`.
- **(א) [מומלץ ל-MVP]** retire-at-presentation: להשאיר `'business'` כ-enum רדום ב-DB+type, להציג ולמכור מדרגה אחת בלבד, להסיר claim ה-business מ-README+manifest. **אפס migration**, הכי בטוח, תואם פילוסופיית "הסתר אל תמחק" של הריפו.
- (ב) hard-remove: להסיר `'business'` מה-type unions + `valid_tier CHECK` + RPC + `tier_audit_log`; migration שממפה שורות קיימות; ענף+PR; identity audit.
- **המלצה: (א) ל-MVP, (ב) כניקוי-חוב עתידי**. נימוק: solo + דדליין; הימנעות ממיגרציה על CHECK עם נתונים חיים.

### D. (משני) annual billing במדרגה היחידה?
monthly+annual מול monthly-only ל-MVP. **המלצה: monthly-only** (פחות SKUs ב-Stripe, פחות קופי, פחות מספרים ליישר).

### E. (משני) social proof אמיתי
Landing מציג "+N בעלי עסקים" ל-pre-revenue. **המלצה: להחליף ל"Early Access" לא-מספרי** עד שיש נתון אמיתי.

---

## סדר ביצוע מוצע (פרוסות קטנות, PR נפרד לכל אחת)

| # | פרוסה | ענף | תלות | הערה |
|---|---|---|---|---|
| 1 | יישור מיצוב בדוקס (audience ב-README/דוקס; ארכוב reseller) **בלי מספרי tier** | `claude/refocus-docs-audience` | - | להפריד מספרי tier ל-Slice 4 כדי לא להפעיל numeric audit מוקדם |
| 2 | קופי קהל יעד (Landing + UseCases + translations) | `claude/refocus-audience-copy` | - | אין סיכון schema; לשמור `i18n-key-count`; להריץ `check-brand-copy` |
| 3 | wedge ל-MVP (הרחבת `wedgeMode` + `DEFAULT_MODE` + CTA/route ב-Landing) | `claude/refocus-wedge` | תלוי C1 | אם C1=(ב) `differentiate-only` -> כמעט אפס שינוי קוד |
| 4 | קריסת tiers בשכבת התצוגה (pricingTiers/tier.ts לפי C2 + PaywallModal + מטריצת פיצ'רים + Landing/Plans/PricingEntry) **+ יישור `manifest.ts`+README+financials** | `claude/refocus-pricing` | תלוי C2 | **הפרוסה הרגישה ל-audits** (identity+numeric). לעדכן manifest+README יחד |
| 5 | תשלום לפי החלטה B: (א) חיווט `request-beta-access` ל-CTA paid; או (ב) `create-checkout` חד-מדרגתי + הקמת Stripe | `claude/refocus-checkout` | אחרי 4 | payments -> תמיד ענף+PR |
| 6 | (רק אם C2=(ב)) migration להסרת `'business'` מ-`valid_tier` + מיפוי נתונים | `claude/refocus-tier-migration` | אחרי 4, אימות schema | migration+RLS -> ענף+PR; פעולה לאישור מפורש |

---

## השפעה על audits (מה צריך לעדכן כדי שלא יישבר)

| שומר סף | מתי נוגעים בו | פעולה נדרשת |
|---|---|---|
| `npm run typecheck` / `npm run lint` | כל פרוסת קוד | אפס שגיאות/warnings |
| `npm test` (~4,750) | כל פרוסה | לעדכן טסטים שנשענים על 3 tiers / מודולי wedge |
| `npm run consistency:numeric` | פרוסות 4 + 1-של-מחירים | לעדכן `manifest.ts` (claim `tier-business-price-ils`) **יחד** עם README; אם נמחק קוד -> ספירות engine/page/component משתנות (לכן מעדיפים נעילה ולא מחיקה) |
| `npm run consistency:identity` | פרוסה 4 (אם C2=(ב)) | tier union חייב להתאים לצרכנים + ל-DB CHECK |
| `consistency:behavioral` / `provenance` | D (אם נוגעים ב-claims עם `source.quote`) | לעדכן את ה-manifest/quote המתאים |
| `npm run check:no-em-dash` | כל קופי/דוקס | אסור em-dash (`-` בלבד) |
| `check-brand-locked.sh` / `check-brand-copy.sh` | פרוסה 2 (מיצוב/מותג) | ליישר לקופי המותג |
| `check-hygiene-baseline.sh` | כל פרוסת קוד | `safeStorage`/`logger`/בלי `any` |
| `npm run build` | כל פרוסה | כולל `check:no-em-dash` |

---

## נספח - מצאי שנסרק (עוגני ראיות)

- **מנועים**: 128 קבצי `.ts` ב-`src/engine` (55 בשם `*Engine*.ts`). מודולים (לפי שם קובץ, ללא טסטים): differentiate 14/3,843; pricing 17/4,851; wizard 8/3,046; retention 10/1,508; sales 4/1,025.
- **wedge**: `src/lib/wedgeMode.ts` (+`WedgeGuard`, `LockedModuleScreen`, `AppSidebar`, `wedgeTelemetry`, `AdminWedge`). מודים חד-מודולריים בלבד כיום.
- **תמחור**: `src/lib/pricingTiers.ts` + `src/types/tier.ts` (שניהם `free|pro|business`). 10 קבצים צורכים `useFeatureGate`.
- **תשלום**: edge functions `create-checkout`, `customer-portal`, `stripe-webhook`, `purchase-credits`. `PaywallModal` -> `create-checkout`; `Profile` -> `customer-portal`.
- **DB tier**: `profiles.tier` + `valid_tier CHECK` (`20260409_005`), `tier_audit_log` (`20260423_001`), `subscription_status` + RPC `process_stripe_tier_change` (`20260423_008`). 51 migrations.
- **waitlist**: `request-beta-access` + `beta_waitlist` (`20260427_001`).
- **referral**: `referralEngine.ts` + `ReferralDashboard.tsx` + `referral.vm.ts` = refer-a-friend (לא reseller).
- **reseller**: דוקס בלבד (`docs/consultant-reseller-program.md` + סעיף README). 0 `reseller` בקוד.
- **i18n**: ~1,530 קריאות `tx(`; `src/i18n/translations.ts`.
- **audits**: `scripts/consistency/manifest.ts` נועל בין השאר `tier-pro-price-ils=129`, `tier-business-price-ils=299`, `trial-days`, וספירות engine/agent/migration/edge-fn/component/page/hook/i18n/archetype/loop/parameter.
