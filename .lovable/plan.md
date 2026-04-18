## Goal

Add the business contact details (phone, physical address, business name/ID) and a clear refund/cancellation policy required by Israeli payment processors (סולק/clearing) for site approval. All info must be reachable from every page.

## Information needed from you (will ask in next step if not provided)

The actual business details — these are placeholders right now and you must supply real values:

- Legal business name (ח.פ. /)
- Business / VAT ID number 318854676
- Physical address התנאים 5 רמת גן 
- Public phone number 052-4545963
- Public email [Erez2812345@gmail.com](mailto:Erez2812345@gmail.com)
- I'll add the structure now using clear placeholders (e.g. `[]`, `[ח.פ. 318854676]`) so you can swap them in one place.

## Plan

### 1. New page: `/refund-policy` (תקנון ביטולים והחזרים)

Bilingual (HE/EN) page modeled after existing `Terms.tsx`. Content per Israeli Consumer Protection Law (חוק הגנת הצרכן) for digital services / SaaS subscriptions:

- **זכות ביטול עסקה** — 14 ימים מיום העסקה לעסקת מכר מרחוק (סעיף 14ג).
- **שירות מתמשך (מנוי)** — אפשרות ביטול בכל עת; חיוב יחסי עד מועד הביטול.
- **דמי ביטול** — 5% או ₪100, הנמוך מביניהם (כחוק).
- **אופן הביטול** — דרך עמוד התמיכה / אימייל / טלפון (כל הערוצים ייפורטו).
- **החזר כספי** — תוך 14 ימי עסקים לאמצעי התשלום המקורי.
- **חריגים** — שירותים שכבר ניתנו במלואם (דוחות שהורדו וכו') לפי החוק.
- **יצירת קשר לביטול** — טלפון, אימייל, כתובת פיזית מופיעים בראש העמוד.

### 2. New page: `/contact` (יצירת קשר) — או הרחבת `/support`

Add a dedicated **Business Info** card at the top of the existing Support page (and a new `/contact` route alias) containing:

- שם עסק רשמי + ח.פ./ע.מ.
- כתובת פיזית מלאה
- טלפון (קליק-לחיוג: `tel:`)
- אימייל (`mailto:`)
- שעות פעילות
- קישור לתקנון ביטולים

Keep the existing feedback form below.

### 3. Global Footer (most important for סולק approval)

Create `src/components/Footer.tsx` and mount it inside `AppShell` so it appears on **every** page (CommandCenter, Dashboard, Wizard, Pricing, etc.). Footer contains:

- שם עסק + ח.פ.
- כתובת פיזית (קצרה)
- טלפון + אימייל (קליק-לחיוג / mailto)
- קישורים: **תקנון ביטולים** · **תנאי שימוש** · **מדיניות פרטיות** · **יצירת קשר**
- קישור bilingual, RTL-aware (`dir="auto"`, `me-`/`ms-` utilities)

This satisfies the סולק requirement that contact details + refund policy appear on **every** page.

### 4. Wire up routes & links

- `App.tsx`: add lazy route `path="refund-policy"` → `<RefundPolicy />`.
- `App.tsx`: add `path="contact"` → reuse Support (or create dedicated Contact page).
- `Terms.tsx`: add link to refund policy in the "Termination" section.
- `Privacy.tsx`: leave as-is (already linked from footer).

### 5. Constants file

Create `src/lib/businessInfo.ts` exporting all business details (name, ID, address, phone, email, hours) so footer / contact / refund pages all read from one source. Easy to update later.

### 6. Single placeholder source

All business detail strings will use placeholders like `[שם עסק רשמי]` until you provide real values, so the legal pages render with clear "fill-in" markers (not fake info).

## Files to create

- `src/lib/businessInfo.ts`
- `src/components/Footer.tsx`
- `src/pages/legal/RefundPolicy.tsx`
- `src/pages/Contact.tsx` (thin wrapper over Support, or extend Support)

## Files to modify

- `src/App.tsx` — add routes for `/refund-policy` and `/contact`
- `src/components/AppShell.tsx` — mount `<Footer />` at bottom
- `src/pages/Support.tsx` — add Business Info card on top
- `src/pages/legal/Terms.tsx` — link to refund policy

## After approval — I'll ask you for

1. Real business name + ח.פ./ע.מ.
2. Physical address
3. Phone number
4. Business hours
5. Which payment processor (Tranzila / CardCom / Meshulam / Stripe...) — some have specific extra requirements (e.g. CardCom wants logo + clear price page).