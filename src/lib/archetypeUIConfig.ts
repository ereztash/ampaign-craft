// ═══════════════════════════════════════════════
// Archetype UI Configs — 5 persona-driven UI configurations
// Each config defines sidebar order, tab priorities, density,
// CTA tone, and prominent modules for its archetype.
// ═══════════════════════════════════════════════

import type { ArchetypeId, ArchetypeUIConfig, PersonalityProfile } from "@/types/archetype";

// ═══════════════════════════════════════════════
// CONFIG DEFINITIONS
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
// PERSONALITY PROFILES — one per archetype
// Each profile includes regulatory focus, processing style,
// core motivation, primary frictions, and friction-mapped pipeline.
// Every pipeline step is traceable to a behavioral science source.
// ═══════════════════════════════════════════════

const STRATEGIST_PROFILE: PersonalityProfile = {
  regulatoryFocus: "prevention",
  processingStyle: "systematic",
  coreMotivation: "Minimize risk through comprehensive understanding before acting",
  primaryFrictions: [
    {
      id: "uncertainty_aversion",
      label: "Uncertainty Aversion",
      source: "Pavlou & Fygenson 2006; Prospect Theory",
    },
    {
      id: "cognitive_overload",
      label: "Cognitive Overload",
      source: "Sweller 1988 CLT — oversimplification hides nuance",
    },
    {
      id: "regulatory_mismatch",
      label: "Regulatory Mismatch",
      source: "Higgins 2000 FIT — gain-framed CTAs feel ungrounded",
    },
  ],
  pipeline: [
    {
      routePath: "/data",
      label: { he: "חבר נתונים", en: "Connect Data" },
      frictionReason: {
        he: "נתונים קודם ממלאים את צורך הוודאות — כל שלב הבא הופך להוכחה",
        en: "Data first satisfies your certainty need — everything downstream becomes evidence",
      },
      frictionClass: "uncertainty_aversion",
      completionKey: "funnelforge-data-sources",
    },
    {
      routePath: "/differentiate",
      label: { he: "הגדר בידול", en: "Define Differentiation" },
      frictionReason: {
        he: "שכבת הוכחה תחרותית הופכת כל אסטרטגיה לניתנת להגנה",
        en: "Competitive proof layer makes all subsequent strategy defensible",
      },
      frictionClass: "cognitive_overload",
      completionKey: "funnelforge-differentiation-result",
    },
    {
      routePath: "/wizard",
      label: { he: "בנה תוכנית", en: "Build Plan" },
      frictionReason: {
        he: "התוכנית מבוססת נתונים ובידול — לא גנרית",
        en: "Plan grounded in data + differentiation, not generic",
      },
      frictionClass: "uncertainty_aversion",
      completionKey: "funnelforge-plans",
    },
    {
      routePath: "/strategy",
      label: { he: "מפת אסטרטגיה", en: "Strategy Canvas" },
      frictionReason: {
        he: "תמונה אסטרטגית שלמה — טבלאות, מדדים, אינדיקטורי הפסד",
        en: "Complete strategic picture in analytical form — tables, metrics, loss indicators",
      },
      frictionClass: "cognitive_overload",
    },
    {
      routePath: "/dashboard",
      label: { he: "אמת את התוכנית", en: "Validate Plan" },
      frictionReason: {
        he: "נקודת בדיקה: סקור מדדים ואשר שהתוכנית נכונה",
        en: "Validation checkpoint: review metrics, confirm the plan is sound",
      },
      frictionClass: "uncertainty_aversion",
    },
    {
      routePath: "/pricing",
      label: { he: "תמחור אסטרטגי", en: "Strategic Pricing" },
      frictionReason: {
        he: "משימה שיטתית עשירה בנתונים; החלטות תמחור מונחות אסטרטגיה",
        en: "Data-heavy systematic task; strategy-informed pricing decisions",
      },
      frictionClass: "cognitive_overload",
    },
    {
      routePath: "/retention",
      label: { he: "שמר לקוחות", en: "Retain Customers" },
      frictionReason: {
        he: "מניעת הפסד תואמת מיקוד מניעה; צריכה הקשר אסטרטגי קודם",
        en: "Loss prevention aligns with prevention focus; needs strategy context first",
      },
      frictionClass: "regulatory_mismatch",
    },
  ],
};

