// ═══════════════════════════════════════════════
// scripts/persona-data.ts
//
// Three simulated personas used by persona-report.ts.
// Each persona carries a complete localStorage state so the runner
// can seed a fresh browser context and let the app behave exactly
// as it would for that user.
//
// Persona profiles:
//   דנה  — boutique B2C, time-pressed, marketing pain  → /wizard
//   אורי  — SaaS B2B, revenue-focused, sales pain       → /sales  (has CSV data)
//   מיכל — health coach, wants attention, product pain  → /differentiate
// ═══════════════════════════════════════════════

export interface LocalStorageState {
  [key: string]: unknown;
}

export interface PersonaAssertion {
  route: string;
  label: string;
  /** text / selector that SHOULD appear */
  expect?: string;
  /** text / selector that should NOT appear */
  expectAbsent?: string;
}

export interface Persona {
  id: string;
  name: string;
  title: string;
  color: string; // hex, for report styling
  need: "time" | "money" | "attention";
  pain: "marketing" | "sales" | "product" | "finance";
  routingTarget: string;
  promiseMinutes: number;
  surfacesToVisit: string[];
  assertions: PersonaAssertion[];
  localStorage: LocalStorageState;
}

// ─── Auth seed (shared) ────────────────────────────────────────────────────────

function authSeed(id: string, email: string, displayName: string) {
  return {
    "funnelforge-users": [
      {
        id,
        email,
        displayName,
        passwordHash: "irrelevant-in-seed",
        tier: "pro",
        role: "owner",
        createdAt: "2025-01-01T00:00:00.000Z",
      },
    ],
    "funnelforge-session": { userId: id, email },
    "funnelforge-auth-version": "v2",
  };
}

// ─── Plan builder helper ───────────────────────────────────────────────────────

function makePlan(id: string, name: string, formData: object, savedAt: string) {
  return {
    id,
    name,
    savedAt,
    result: {
      id: `result-${id}`,
      createdAt: savedAt,
      funnelName: { he: name, en: name },
      formData,
      stages: [
        {
          id: "awareness",
          name: { he: "מודעות", en: "Awareness" },
          budgetPercent: 40,
          channels: [],
          description: { he: "בניית מודעות", en: "Build awareness" },
        },
        {
          id: "conversion",
          name: { he: "המרה", en: "Conversion" },
          budgetPercent: 60,
          channels: [],
          description: { he: "המרת לידים", en: "Convert leads" },
        },
      ],
      totalBudget: { min: 3000, max: 8000 },
      overallTips: [
        { he: "עקביות > נפח", en: "Consistency > volume" },
      ],
      hookTips: [],
      copyLab: {
        readerProfile: {
          level: 2,
          name: { he: "מודע לבעיה", en: "Problem aware" },
          description: { he: "יודע שיש בעיה, מחפש פתרון", en: "Knows the problem, seeks solution" },
          copyArchitecture: { he: "בעיה → הסבר → פתרון", en: "Problem → Insight → Solution" },
          principles: [],
        },
        formulas: [],
        writingTechniques: [],
      },
      kpis: [
        { name: { he: "שיעור המרה", en: "Conversion rate" }, target: "3-5%", confidence: "medium" },
      ],
    },
  };
}

// ─── Persona 1: דנה כהן ─────────────────────────────────────────────────────
// Boutique fashion owner. Time-pressed. Marketing is her biggest gap.
// Routing: time × marketing → /wizard (5-min promise).

const DANA_ID = "persona-dana-001";

