# FunnelForge - תוכנית מיקוד (Refocus Plan)

> DISCOVERY הושלם. חמש ההכרעות ננעלו 2026-06-01. המסמך מוכן לביצוע.
> עודכן 2026-06-01 לאחר ניתוח דלתא C1 (ניתוק pricing<->tiers, ו-CTA snag).

## ההכרעות הסופיות (נעולות)

| מזהה | ההכרעה | הבחירה הנעולה |
|---|---|---|
| **C1** | היקף ה-wedge | `differentiate+pricing` (מוד חדש `offer-builder`). re-wire של ה-CTA הריק ב-`PricingEntry` הוא **חלק מהיקף הפרוסה**, לא תוספת. |
| **C2** | קריסת tiers | `'business'` נשאר **רדום** ב-DB+type. חיתוך בשכבת התצוגה/checkout בלבד. **אפס migration.** |
| **B** | תשלום | free-first על `beta_waitlist` הקיים. billing חי כ-fast-follow. |
| **A** | קהל/reseller | reseller -> עצמאי. ארכוב `consultant-reseller-program.md`; שמירת refer-a-friend. |
| **D/E** | model/proof | monthly-only במדרגה היחידה. social proof -> "Early Access" לא-מספרי. |

## תקציר מנהלים

- **ליבה לשמור**: בידול (~3,843 ש') + תמחור (~4,851 ש') = ה-wedge. בנוסף `InsightActionCard`/HITL, intake, מנועי Tier S, Auth, Free, refer-a-friend, `beta_waitlist`.
- **שומן לנעול/לדחות**: מכירות + שימור (נעולים ב-wedge), מדרגת Business + פיצ'ריה (רדומים), reseller (דוקס בלבד), billing חי (מאחורי waitlist).
- **סטטוס הכרעות**: כל החמש סגורות. אין החלטות פתוחות.
- **פרוסות**: 5 פעילות + migration נדחה. סדר חדש: wedge -> קופי -> tiers (מבודד) -> תשלום -> דוקס.

## ממצאי ניתוח דלתא C1 (מנעילים את ההכרעה)

1. **Q1 (heft)**: `differentiate-only` קיים כבר. `differentiate+pricing` = ~15-25 שורות ב-2-3 קבצים, 0 קבצים חדשים, 0 migration, 0 schema. חובה: ערך `MODE_LABELS` חדש ב-`AdminWedge.tsx` (אחרת `typecheck` נשבר על `Record<WedgeMode,...>`).
2. **Q2 (ניתוק)**: מודול ה-wedge של pricing (`PricingEntry` -> `PricingWizard`/`PricingIntelligenceTab`) **לא מייבא** `pricingTiers.ts`/`types/tier.ts`/`useFeatureGate`. הקובץ היחיד שמייבא tiers הוא `PricingPage.tsx` (מסך המנוי), שאינו חלק ממודול ה-wedge. **חשיפת ה-wedge מנותקת לחלוטין מקריסת ה-tiers (C2).**
3. **Q3 (audits)**: הדלתא נוגעת ב-**0 מתוך 6** ה-consistency audits (`grep wedge scripts/consistency` ריק). רק `typecheck`+טסט נוגעים. תקף כל עוד מסתירים ולא מוחקים.
4. **Q4 (עצמאיות)**: pricing הוא intent/input-driven, ללא תלות CRM/leads/pipeline (בניגוד ל-sales/retention). **סייג**: `funnelforge-plans` (ה-`result` ש-PricingEntry דורש) נכתב **רק ע"י `/wizard`**. לכן ב-wedge שמסתיר את wizard, המודול חייב לעמוד עצמאית -> זהו ה-re-wire שבהיקף הפרוסה.

---

## טבלה A - מיקוד וצמצום ל-MVP (wedge) [נעול]

| קובץ/אזור | מצב נוכחי | מצב מבוקש | סיבה | סיכון | סטטוס |
|---|---|---|---|---|---|
| `src/lib/wedgeMode.ts` | מודים חד-מודולריים; `DEFAULT_MODE="all"` | להוסיף `offer-builder` -> `["differentiate","pricing"]`; לתקן `getActiveWedgeLabel` לרב-מודולרי | C1 | נמוך (מרוכז) | Slice 1 |
| הפעלת ה-wedge | אין | `VITE_WEDGE_MODE=offer-builder` ב-`.env.example` (`DEFAULT_MODE` נשאר `all` כ-fallback בטוח) | להימנע מפליפ ברירת-מחדל מסוכן (תקרית prod עברה) | נמוך, הפיך | Slice 1 |
| `src/pages/AdminWedge.tsx` | `MODE_LABELS: Record<WedgeMode,...>` | להוסיף ערך ל-`offer-builder` (חובה ל-typecheck) | exhaustiveness | נמוך | Slice 1 |
| **`src/pages/PricingEntry.tsx:109`** | gate ל-`!result` עם CTA ל-`/wizard` | להציג את הוויזארד **עצמאית** כש-`wizard` נעול ב-wedge (לא dead-end) | `funnelforge-plans` נכתב רק ע"י `/wizard` | בינוני (UX) | **Slice 1 (בהיקף)** |
| `SalesEntry`, `RetentionEntry` + מנועיהם | חשופים | נעולים דרך wedge (לא נמחקים) | שומן לעצמאי טרום-לקוחות | נמוך, הפיך | Slice 1 (תוצאת ה-wedge) |