const OPTIMIZER_PROFILE: PersonalityProfile = {
  regulatoryFocus: "promotion",
  processingStyle: "systematic",
  coreMotivation: "Maximize efficiency through measurement and continuous iteration",
  primaryFrictions: [
    {
      id: "momentum_loss",
      label: "Momentum Loss",
      source: "Bandura 1977 SST; Hamari 2014 — no improvement metrics kills motivation",
    },
    {
      id: "cognitive_overload",
      label: "Cognitive Overload",
      source: "Sweller 1988 — irrelevant data, not data volume, is the overload",
    },
    {
      id: "regulatory_mismatch",
      label: "Regulatory Mismatch",
      source: "Higgins 2000 FIT — loss-framing feels defeatist when optimizing",
    },
  ],
  pipeline: [
    {
      routePath: "/dashboard",
      label: { he: "ראה מצב נוכחי", en: "See Current State" },
      frictionReason: {
        he: "ראה מצב נוכחי מיד — בסיס הייחוס לכל אופטימיזציה",
        en: "See current state immediately — baseline for all optimization",
      },
      frictionClass: "momentum_loss",
    },
    {
      routePath: "/data",
      label: { he: "חבר נתונים", en: "Connect Data" },
      frictionReason: {
        he: "יותר נתונים = יותר מדדים = יותר משטח לאופטימיזציה",
        en: "More data = more metrics = more optimization surface",
      },
      frictionClass: "cognitive_overload",
      completionKey: "funnelforge-data-sources",
    },
    {
      routePath: "/wizard",
      label: { he: "בנה תוכנית", en: "Build Plan" },
      frictionReason: {
        he: "תוכנית עשירה במדדים שהאופטימייזר יכול לבנות עליהם בנצ'מרק",
        en: "Plan rich with metrics the optimizer can benchmark against",
      },
      frictionClass: "momentum_loss",
      completionKey: "funnelforge-plans",
    },
    {
      routePath: "/retention",
      label: { he: "הפחת נטישה", en: "Reduce Churn" },
      frictionReason: {
        he: "הפחתת נטישה = המדד בעל המינוף הגבוה ביותר; מצטבר לאורך זמן",
        en: "Churn reduction = highest-leverage metric; compounds over time",
      },
      frictionClass: "momentum_loss",
    },
    {
      routePath: "/pricing",
      label: { he: "מטב תמחור", en: "Optimize Pricing" },
      frictionReason: {
        he: "אופטימיזציית ARPU היא פעילות ממוקדת-רווח טבעית",
        en: "ARPU optimization is a natural gain-framed activity",
      },
      frictionClass: "regulatory_mismatch",
    },
    {
      routePath: "/strategy",
      label: { he: "לוח בקרה", en: "Strategy Canvas" },
      frictionReason: {
        he: "כל המדדים ביחד — זהה את יעדי האופטימיזציה הבאים",
        en: "All metrics together — identify the next optimization targets",
      },
      frictionClass: "cognitive_overload",
    },
    {
      routePath: "/differentiate",
      label: { he: "בדל עצמך", en: "Differentiate" },
      frictionReason: {
        he: "בידול הוא מנוף אופטימיזציה, לא עבודת זהות; צריך חשיבה יצירתית",
        en: "Differentiation is an optimization lever, not identity work; needs creative thinking",
      },
      frictionClass: "cognitive_overload",
      completionKey: "funnelforge-differentiation-result",
    },
  ],
};