export const dana: Persona = {
  id: DANA_ID,
  name: "דנה כהן",
  title: "בעלת בוטיק אופנה, רמת גן",
  color: "#e879a0",
  need: "time",
  pain: "marketing",
  routingTarget: "/wizard",
  promiseMinutes: 5,
  surfacesToVisit: ["/", "/wizard", "/differentiate", "/ai", "/pricing"],
  assertions: [
    { route: "/", label: "CommandCenter נטען", expectAbsent: "Something went wrong" },
    { route: "/wizard", label: "IntakePromiseHeader מוצג", expect: "5" },
    { route: "/wizard", label: "הכותרת מזכירה שיווק", expect: "שיווק" },
    { route: "/differentiate", label: "IntakePromiseHeader נעלם (לא היעד)", expectAbsent: "~5 min" },
    { route: "/ai", label: "AI Coach נטען ללא קריסה", expectAbsent: "Something went wrong" },
  ],
  localStorage: {
    ...authSeed(DANA_ID, "dana@boutique.co.il", "דנה כהן"),
    "funnelforge-intake-signal": {
      need: "time",
      pain: "marketing",
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      routing: {
        target: "/wizard",
        promise: {
          headline: {
            he: "תוך 5 דקות — תוכנית שיווק בסיסית עם 3 ערוצים",
            en: "In 5 minutes — a starter marketing plan with 3 channels",
          },
          kicker: {
            he: "מתחילים קטן ועקבי, לא גדול ומפוצץ.",
            en: "Small and consistent beats big and scattered.",
          },
          expectedMinutes: 5,
        },
      },
    },
    "funnelforge-plans": [
      makePlan(
        "dana-plan-1",
        "תוכנית שיווק עונת אביב",
        {
          businessField: "fashion",
          audienceType: "b2c",
          ageRange: [22, 45],
          interests: "אופנה, סטייל, עיצוב",
          productDescription: "בגדים ואקססוריז לאישה המודרנית",
          averagePrice: 350,
          salesModel: "oneTime",
          budgetRange: "low",
          mainGoal: "sales",
          existingChannels: ["instagram", "whatsapp"],
          experienceLevel: "beginner",
        },
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      ),
    ],
    "funnelforge-lang": "he",
  },
};

// ─── Persona 2: אורי לוי ──────────────────────────────────────────────────────
// SaaS B2B founder. Revenue-focused. Deals stall; needs sales fix.
// Routing: money × sales → /sales (25-min promise).
// Has imported CSV: 3-month campaign with declining CPL trend.

const ORI_ID = "persona-ori-002";

const oriImportedDataset = {
  id: "ori-dataset-1",
  name: "Q1 2025 Campaign Performance",
  importedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  source: "csv",
  schema: {
    detectedType: "campaign_performance",
    columns: [
      { name: "date", type: "date", role: "date" },
      { name: "CPL", type: "number", role: "metric" },
      { name: "CTR", type: "number", role: "metric" },
      { name: "conversions", type: "number", role: "metric" },
    ],
  },
  rows: [
    // January — good CPL
    { date: "2025-01-05", CPL: 42, CTR: 3.1, conversions: 18 },
    { date: "2025-01-12", CPL: 39, CTR: 3.4, conversions: 22 },
    { date: "2025-01-19", CPL: 45, CTR: 2.9, conversions: 16 },
    { date: "2025-01-26", CPL: 41, CTR: 3.2, conversions: 20 },
    // February — CPL starts rising
    { date: "2025-02-02", CPL: 51, CTR: 2.7, conversions: 14 },
    { date: "2025-02-09", CPL: 58, CTR: 2.4, conversions: 12 },
    { date: "2025-02-16", CPL: 63, CTR: 2.1, conversions: 11 },
    { date: "2025-02-23", CPL: 67, CTR: 1.9, conversions: 9 },
    // March — CPL high, CTR declining
    { date: "2025-03-02", CPL: 72, CTR: 1.7, conversions: 8 },
    { date: "2025-03-09", CPL: 78, CTR: 1.5, conversions: 7 },
    { date: "2025-03-16", CPL: 81, CTR: 1.4, conversions: 6 },
    { date: "2025-03-23", CPL: 85, CTR: 1.3, conversions: 5 },
  ],
};

