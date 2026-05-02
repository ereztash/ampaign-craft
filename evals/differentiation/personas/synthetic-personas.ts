// ═══════════════════════════════════════════════
// 20 Synthetic Personas — Differentiation Validation
//
// Each persona is a fully-populated DifferentiationFormData plus metadata
// (archetype, bias, segment, expectedFailureMode). The harness runs every
// persona through generateDifferentiation() and red-teams the output.
//
// Distribution (per plan):
//   4× b2b_services, 4× b2c_services,
//   3× b2b_saas,    3× b2c_creator,
//   3× edge_case,   3× failure_state
//
// Personas are NOT a sample; they are a stress-test set. Each one carries
// an expectedFailureMode hypothesis the harness can verify.
// ═══════════════════════════════════════════════

import type { DifferentiationFormData } from "@/types/differentiation";
import type { SyntheticPersona } from "./personaSchema";

// ─── Defaults builder ──────────────────────────────────────────────────────

function baseFormData(overrides: Partial<DifferentiationFormData>): DifferentiationFormData {
  const base: DifferentiationFormData = {
    businessName: "",
    industry: "",
    targetMarket: "b2b",
    companySize: "solo",
    currentPositioning: "",
    topCompetitors: [],
    priceRange: "mid",
    claimExamples: [],
    customerQuote: "",
    lostDealReason: "",
    negativeReviewTheme: "",
    returnReason: "",
    competitorOverlap: "",
    ashamedPains: [],
    hiddenValues: [],
    internalFriction: "",
    competitorArchetypes: [],
    buyingCommitteeMap: [],
    influenceNetwork: [],
    decisionLatency: "weeks",
    decisionSpeed: "days",
    discoveryChannels: [],
    confirmedTradeoffs: [],
    selectedHybridCategory: "",
  };
  return { ...base, ...overrides };
}

// ─── 20 personas ────────────────────────────────────────────────────────────