const PIONEER_PROFILE: PersonalityProfile = {
  regulatoryFocus: "promotion",
  processingStyle: "heuristic",
  coreMotivation: "Build something meaningful from a vision, fast",
  primaryFrictions: [
    {
      id: "choice_overload",
      label: "Choice Overload",
      source: "Iyengar & Lepper 2000 — too many options paralyze the vision",
    },
    {
      id: "narrative_dissonance",
      label: "Narrative Dissonance",
      source: "Escalas 2004 NRT — data-heavy interfaces feel cold",
    },
    {
      id: "momentum_loss",
      label: "Momentum Loss",
      source: "Bandura 1977; Thaler 1981 — not creating immediately kills creative energy",
    },
  ],
  pipeline: [
    {
      routePath: "/wizard",
      label: { he: "בנה תוכנית", en: "Build Plan" },
      frictionReason: {
        he: "ערוץ את ההתלהבות היצירתית לפלט לפני שניתוח יבלום אותה",
        en: "Channel creative enthusiasm into output before analysis dampens it",
      },
      frictionClass: "momentum_loss",
      completionKey: "funnelforge-plans",
    },
    {
      routePath: "/differentiate",
      label: { he: "גלה זהות", en: "Discover Identity" },
      frictionReason: {
        he: "עבודת זהות — 'מה מייחד אותי' — נרטיב קודם לנתונים",
        en: "Identity work — 'what makes me special' — narrative-first",
      },
      frictionClass: "narrative_dissonance",
      completionKey: "funnelforge-differentiation-result",
    },
    {
      routePath: "/strategy",
      label: { he: "מפת אסטרטגיה", en: "Strategy Canvas" },
      frictionReason: {
        he: "פלט קונקרטי מארגן ומפחית את הקהות מפני הלוח הריק",
        en: "Concrete output organizes thinking and reduces blank-canvas overwhelm",
      },
      frictionClass: "choice_overload",
    },
    {
      routePath: "/ai",
      label: { he: "קבל הדרכה", en: "Get AI Guidance" },
      frictionReason: {
        he: "הנחיה נרטיבית מותאמת; עצות בפורמט סיפור ולא דאשבורד",
        en: "Personalized narrative guidance; story-framed advice",
      },
      frictionClass: "narrative_dissonance",
      completionKey: "funnelforge-coach-messages",
    },
    {
      routePath: "/sales",
      label: { he: "פתח מכירות", en: "Develop Sales" },
      frictionReason: {
        he: "פלט מוחשי וממוקד-פעולה שמשמר מומנטום",
        en: "Tangible action-oriented output maintaining momentum",
      },
      frictionClass: "momentum_loss",
    },
    {
      routePath: "/dashboard",
      label: { he: "ראה תוצאות", en: "See Results" },
      frictionReason: {
        he: "אנליטיקה אחרי יצירה — הדאשבורד מאוכלס ומשמעותי, לא ריק",
        en: "Analytics after creation — dashboard is populated and meaningful, not empty",
      },
      frictionClass: "narrative_dissonance",
    },
    {
      routePath: "/data",
      label: { he: "חבר נתונים", en: "Connect Data" },
      frictionReason: {
        he: "הכי פחות נרטיבי; החלוץ רואה ערך דרך הנכסים שיצר",
        en: "Least narratively resonant; pioneer now sees value through created assets",
      },
      frictionClass: "narrative_dissonance",
      completionKey: "funnelforge-data-sources",
    },
  ],
};