export const ori: Persona = {
  id: ORI_ID,
  name: "אורי לוי",
  title: "מייסד SaaS B2B, תל אביב",
  color: "#3b82f6",
  need: "money",
  pain: "sales",
  routingTarget: "/sales",
  promiseMinutes: 25,
  surfacesToVisit: ["/", "/sales", "/wizard", "/ai", "/differentiate"],
  assertions: [
    { route: "/", label: "CommandCenter נטען", expectAbsent: "Something went wrong" },
    // Returning user with plans → IntakePromiseHeader is correctly suppressed
    { route: "/sales", label: "Sales content visible (returning user)", expect: "ארגז כלי מכירה" },
    { route: "/sales", label: "IntakePromiseHeader suppressed (has plans)", expectAbsent: "~25 min" },
    { route: "/wizard", label: "IntakePromiseHeader נעלם (לא היעד)", expectAbsent: "~25 min" },
    { route: "/ai", label: "AI Coach נטען", expectAbsent: "Something went wrong" },
  ],
  localStorage: {
    ...authSeed(ORI_ID, "ori@saas-startup.co.il", "אורי לוי"),
    "funnelforge-intake-signal": {
      need: "money",
      pain: "sales",
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      routing: {
        target: "/sales",
        promise: {
          headline: {
            he: "נבין למה לקוחות לא סוגרים — וכמה אתה משאיר על השולחן",
            en: "Let's see why deals stall — and how much you leave on the table",
          },
          kicker: {
            he: "כל התנגדות שלא טופלה היא מחיר שלא קיבלת.",
            en: "Every unhandled objection is revenue you didn't keep.",
          },
          expectedMinutes: 25,
        },
      },
    },
    "funnelforge-imported-data": [oriImportedDataset],
    "funnelforge-plans": [
      makePlan(
        "ori-plan-1",
        "SaaS Enterprise Go-To-Market",
        {
          businessField: "tech",
          audienceType: "b2b",
          ageRange: [30, 55],
          interests: "SaaS, enterprise, B2B",
          productDescription: "פלטפורמת ניהול תהליכים לצוותי operations",
          averagePrice: 3200,
          salesModel: "subscription",
          budgetRange: "medium",
          mainGoal: "leads",
          existingChannels: ["linkedin", "email"],
          experienceLevel: "intermediate",
        },
        new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      ),
      makePlan(
        "ori-plan-2",
        "Q2 Pipeline Acceleration",
        {
          businessField: "tech",
          audienceType: "b2b",
          ageRange: [28, 52],
          interests: "automation, ops",
          productDescription: "פלטפורמת ניהול תהליכים לצוותי operations",
          averagePrice: 3500,
          salesModel: "subscription",
          budgetRange: "high",
          mainGoal: "leads",
          existingChannels: ["linkedin", "content", "email"],
          experienceLevel: "advanced",
        },
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      ),
    ],
    "funnelforge-lang": "he",
  },
};

// ─── Persona 3: מיכל ברק ─────────────────────────────────────────────────────
// Health & wellness coach. Wants attention. Product is her pain — needs
// a clear differentiator among dozens of similar coaches.
// Routing: attention × product → /differentiate (15-min promise).
// Has a differentiation result + dugri stylome voice.

const MICHAL_ID = "persona-michal-003";

const michalDiffResult = {
  id: "michal-diff-1",
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  claimVerificationScore: 72,
  differentiationStrength: 68,
  formData: {
    businessName: "מיכל ברק קואצ'ינג",
    industry: "health",
    targetMarket: "b2c",
    companySize: "solo",
    currentPositioning: "מאמנת בריאות ותזונה",
    topCompetitors: ["מאמנת X", "מאמנת Y", "אפליקציית Z"],
    priceRange: "mid",
    claimExamples: [],
    customerQuote: "היא הבינה מה באמת עוצר אותי",
    lostDealReason: "",
    negativeReviewTheme: "יקר מידי לתחילת דרך",
    returnReason: "חוסר זמן",
    competitorOverlap: "כולן מציעות שגרת בוקר + תזונה",
    ashamedPains: ["לא אוהבת לבשל", "בוקר רע כל יום"],
    hiddenValues: [
      { valueId: "identity_shift", score: 85, label: { he: "שינוי זהות", en: "Identity shift" } },
      { valueId: "social_proof", score: 70, label: { he: "הוכחה חברתית", en: "Social proof" } },
    ],
    internalFriction: "לקוחות לא מאמינות שהן יצליחו",
    competitorArchetypes: [],
    confirmedTradeoffs: [],
    selectedHybridCategory: "coach",
    decisionLatency: "weeks",
    decisionSpeed: "days",
    discoveryChannels: ["instagram", "referral"],
  },
  verifiedClaims: [],
  gapAnalysis: [],
  hiddenValueProfile: [
    { valueId: "identity_shift", score: 85, label: { he: "שינוי זהות", en: "Identity shift" } },
  ],
  ashamedPainInsights: [],
  competitorMap: [],
  committeeNarratives: [],
  mechanismStatement: {
    oneLiner: {
      he: "מאמנת בריאות שמזהה את הסיבה הנסתרת שמונעת שינוי — ולא רק את ההרגלים",
      en: "Health coach who identifies the hidden reason change is blocked — not just habits",
    },
    antiStatement: "לא עוד שגרת בוקר גנרית",
    proof: "72% מהלקוחות שמרו על השינוי לאחר 6 חודשים",
    mechanism: "זיהוי חסמים רגשיים לפני בניית תוכנית",
  },
  tradeoffDeclarations: [
    {
      weakness: "לא מספקת תוכניות תזונה מפורטות",
      reframe: "כי שינוי אמיתי לא מגיע מרשימת מכולת — הוא מגיע מהפנים",
      accepted: true,
    },
  ],
  hybridCategory: { id: "transformation_coach", label: { he: "מאמנת שינוי", en: "Transformation coach" } },
  contraryMetrics: [],
  executiveSummary: {
    he: "מיכל מתמקדת בחסמים הרגשיים שמונעים שינוי, בניגוד לרוב המאמנים שמתמקדים בהרגלים בלבד.",
    en: "Michal focuses on the emotional blocks that prevent change, unlike most coaches who focus only on habits.",
  },
  nextSteps: [],
};