export const personas: SyntheticPersona[] = [
  // ── 4× B2B services ──
  {
    id: "p01",
    archetype: "יועץ הייטק עצמאי, 12K/חודש, מוכר 'אסטרטגיה' אבל לא יודע להסביר במה הוא שונה",
    segment: "b2b_services",
    bias: "dunning_kruger",
    expectedFailureMode: "engine יחזיר משפט גנרי כי כל הקלטים שלו מופשטים",
    formData: baseFormData({
      businessName: "Sharon Strategy",
      industry: "ייעוץ אסטרטגי להייטק",
      targetMarket: "b2b_smb",
      currentPositioning: "אני עוזר לחברות לצמוח",
      topCompetitors: ["McKinsey", "BCG ישראל", "יועצים עצמאיים"],
      priceRange: "premium",
      claimExamples: [
        { claim: "מנוסה", evidence: "", verified: false, gap: "אין case study" },
        { claim: "תוצאות מוכחות", evidence: "עזרתי ל-3 חברות לגייס", verified: false, gap: "אין מספרים" },
      ],
      customerQuote: "שרון יודע לשאול את השאלות הנכונות",
      lostDealReason: "החברה בחרה McKinsey",
      hiddenValues: [{ valueId: "legitimacy", score: 5, signal: "לקוחות מבקשים case studies" }],
    }),
  },
  {
    id: "p02",
    archetype: "מאמן עסקי, 8K/חודש, יודע מה הוא עושה אבל לא יודע איך לקרוא לזה",
    segment: "b2b_services",
    expectedFailureMode: "המנגנון שלו ('שיחות שבועיות') לא נראה ייחודי בשטח",
    formData: baseFormData({
      businessName: "Yael Coach",
      industry: "אימון בעלי עסקים קטנים",
      targetMarket: "b2b_smb",
      currentPositioning: "מאמנת עסקית עם תוכנית 12 שבועות",
      topCompetitors: ["מאמנים עצמאיים", "תוכניות online", "BNI"],
      priceRange: "mid",
      claimExamples: [
        { claim: "10 שנות ניסיון", evidence: "10 שנים בתפקידי ניהול", verified: true, gap: "" },
        { claim: "תוצאות מהירות", evidence: "לקוח X הכפיל הכנסות תוך 6 חודשים", verified: true, gap: "מקרה אחד" },
      ],
      customerQuote: "יעל גורמת לי לעשות מה שאני יודעת שצריך לעשות",
      lostDealReason: "מחיר",
      hiddenValues: [
        { valueId: "empathy", score: 5, signal: "" },
        { valueId: "narrative", score: 4, signal: "" },
      ],
    }),
  },
  {
    id: "p03",
    archetype: "סוכנות שיווק קטנה, 5 עובדים, מפסידה למחיר באופן שיטתי",
    segment: "b2b_services",
    bias: "sunk_cost",
    expectedFailureMode: "מנסה להתחרות במחיר במקום למצוא מנגנון",
    formData: baseFormData({
      businessName: "Pixel Agency",
      industry: "סוכנות שיווק דיגיטלי",
      targetMarket: "b2b_smb",
      companySize: "2-10",
      currentPositioning: "סוכנות full-service במחיר נגיש",
      topCompetitors: ["סוכנויות פרילנס", "Wix Studio", "סוכנויות גדולות"],
      priceRange: "budget",
      claimExamples: [
        { claim: "מחירים נגישים", evidence: "20% מתחת לממוצע השוק", verified: true, gap: "" },
        { claim: "צוות מנוסה", evidence: "", verified: false, gap: "אין מספרי שנים" },
      ],
      lostDealReason: "מתחרה הציע ב-30% פחות",
      negativeReviewTheme: "איטיים בתגובות",
      hiddenValues: [{ valueId: "cognitive_ease", score: 3, signal: "" }],
    }),
  },
  {
    id: "p04",
    archetype: "עו\"ד מסחרי, מתמחה בהיי-טק, מתחרה מול משרדים גדולים",
    segment: "b2b_services",
    expectedFailureMode: "הרגולציה והגבלות הפרסום מקשות על משפט בידול 'תוקפני'",
    formData: baseFormData({
      businessName: "Levin Law",
      industry: "ייעוץ משפטי לחברות הייטק",
      targetMarket: "b2b",
      companySize: "2-10",
      currentPositioning: "משרד בוטיק עם זמן תגובה מהיר",
      topCompetitors: ["משרדים גדולים", "מחלקות משפטיות פנים-חברתיות"],
      priceRange: "premium",
      claimExamples: [
        { claim: "תגובה תוך 24 שעות", evidence: "SLA חוזי", verified: true, gap: "" },
        { claim: "מומחיות בעסקאות M&A", evidence: "85 עסקאות ב-2024", verified: true, gap: "" },
      ],
      customerQuote: "אני מקבל תשובה ביום אצל לוין, ושבוע במשרד הגדול",
      lostDealReason: "הלקוח הלך עם משרד שכבר עבד עם המשקיע",
      hiddenValues: [
        { valueId: "risk", score: 5, signal: "" },
        { valueId: "autonomy", score: 4, signal: "" },
      ],
    }),
  },

  // ── 4× B2C services ──
  {
    id: "p05",
    archetype: "מטפלת רגשית, קהל לא ברור, מנסה למשוך 'נשים בנות 30-50'",
    segment: "b2c_services",
    bias: "confirmation",
    expectedFailureMode: "ICP רחב מדי → engine יחזיר משפט גנרי",
    formData: baseFormData({
      businessName: "Sigal Therapy",
      industry: "טיפול רגשי / קוגניטיבי",
      targetMarket: "b2c_service",
      currentPositioning: "טיפול רגשי לנשים מתמודדות",
      topCompetitors: ["פסיכולוגים בקופה", "אפליקציות mental health", "מטפלות אחרות"],
      priceRange: "mid",
      claimExamples: [
        { claim: "גישה אינטגרטיבית", evidence: "", verified: false, gap: "" },
        { claim: "מקשיבה באמת", evidence: "ביקורות גוגל 4.9", verified: true, gap: "" },
      ],
      customerQuote: "אצל סיגל אני מרגישה נראית",
      negativeReviewTheme: "לא מספיק מובנה",
      returnReason: "לא רואות תוצאות מהירות",
      hiddenValues: [{ valueId: "empathy", score: 5, signal: "" }],
    }),
  },
  {
    id: "p06",
    archetype: "קליניקה אסתטית, תלויה בהמלצות, פחד להעלות מחיר",
    segment: "b2c_services",
    expectedFailureMode: "המסר 'איכות' לא יחזיק מול קליניקה זולה יותר",
    formData: baseFormData({
      businessName: "Glow Clinic",
      industry: "קליניקה אסתטית — בוטוקס וחומצה",
      targetMarket: "b2c_service",
      companySize: "2-10",
      currentPositioning: "קליניקה איכותית בלב תל אביב",
      topCompetitors: ["קליניקות זולות", "רופאים פרטיים", "מרפאות אסתטיות גדולות"],
      priceRange: "premium",
      claimExamples: [
        { claim: "רופא בכיר", evidence: "מומחה ברפואה אסתטית", verified: true, gap: "" },
        { claim: "תוצאות טבעיות", evidence: "", verified: false, gap: "אין before/after מובנה" },
      ],
      customerQuote: "אני סומכת רק על ד\"ר רוזן",
      negativeReviewTheme: "יקר",
      hiddenValues: [
        { valueId: "risk", score: 5, signal: "" },
        { valueId: "aesthetic", score: 5, signal: "" },
      ],
    }),
  },
  {
    id: "p07",
    archetype: "סטודיו לעיצוב גרפי, סולו, תחרות מחיר משתולל",
    segment: "b2c_services",
    bias: "sunk_cost",
    expectedFailureMode: "אין USP מעבר ל-'אני יותר טובה'",
    formData: baseFormData({
      businessName: "Studio Maya",
      industry: "עיצוב גרפי לעסקים קטנים",
      targetMarket: "b2c_service",
      currentPositioning: "מעצבת גרפית עם תיק עבודות מגוון",
      topCompetitors: ["Fiverr", "Canva", "מעצבים אחרים"],
      priceRange: "mid",
      claimExamples: [
        { claim: "מהירות", evidence: "מספקת תוך שבוע", verified: true, gap: "" },
        { claim: "אסטרטגיה ולא רק עיצוב", evidence: "", verified: false, gap: "" },
      ],
      lostDealReason: "Fiverr ב-50 דולר",
      negativeReviewTheme: "יקר מדי",
      hiddenValues: [{ valueId: "aesthetic", score: 4, signal: "" }],
    }),
  },
  {
    id: "p08",
    archetype: "מאמן כושר אישי, פרסונאלי, רוצה לעלות מ-1-on-1 ל-תוכנית קבוצתית",
    segment: "b2c_services",
    expectedFailureMode: "engine לא יודע שזה pivot, יציע משפט שמתאים ל-1-on-1",
    formData: baseFormData({
      businessName: "Train With Tomer",
      industry: "אימון כושר אישי וקבוצתי",
      targetMarket: "b2c_service",
      currentPositioning: "מאמן אישי + תוכנית 12 שבועות חדשה",
      topCompetitors: ["חדרי כושר", "אפליקציות כושר", "מאמנים עצמאיים"],
      priceRange: "mid",
      claimExamples: [
        { claim: "תוצאות תוך 12 שבועות", evidence: "85% מהלקוחות מגיעים ליעד", verified: true, gap: "" },
        { claim: "תוכנית ייחודית", evidence: "פיתחתי בעצמי", verified: false, gap: "" },
      ],
      customerQuote: "תומר לא נותן לי לוותר",
      hiddenValues: [
        { valueId: "narrative", score: 5, signal: "" },
        { valueId: "belonging", score: 4, signal: "" },
      ],
    }),
  },

  // ── 3× B2B SaaS / tech ──
  {
    id: "p09",
    archetype: "SaaS startup B2B, 5 עובדים, ARR 200K, מתחרה ב-Notion/Asana",
    segment: "b2b_saas",
    expectedFailureMode: "engine לא ידע להתמודד עם המתחרים הרחבים האלה",
    formData: baseFormData({
      businessName: "Flowtask",
      industry: "ניהול משימות לצוותי הנדסה",
      targetMarket: "b2b_smb",
      companySize: "2-10",
      currentPositioning: "Linear ל-startups קטנים",
      topCompetitors: ["Linear", "Notion", "Asana", "Jira"],
      priceRange: "mid",
      claimExamples: [
        { claim: "מהיר פי 3 מ-Jira", evidence: "benchmark פנימי", verified: false, gap: "" },
        { claim: "אינטגרציה עם GitHub", evidence: "8 webhooks built-in", verified: true, gap: "" },
      ],
      customerQuote: "סוף סוף משהו שלא מאכיל אותנו פיצ'רים",
      lostDealReason: "החברה בחרה Linear כי כבר משתמשים בו",
      hiddenValues: [
        { valueId: "cognitive_ease", score: 5, signal: "" },
        { valueId: "autonomy", score: 4, signal: "" },
      ],
    }),
  },
  {
    id: "p10",
    archetype: "DevTool, מתחרה ב-Datadog, מודל freemium",
    segment: "b2b_saas",
    expectedFailureMode: "המסר 'יותר זול' לא יחזיק מול ספק ארגוני",
    formData: baseFormData({
      businessName: "ObserveFast",
      industry: "Observability ל-Kubernetes",
      targetMarket: "b2b",
      companySize: "11-50",
      currentPositioning: "Datadog ל-engineers שאוהבים CLI",
      topCompetitors: ["Datadog", "Grafana Cloud", "New Relic"],
      priceRange: "mid",
      claimExamples: [
        { claim: "30% מהמחיר של Datadog", evidence: "pricing benchmark", verified: true, gap: "" },
        { claim: "open-core", evidence: "github 4.2K stars", verified: true, gap: "" },
      ],
      customerQuote: "ObserveFast גורם ל-Datadog להרגיש כבד",
      hiddenValues: [
        { valueId: "autonomy", score: 5, signal: "" },
        { valueId: "cognitive_ease", score: 4, signal: "" },
      ],
    }),
  },
  {
    id: "p11",
    archetype: "B2B AI tool, מנסה למכור 'AI assistant' לעסקים",
    segment: "b2b_saas",
    bias: "dunning_kruger",
    expectedFailureMode: "engine יחזיר משפט שדומה לכל product page של AI ב-2026",
    formData: baseFormData({
      businessName: "AiBoost",
      industry: "AI assistant לצוותי שירות לקוחות",
      targetMarket: "b2b_smb",
      companySize: "2-10",
      currentPositioning: "ה-Copilot של שירות לקוחות",
      topCompetitors: ["Intercom Fin", "Zendesk AI", "Custom GPT"],
      priceRange: "mid",
      claimExamples: [
        { claim: "מבוסס Claude", evidence: "API integration", verified: true, gap: "" },
        { claim: "מקטין זמן טיפול ב-40%", evidence: "מחקר פנימי, n=12", verified: false, gap: "" },
      ],
      lostDealReason: "החברה בחרה לבנות פנימית עם GPT-4",
      hiddenValues: [{ valueId: "legitimacy", score: 5, signal: "" }],
    }),
  },

  // ── 3× B2C ecommerce / creators ──
  {
    id: "p12",
    archetype: "מותג D2C אופנה, אינסטגרם-led, גודל קטן, גרפים יורדים",
    segment: "b2c_creator",
    expectedFailureMode: "המסר 'איכות' לא יחזיק מול Shein",
    formData: baseFormData({
      businessName: "Suri",
      industry: "אופנה D2C ישראלית",
      targetMarket: "b2c_ecommerce",
      companySize: "2-10",
      currentPositioning: "מותג אופנה ישראלי איכותי",
      topCompetitors: ["Shein", "Castro", "Zara", "מותגים מקומיים"],
      priceRange: "mid",
      decisionSpeed: "days",
      claimExamples: [
        { claim: "תפירה בארץ", evidence: "מפעל בקריית גת", verified: true, gap: "" },
        { claim: "סטוק קטן", evidence: "200 יחידות לדגם", verified: true, gap: "" },
      ],
      negativeReviewTheme: "מחיר מול Shein",
      returnReason: "לא תאם תיאור",
      hiddenValues: [
        { valueId: "self_expression", score: 5, signal: "" },
        { valueId: "guilt_free", score: 4, signal: "" },
      ],
    }),
  },
  {
    id: "p13",
    archetype: "יוצר תוכן Food, 80K עוקבים, רוצה למכור קורס",
    segment: "b2c_creator",
    expectedFailureMode: "engine לא ידע שהוא מנסה לעשות pivot מ-affiliate ל-product",
    formData: baseFormData({
      businessName: "Cooking with Maya",
      industry: "Food creator + קורס דיגיטלי",
      targetMarket: "b2c_creator",
      currentPositioning: "מתכונים בריאים שאף אחד לא מסביר נכון",
      topCompetitors: ["Goop", "Yair Recipe", "Yelena Lifestyle"],
      priceRange: "budget",
      decisionSpeed: "impulse",
      claimExamples: [
        { claim: "80K עוקבים", evidence: "Instagram analytics", verified: true, gap: "" },
        { claim: "מתכונים בלי גלוטן ובלי לקטוז", evidence: "כל הספר", verified: true, gap: "" },
      ],
      hiddenValues: [
        { valueId: "narrative", score: 5, signal: "" },
        { valueId: "belonging", score: 4, signal: "" },
      ],
    }),
  },
  {
    id: "p14",
    archetype: "מורה אונליין, מוכר 4 קורסים, ממיר נמוך",
    segment: "b2c_creator",
    expectedFailureMode: "יותר מדי הצעות → engine ידחוס משפט שלא מבחין ביניהן",
    formData: baseFormData({
      businessName: "Yossi Codes",
      industry: "קורסי תכנות אונליין",
      targetMarket: "b2c_creator",
      currentPositioning: "תכנות מאפס בעברית פשוטה",
      topCompetitors: ["Codecademy", "Udemy", "מורים פרטיים", "YouTube"],
      priceRange: "mid",
      claimExamples: [
        { claim: "בעברית", evidence: "כל הוידאו והקוד", verified: true, gap: "" },
        { claim: "פרויקט אמיתי", evidence: "כל קורס נגמר באתר", verified: true, gap: "" },
      ],
      lostDealReason: "לא ברור מה ההבדל בין הקורסים",
      hiddenValues: [{ valueId: "cognitive_ease", score: 5, signal: "" }],
    }),
  },

  // ── 3× edge cases ──
  {
    id: "p15",
    archetype: "סקפטי כלפי AI — חושב שכל מה ש-LLM יחזיר זה bullshit",
    segment: "edge_case",
    bias: "skeptic_of_ai",
    expectedFailureMode: "ידחה את ה-oneLiner לא משנה כמה הוא טוב",
    formData: baseFormData({
      businessName: "BetaSec",
      industry: "אבטחת סייבר לעסקים בינוניים",
      targetMarket: "b2b_smb",
      companySize: "2-10",
      currentPositioning: "מבדקי חדירה ידניים, לא אוטומטיים",
      topCompetitors: ["סורקי AI", "סוכנויות סייבר גדולות", "Bug bounty"],
      priceRange: "premium",
      claimExamples: [
        { claim: "ידני בלבד", evidence: "20 שעות מומחה לבדיקה", verified: true, gap: "" },
        { claim: "OSCP-certified", evidence: "תעודות הצוות", verified: true, gap: "" },
      ],
      customerQuote: "אני לא רוצה שסקריפט יבדוק לי את הרשת",
      hiddenValues: [
        { valueId: "legitimacy", score: 5, signal: "" },
        { valueId: "risk", score: 5, signal: "" },
      ],
    }),
  },
  {
    id: "p16",
    archetype: "מוצף — מילא את השאלון ב-3 דקות, רוב התשובות שטחיות",
    segment: "edge_case",
    bias: "overload",
    expectedFailureMode: "קלטים דלים → engine יחזיר משפט פושטני",
    formData: baseFormData({
      businessName: "Avi Plumbing",
      industry: "אינסטלציה",
      targetMarket: "b2c_service",
      currentPositioning: "אינסטלטור",
      topCompetitors: ["אינסטלטורים אחרים"],
      priceRange: "mid",
      claimExamples: [
        { claim: "מהיר", evidence: "", verified: false, gap: "" },
      ],
      customerQuote: "טוב",
      lostDealReason: "מחיר",
      hiddenValues: [],
    }),
  },
  {
    id: "p17",
    archetype: "מזלזל בשיווק — 'אני לא צריך משפט בידול, יש לי לקוחות'",
    segment: "edge_case",
    bias: "dunning_kruger",
    expectedFailureMode: "ה-ownership prompt יחזיר feels_mine=false כי האדם לא מאמין במהלך",
    formData: baseFormData({
      businessName: "Cohen Garage",
      industry: "מוסך לרכבים פרטיים",
      targetMarket: "b2c_service",
      companySize: "2-10",
      currentPositioning: "מוסך משפחתי 30 שנה במקום",
      topCompetitors: ["מוסכים מורשי יצרן", "מוסכים זולים"],
      priceRange: "mid",
      claimExamples: [
        { claim: "30 שנה במקום", evidence: "", verified: true, gap: "" },
        { claim: "לקוחות חוזרים", evidence: "85% מהלקוחות חוזרים", verified: true, gap: "" },
      ],
      customerQuote: "אצל כהן יודעים את הרכב שלי",
      hiddenValues: [
        { valueId: "narrative", score: 5, signal: "" },
        { valueId: "empathy", score: 5, signal: "" },
      ],
    }),
  },

  // ── 3× failure states ──
  {
    id: "p18",
    archetype: "קהל יעד לא ברור — מוכרת ל-'כל מי שצריך'",
    segment: "failure_state",
    expectedFailureMode: "engine יחזיר משפט נטול ICP",
    formData: baseFormData({
      businessName: "Lior Helps",
      industry: "ייעוץ עסקי כללי",
      targetMarket: "both",
      currentPositioning: "אני עוזרת לעסקים לגדול",
      topCompetitors: ["יועצים אחרים"],
      priceRange: "mid",
      claimExamples: [
        { claim: "ניסיון רב", evidence: "", verified: false, gap: "" },
      ],
      customerQuote: "ליאור עזרה לי",
      hiddenValues: [{ valueId: "empathy", score: 4, signal: "" }],
    }),
  },
  {
    id: "p19",
    archetype: "תחרות מחיר — כל המתחרים זולים יותר",
    segment: "failure_state",
    expectedFailureMode: "אין tradeoff מובנה → engine יציע 'איכות' (גנרי)",
    formData: baseFormData({
      businessName: "Tasty Catering",
      industry: "קייטרינג לאירועים פרטיים",
      targetMarket: "b2c_service",
      companySize: "2-10",
      currentPositioning: "קייטרינג איכותי לאירועים קטנים",
      topCompetitors: ["קייטרינג זול", "מסעדות עם משלוחים", "DIY"],
      priceRange: "premium",
      claimExamples: [
        { claim: "מנות בעבודת יד", evidence: "כל מנה מוכנה ביום האירוע", verified: true, gap: "" },
        { claim: "חומרי גלם premium", evidence: "ספקים ספציפיים", verified: true, gap: "" },
      ],
      lostDealReason: "מחיר — מתחרה ב-40% פחות",
      negativeReviewTheme: "יקר",
      hiddenValues: [{ valueId: "aesthetic", score: 5, signal: "" }],
    }),
  },
  {
    id: "p20",
    archetype: "תלות בהמלצות — כל הלקוחות מ-WhatsApp word-of-mouth",
    segment: "failure_state",
    expectedFailureMode: "אין discovery channel ברור → engine לא ידע איפה המשפט יופעל",
    formData: baseFormData({
      businessName: "Rachel Hairdresser",
      industry: "מספרת ביתית",
      targetMarket: "b2c_service",
      currentPositioning: "מספרת ביתית עם 12 שנות ניסיון",
      topCompetitors: ["סלוני יוקרה", "מספרות שכונה", "מעצבי שיער עצמאיים"],
      priceRange: "mid",
      decisionSpeed: "days",
      discoveryChannels: ["המלצות"],
      claimExamples: [
        { claim: "צבע מומחית", evidence: "12 שנים", verified: true, gap: "" },
      ],
      customerQuote: "כולם הולכים לרחל",
      hiddenValues: [
        { valueId: "belonging", score: 5, signal: "" },
        { valueId: "empathy", score: 4, signal: "" },
      ],
    }),
  },
];

// Convenience export for harness
export function getPersonas(): SyntheticPersona[] {
  return personas;
}