---

## טבלה B - שינוי קהל יעד / מיצוב [נעול: עצמאי במעבר]

| קובץ/אזור | מצב נוכחי | מצב מבוקש | סיבה | סיכון | סטטוס |
|---|---|---|---|---|---|
| `src/pages/Landing.tsx` | "בעלי עסקים ישראליים"; 5 מודולים; CTA ל-`/wizard` | מסר לעצמאי במעבר; להבליט בידול+תמחור; CTA לנתיב הפעיל | C1+קהל | נמוך CI | Slice 2 |
| `src/pages/UseCases.tsx` | דוגמאות SMB | פרסונות עצמאי (יועץ/מאמן/פרילנסר) | קהל | נמוך | Slice 2 |
| `src/i18n/translations.ts` (~1,530 `tx`) | "עסק/בעל עסק" | "עצמאי/מומחה/הצעה"; לשמור `tx` ו-`i18n-key-count` | קהל | בינוני (היקף) | Slice 2 |
| `src/lib/socialProofData.ts` | "+N בעלי עסקים" | "Early Access" לא-מספרי (E) | כנות pre-revenue | בינוני | Slice 2 |

> הקופי נכתב **אחרי** ה-wedge, כדי שיתאר את הנתיב שה-wedge חושף בפועל.

---

## טבלה C - קריסת tiers [נעול C2: רדום, שכבת תצוגה בלבד]

| קובץ/אזור | מצב נוכחי | מצב מבוקש | סיבה | סיכון | סטטוס |
|---|---|---|---|---|---|
| `src/lib/pricingTiers.ts` (`TIERS`) | free/pro/business | להציג free + מדרגה אחת; `'business'` **נשאר ב-union** רדום | C2 (בלי identity break) | בינוני | Slice 3 |
| `src/types/tier.ts` | 3 ids | ללא שינוי ל-union (נשאר תקף ל-DB CHECK) | identity audit נשאר ירוק | נמוך | Slice 3 |
| DB `profiles.tier` + `valid_tier CHECK` + RPC | `IN ('free','pro','business')` | **ללא נגיעה** (enum רדום) | אפס migration | אפס | - (נדחה) |
| `PaywallModal` + צרכני `useFeatureGate` + Landing/Plans/PricingEntry preview | gating ל-3 tiers; כרטיס "אמצעי" | להציג/למכור מדרגה אחת; מטריצת פיצ'רים free/paid | model | בינוני-גבוה | Slice 3 |
| `scripts/consistency/manifest.ts` + `README.md` + `financials.md` | נועל `tier-business-price-ils=299` | להסיר claim ה-business; ליישר מחיר המדרגה | אחרת `numeric` חוסם | גבוה (CI) | Slice 3 |

> **מודול ה-wedge של pricing מנותק מכל זה** (Q2). קריסת ה-tiers נוגעת רק במסך המנוי/paywall, לא בוויזארד התמחור.

---

## טבלה D - יישור מסמכים למציאות [נעול]

| קובץ/אזור | מצב מבוקש | סטטוס |
|---|---|---|
| `README.md` | קהל עצמאי, מדרגה אחת, pre-revenue/modeled, להסיר/לדחות reseller; ליישר ספירות+מחירים מול `manifest.ts` | Slice 3 (מספרים) + Slice 5 (טקסט) |
| `docs/financials.md` | לתקן drift קיים (₪99/₪249/20% -> תואם קוד); מדרגה אחת; pre-revenue | Slice 5 |
| `docs/consultant-reseller-program.md` | ארכוב/מסגור כ"ערוץ עתידי מוקפא" (A) | Slice 5 |
| `CLAUDE.md`, `CHOICES.md`, `docs/{business-baseline,market-research,competitor-research/*,prioritization,wedge-progress}.md` | יישור לקהל+model+wedge | Slice 5 |

---

## הכרעות (סגורות) - תיעוד הבחירה