export const michal: Persona = {
  id: MICHAL_ID,
  name: "מיכל ברק",
  title: "מאמנת בריאות ורווחה, חיפה",
  color: "#10b981",
  need: "attention",
  pain: "product",
  routingTarget: "/differentiate",
  promiseMinutes: 15,
  surfacesToVisit: ["/", "/differentiate", "/wizard", "/ai", "/sales"],
  assertions: [
    { route: "/", label: "CommandCenter נטען", expectAbsent: "Something went wrong" },
    {
      route: "/differentiate",
      label: "IntakePromiseHeader attention-tone",
      // Headline: "נמצא מה גורם לאנשים לעצור ולהקשיב לך"
      expect: "גורם לאנשים",
    },
    {
      route: "/differentiate",
      label: "הכותרת מכוונת לבידול",
      // Kicker: "אם אתה לא מבדל, אתה רעש רקע."
      expect: "רעש רקע",
    },
    { route: "/wizard", label: "IntakePromiseHeader נעלם (לא היעד)", expectAbsent: "~15 min" },
    { route: "/ai", label: "AI Coach נטען", expectAbsent: "Something went wrong" },
  ],
  localStorage: {
    ...authSeed(MICHAL_ID, "michal@coaching.co.il", "מיכל ברק"),
    "funnelforge-intake-signal": {
      need: "attention",
      pain: "product",
      completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      routing: {
        target: "/differentiate",
        promise: {
          headline: {
            he: "נמצא מה גורם לאנשים לעצור ולהקשיב לך",
            en: "Let's find what makes people stop and listen",
          },
          kicker: {
            he: "אם אתה לא מבדל, אתה רעש רקע.",
            en: "If you don't differentiate, you're background noise.",
          },
          expectedMinutes: 15,
        },
      },
    },
    "funnelforge-differentiation-result": michalDiffResult,
    "funnelforge-stylome-voice": {
      register: "casual",
      dugriScore: 0.82,
      cognitiveStyle: "concrete",
      emotionalIntensity: "high",
      codeMixingIndex: 30,
    },
    "funnelforge-plans": [
      makePlan(
        "michal-plan-1",
        "קואצ'ינג בריאות — תוכנית שיווק",
        {
          businessField: "health",
          audienceType: "b2c",
          ageRange: [28, 50],
          interests: "בריאות, ספורט, תזונה",
          productDescription: "ליווי אישי לשינוי הרגלי בריאות — גוף ונפש",
          averagePrice: 1800,
          salesModel: "subscription",
          budgetRange: "medium",
          mainGoal: "awareness",
          existingChannels: ["instagram", "referral"],
          experienceLevel: "beginner",
        },
        new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      ),
    ],
    "funnelforge-lang": "he",
  },
};

export const ALL_PERSONAS: Persona[] = [dana, ori, michal];