const CONNECTOR_PROFILE: PersonalityProfile = {
  regulatoryFocus: "prevention",
  processingStyle: "heuristic",
  coreMotivation: "Strengthen customer relationships and community through authentic care",
  primaryFrictions: [
    {
      id: "relational_distance",
      label: "Relational Distance",
      source: "Haidt 2012 MFT; Buttle 2004 — transactional language betrays relationships",
    },
    {
      id: "choice_overload",
      label: "Choice Overload",
      source: "Iyengar & Lepper 2000 — too many options without relational context",
    },
    {
      id: "uncertainty_aversion",
      label: "Uncertainty Aversion",
      source: "Higgins 1997 vigilance — uncertainty about customer happiness",
    },
  ],
  pipeline: [
    {
      routePath: "/retention",
      label: { he: "שמר לקוחות", en: "Retain Customers" },
      frictionReason: {
        he: "הזהות הליבה היא טיפוח לקוחות — מאמת את תפיסת העולם",
        en: "Core identity is customer care — validates worldview, sets relational frame",
      },
      frictionClass: "relational_distance",
    },
    {
      routePath: "/ai",
      label: { he: "שוחח עם AI", en: "Talk to AI Coach" },
      frictionReason: {
        he: "הנחיה חמה ומותאמת; מרגיש כמו שיחה ולא דאשבורד",
        en: "Warm personalized guidance; feels like conversation, not a dashboard",
      },
      frictionClass: "relational_distance",
      completionKey: "funnelforge-coach-messages",
    },
    {
      routePath: "/wizard",
      label: { he: "בנה תוכנית", en: "Build Plan" },
      frictionReason: {
        he: "תוכנית דרך עדשת טיפוח לקוחות; זרימה פרוגרסיבית שלב אחד",
        en: "Plan viewed through customer-care lens; single-step progressive flow",
      },
      frictionClass: "choice_overload",
      completionKey: "funnelforge-plans",
    },
    {
      routePath: "/strategy",
      label: { he: "מפת אסטרטגיה", en: "Strategy Canvas" },
      frictionReason: {
        he: "בדיקת בטיחות למיקוד מניעה; עכשיו יש הקשר שימור",
        en: "Safety check for prevention-focused; now has retention context",
      },
      frictionClass: "uncertainty_aversion",
    },
    {
      routePath: "/sales",
      label: { he: "שיחות לקוחות", en: "Customer Conversations" },
      frictionReason: {
        he: "ממוסגר כ'מדריכי שיחה עם לקוחות'; הקשר יחסי נוצר",
        en: "Reframed as 'customer conversation guides'; relational context established",
      },
      frictionClass: "relational_distance",
    },
    {
      routePath: "/differentiate",
      label: { he: "גלה ייחוד", en: "Discover Uniqueness" },
      frictionReason: {
        he: "'מה מייחד את מערכת היחסים שלנו עם לקוחות' — גילוי יחסי",
        en: "'What makes our customer relationship unique' — relational discovery",
      },
      frictionClass: "choice_overload",
      completionKey: "funnelforge-differentiation-result",
    },
    {
      routePath: "/dashboard",
      label: { he: "אמת בריאות", en: "Validate Health" },
      frictionReason: {
        he: "אימות סופי: מדדי לקוחות בריאים",
        en: "Final validation: customer metrics healthy",
      },
      frictionClass: "uncertainty_aversion",
    },
  ],
};

const CLOSER_PROFILE: PersonalityProfile = {
  regulatoryFocus: "promotion",
  processingStyle: "heuristic",
  coreMotivation: "Close deals and drive revenue with maximum velocity",
  primaryFrictions: [
    {
      id: "temporal_friction",
      label: "Temporal Friction",
      source: "Cialdini 1984; Gong.io 2019 — every second between intent and execution is a lost deal",
    },
    {
      id: "choice_overload",
      label: "Choice Overload",
      source: "Fasolo 2007; Lincoln 2014 — multiple options slow the close",
    },
    {
      id: "momentum_loss",
      label: "Momentum Loss",
      source: "Thaler 1981 hyperbolic discounting — for closers, momentum IS urgency",
    },
  ],
  pipeline: [
    {
      routePath: "/sales",
      label: { he: "סגור עסקאות", en: "Close Deals" },
      frictionReason: {
        he: "גישה ישירה לכלי סגירה — כל קליק שנחסך הוא עסקה שנשמרת",
        en: "Zero-depth access to closing tools — every click saved is a deal preserved",
      },
      frictionClass: "temporal_friction",
    },
    {
      routePath: "/pricing",
      label: { he: "הכן תמחור", en: "Prepare Pricing" },
      frictionReason: {
        he: "תמחור הוא חוסם העסקה #1; הסגרן צריך לדעת את המספרים שלו",
        en: "Pricing is the #1 deal blocker; closer needs to know their numbers",
      },
      frictionClass: "temporal_friction",
    },
    {
      routePath: "/wizard",
      label: { he: "קבל פלייבוק", en: "Get Playbook" },
      frictionReason: {
        he: "'תן לי את הפלייבוק' — פלט אחד ברור, ללא הרהורים",
        en: "'Give me the playbook' — one clear output, no deliberation",
      },
      frictionClass: "choice_overload",
      completionKey: "funnelforge-plans",
    },
    {
      routePath: "/differentiate",
      label: { he: "זיהוי יתרון", en: "Competitive Advantage" },
      frictionReason: {
        he: "תחמושת תחרותית: 'מה לומר כדי לנצח אותם'",
        en: "Competitive ammunition: 'what to say to beat them'",
      },
      frictionClass: "choice_overload",
      completionKey: "funnelforge-differentiation-result",
    },
    {
      routePath: "/strategy",
      label: { he: "דאשבורד עסקאות", en: "Deal Dashboard" },
      frictionReason: {
        he: "לוח בקרה לעסקאות, לא כלי תכנון — בדיקה מהירה",
        en: "Quick-reference deal dashboard, not a planning tool",
      },
      frictionClass: "momentum_loss",
    },
    {
      routePath: "/dashboard",
      label: { he: "מדדי מהירות", en: "Velocity Metrics" },
      frictionReason: {
        he: "מדדי מהירות עסקאות בלבד; פעל קודם, נתח אחר כך",
        en: "Deal-velocity metrics only; act first, analyze later",
      },
      frictionClass: "momentum_loss",
    },
    {
      routePath: "/data",
      label: { he: "עקוב אוטומטית", en: "Track Automatically" },
      frictionReason: {
        he: "העדיפות הנמוכה ביותר; ממוסגר כ'עקוב אחר מהירות עסקאות אוטומטית'",
        en: "Lowest urgency; framed as 'track deal velocity automatically'",
      },
      frictionClass: "momentum_loss",
      completionKey: "funnelforge-data-sources",
    },
  ],
};