- **A**: reseller לא ממומש בקוד (0 `reseller`, 3 `commission` ב-`src`); refer-a-friend (`referralEngine`) תואם עצמאי. -> שכתוב positioning בדוקס, עלות נמוכה.
- **B**: `create-checkout` בנוי אך דורש Stripe+מע"מ+webhook (נטל solo); `request-beta-access`+`beta_waitlist` כבר קיימים. -> free-first, billing fast-follow.
- **C1**: בידול+תמחור = שני הכאבים של "עצמאי במעבר ממומחיות לעסקה"; הדלתא זולה ומנותקת מ-C2. -> `offer-builder`.
- **C2**: `tier` נעול ב-DB CHECK + RPC + audit-log; הסרה אמיתית = migration מסוכן. -> רדום, שכבת תצוגה.
- **D/E**: פחות SKUs/קופי; כנות pre-revenue. -> monthly-only, Early Access.

### לאימות בזמן ביצוע (לא חוסם החלטה)
- לפני הסתמכות על enum רדום: לוודא שאין שורות `tier='business'` חיות בפרוד (אם יש - לטפל לפני הסרת המסך).
- לפני נעילת `offer-builder` כברירת מחדל בפרוד: validation ב-preview env (תקרית safeStorage היסטורית בפליפ default).

---

## סדר ביצוע (מעודכן - wedge קודם לקופי)

| # | פרוסה | ענף | audits רגישים | הערה |
|---|---|---|---|---|
| **1** | wedge `offer-builder` + `AdminWedge` + **re-wire CTA ב-`PricingEntry`** (עצמאי) | `claude/refocus-wedge` | אין (typecheck+טסט) | השינוי ההתנהגותי שקובע מה המשתמש רואה. ראשון. |
| 2 | קופי קהל (Landing/UseCases/translations) המתאר את הנתיב הפעיל | `claude/refocus-audience-copy` | brand-copy | אחרי שה-wedge נעול |
| 3 | קריסת tiers בשכבת התצוגה + יישור `manifest`+README+financials | `claude/refocus-pricing` | **identity + numeric** | **מבודד. אל תשלב. הרץ את כל 6 ה-audits עליו לבד.** |
| 4 | free-first: חיווט `request-beta-access` ל-CTA paid | `claude/refocus-waitlist` | אין | payments-adjacent -> ענף+PR |
| 5 | יישור דוקס (reseller->עצמאי, financials, README) | `claude/refocus-docs` | numeric/provenance אם נוגעים ב-claims | אחרון |
| - | (נדחה) migration להסרת `'business'` | - | identity | רק אם C2 ייפתח מחדש |

---

## השפעה על audits

- **Slice 3 (tiers) הוא היחיד הרגיש ל-consistency** (identity+numeric). מבודד; כל 6 ה-audits רצים עליו לבד לפני המשך.
- Slices 1/2/4/5: `typecheck` + `lint` + `test` + `build` (+`check:no-em-dash`, `brand`, `hygiene`). אין דלתא ב-numeric/identity.
- כלל-על: מסתירים ולא מוחקים -> ספירות `engine/page/component` יציבות -> `numeric` לא נשבר מהמיקוד.

---

## נספח - עוגני ראיות

- מנועים: 128 `.ts` (55 `*Engine*.ts`). מודולים: differentiate 14/3843, pricing 17/4851, wizard 8/3046, retention 10/1508, sales 4/1025.
- wedge: `wedgeMode.ts` (מודים חד-מודולריים), `WedgeGuard`, `LockedModuleScreen`, `AppSidebar`, `wedgeTelemetry`, `AdminWedge`. `getActiveWedgeLabel` לא בשימוש מחוץ ל-`wedgeMode.ts`.
- pricing wedge module: `PricingEntry` -> `PricingWizard`/`PricingIntelligenceTab`/`PricingWizardResults`. ללא import של tiers. `getLatestPlanResult` קורא `funnelforge-plans`, שנכתב רק ע"י `/wizard`.
- tiers ב-DB: `profiles.tier`+`valid_tier CHECK` (`20260409_005`), `tier_audit_log` (`20260423_001`), RPC `process_stripe_tier_change` (`20260423_008`).
- תשלום/waitlist: `create-checkout`/`customer-portal`/`stripe-webhook`; `request-beta-access`+`beta_waitlist` (`20260427_001`).
- reseller: דוקס בלבד. refer-a-friend: `referralEngine`/`ReferralDashboard`/`referral.vm`.
- audits: `manifest.ts` נועל `tier-pro-price-ils=129`, `tier-business-price-ils=299`, `trial-days`, וספירות. `grep wedge scripts/consistency` ריק.
- טסטים נוגעים: `src/pages/__tests__/PricingEntry.test.tsx` (היחיד שנוגע ב-wedge behavior).