const ARCHETYPE_UI_CONFIGS: Record<ArchetypeId, ArchetypeUIConfig> = {
  // ─── The Strategist ───────────────────────────
  // Prevention + Systematic + Established
  // B2B, methodology-first, proof-heavy, risk-mitigating
  strategist: {
    archetypeId: "strategist",
    workspaceOrder: ["strategy", "dashboard", "data", "plans", "ai", "command", "crm"],
    modulesOrder: ["sales", "differentiate", "pricing", "retention", "wizard"],
    defaultTab: "analytics",
    tabPriorityOverrides: {
      analytics: 5,
      strategy: 8,
      brief: 10,
      planning: 12,
      sales: 15,
      retention: 20,
      content: 25,
      pricing: 30,
      branddna: 999,
    },
    dataAttribute: "strategist",
    informationDensity: "rich",
    ctaTone: "analytical",
    prominentModules: ["differentiation", "marketing"],
    label: { he: "האסטרטג", en: "The Strategist" },
    adaptationDescription: {
      he: "אתה בונה מתוך נתונים — סידרנו לך את הכלים בהתאם",
      en: "You build from data — we've arranged your tools accordingly",
    },
    personalityProfile: STRATEGIST_PROFILE,
  },

  // ─── The Optimizer ────────────────────────────
  // Promotion + Systematic + Scale  (also: cold-start default)
  // B2B SaaS, subscription, data-driven growth mindset
  optimizer: {
    archetypeId: "optimizer",
    workspaceOrder: ["dashboard", "data", "strategy", "plans", "ai", "command", "crm"],
    modulesOrder: ["retention", "pricing", "sales", "differentiate", "wizard"],
    defaultTab: "analytics",
    tabPriorityOverrides: {
      analytics: 5,
      retention: 8,
      pricing: 10,
      strategy: 12,
      sales: 15,
      brief: 18,
      content: 30,
      branddna: 999,
    },
    dataAttribute: "optimizer",
    informationDensity: "compact",
    ctaTone: "direct",
    prominentModules: ["retention", "pricing"],
    label: { he: "האופטימייזר", en: "The Optimizer" },
    adaptationDescription: {
      he: "אתה מוכוון שיפור — הדאשבורד שלך מחדד לנתונים הכי רלוונטיים",
      en: "You're improvement-focused — your dashboard is tuned to the most relevant data",
    },
    personalityProfile: OPTIMIZER_PROFILE,
  },

  // ─── The Pioneer ──────────────────────────────
  // Promotion + Heuristic/Systematic + Early
  // Brand/vision builder, aspirational, high dreamOutcome
  pioneer: {
    archetypeId: "pioneer",
    workspaceOrder: ["command", "ai", "strategy", "dashboard", "plans", "data", "crm"],
    modulesOrder: ["wizard", "differentiate", "sales", "pricing", "retention"],
    defaultTab: "strategy",
    tabPriorityOverrides: {
      strategy: 5,
      content: 8,
      sales: 12,
      planning: 15,
      pricing: 20,
      retention: 25,
      analytics: 30,
      stylome: 35,
      brief: 999,
    },
    dataAttribute: "pioneer",
    informationDensity: "standard",
    ctaTone: "inspirational",
    prominentModules: ["differentiation", "marketing", "sales"],
    label: { he: "החלוץ", en: "The Pioneer" },
    adaptationDescription: {
      he: "אתה בונה משהו חדש — הובלנו אותך ישר לבנייה",
      en: "You're building something new — we took you straight to building mode",
    },
    personalityProfile: PIONEER_PROFILE,
  },

  // ─── The Connector ────────────────────────────
  // Prevention + Heuristic + Relationship
  // Loyalty/retention focus, human-first, community-driven
  connector: {
    archetypeId: "connector",
    workspaceOrder: ["ai", "dashboard", "command", "strategy", "plans", "data", "crm"],
    modulesOrder: ["retention", "sales", "pricing", "differentiate", "wizard"],
    defaultTab: "retention",
    tabPriorityOverrides: {
      retention: 5,
      content: 8,
      strategy: 12,
      sales: 18,
      pricing: 22,
      analytics: 28,
      stylome: 30,
      planning: 35,
      brief: 999,
    },
    dataAttribute: "connector",
    informationDensity: "standard",
    ctaTone: "relational",
    prominentModules: ["retention"],
    label: { he: "המחבר", en: "The Connector" },
    adaptationDescription: {
      he: "הלקוחות שלך הם הלב — שמנו retention בקדמת הבמה",
      en: "Your customers are your heart — we put retention front and center",
    },
    personalityProfile: CONNECTOR_PROFILE,
  },

  // ─── The Closer ───────────────────────────────
  // Promotion + Heuristic + Sales velocity
  // High-ticket, direct sales, ROI-urgency, D-dominant
  closer: {
    archetypeId: "closer",
    workspaceOrder: ["command", "dashboard", "strategy", "plans", "ai", "data", "crm"],
    modulesOrder: ["sales", "pricing", "retention", "differentiate", "wizard"],
    defaultTab: "sales",
    tabPriorityOverrides: {
      sales: 5,
      pricing: 8,
      strategy: 12,
      brief: 18,
      retention: 15,
      analytics: 20,
      planning: 25,
      content: 30,
      branddna: 999,
    },
    dataAttribute: "closer",
    informationDensity: "compact",
    ctaTone: "urgency",
    prominentModules: ["sales", "pricing"],
    label: { he: "הסגרן", en: "The Closer" },
    adaptationDescription: {
      he: "אתה סוגר עסקאות — חישלנו לך את הנתיב הכי ישיר",
      en: "You close deals — we sharpened the most direct path for you",
    },
    personalityProfile: CLOSER_PROFILE,
  },
};

// ═══════════════════════════════════════════════
// ACCESSORS
// ═══════════════════════════════════════════════

export function getArchetypeUIConfig(archetypeId: ArchetypeId): ArchetypeUIConfig {
  return ARCHETYPE_UI_CONFIGS[archetypeId] ?? ARCHETYPE_UI_CONFIGS.optimizer;
}

export { ARCHETYPE_UI_CONFIGS };

// ═══════════════════════════════════════════════
// SIDEBAR REORDERING UTILITY
// ═══════════════════════════════════════════════

/**
 * Reorders an array of nav item IDs based on the archetype's preferred order.
 * Items not in the ordered list are appended at the end in their original order.
 */
export function reorderNavItems<T extends string>(
  items: T[],
  preferredOrder: T[],
): T[] {
  const orderMap = new Map(preferredOrder.map((id, i) => [id, i]));
  return [...items].sort((a, b) => {
    const ai = orderMap.has(a) ? orderMap.get(a)! : 9999;
    const bi = orderMap.has(b) ? orderMap.get(b)! : 9999;
    return ai - bi;
  });
}
