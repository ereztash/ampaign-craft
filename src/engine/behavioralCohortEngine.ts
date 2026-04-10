// ═══════════════════════════════════════════════
// Behavioral Cohort Engine
// Segments users into 12 pre-defined cohorts based on
// DISC primary × funnel maturity × pricing sensitivity.
// Enables cohort-specific playbooks and benchmarks.
// ═══════════════════════════════════════════════

import type { FormData } from "@/types/funnel";
import type { DISCProfile } from "./discProfileEngine";

export type CohortId =
  | "decisive_beginners"
  | "decisive_scalers"
  | "analytical_scalers"
  | "analytical_starters"
  | "community_builders"
  | "community_loyalists"
  | "visionary_storytellers"
  | "visionary_experimenters"
  | "price_sensitive_starters"
  | "premium_challengers"
  | "retention_optimizers"
  | "growth_hackers";

export interface CohortCharacteristic {
  label: { he: string; en: string };
  value: { he: string; en: string };
}

export interface CohortStrategy {
  title: { he: string; en: string };
  description: { he: string; en: string };
  expectedLift: string;
}

export interface BehavioralCohort {
  cohortId: CohortId;
  name: { he: string; en: string };
  size: number; // illustrative % of user base
  characteristics: CohortCharacteristic[];
  topPerformingStrategies: CohortStrategy[];
  avgMetrics: {
    conversionRate: string;
    ltv: string;
    churnRate: string;
  };
}

export interface CohortAssignment {
  primaryCohort: BehavioralCohort;
  secondaryCohort: BehavioralCohort | null;
  matchConfidence: number; // 0-100
  rationale: { he: string; en: string };
}

// ───────────────────────────────────────────────
// Cohort definitions
// ───────────────────────────────────────────────

const COHORTS: Record<CohortId, BehavioralCohort> = {
  decisive_beginners: {
    cohortId: "decisive_beginners",
    name: { he: "מתחילים החלטיים", en: "Decisive Beginners" },
    size: 14,
    characteristics: [
      { label: { he: "DISC", en: "DISC" }, value: { he: "D דומיננטי", en: "D dominant" } },
      { label: { he: "שלב", en: "Stage" }, value: { he: "מתחיל", en: "Beginner" } },
      { label: { he: "תקציב", en: "Budget" }, value: { he: "בינוני", en: "Medium" } },
    ],
    topPerformingStrategies: [
      {
        title: { he: "quick-win template pack", en: "Quick-win template pack" },
        description: { he: "תבניות מוכנות להרצה תוך 24 שעות", en: "Templates ready to launch in 24 hours" },
        expectedLift: "+28% activation",
      },
      {
        title: { he: "תוצאות תוך שבוע", en: "Results in a week" },
        description: { he: "הבטחת תוצאה מדידה תוך 7 ימים", en: "Promised measurable result within 7 days" },
        expectedLift: "+18% conversion",
      },
    ],
    avgMetrics: { conversionRate: "4.2%", ltv: "₪2,400", churnRate: "8%" },
  },
  decisive_scalers: {
    cohortId: "decisive_scalers",
    name: { he: "מרחיבים החלטיים", en: "Decisive Scalers" },
    size: 8,
    characteristics: [
      { label: { he: "DISC", en: "DISC" }, value: { he: "D + C משני", en: "D + C secondary" } },
      { label: { he: "שלב", en: "Stage" }, value: { he: "מרחיב", en: "Scaling" } },
      { label: { he: "תקציב", en: "Budget" }, value: { he: "גבוה", en: "High" } },
    ],
    topPerformingStrategies: [
      {
        title: { he: "Enterprise ROI dashboards", en: "Enterprise ROI dashboards" },
        description: { he: "מדדים בזמן אמת להחלטות מהירות", en: "Real-time KPIs for fast decisions" },
        expectedLift: "+36% retention",
      },
    ],
    avgMetrics: { conversionRate: "6.1%", ltv: "₪18,400", churnRate: "4%" },
  },
  analytical_scalers: {
    cohortId: "analytical_scalers",
    name: { he: "מרחיבים אנליטיים", en: "Analytical Scalers" },
    size: 11,
    characteristics: [
      { label: { he: "DISC", en: "DISC" }, value: { he: "C דומיננטי", en: "C dominant" } },
      { label: { he: "שלב", en: "Stage" }, value: { he: "מתקדם", en: "Advanced" } },
      { label: { he: "תקציב", en: "Budget" }, value: { he: "High-ticket", en: "High-ticket" } },
    ],
    topPerformingStrategies: [
      {
        title: { he: "Deep-dive whitepapers + ROI calculators", en: "Deep-dive whitepapers + ROI calculators" },
        description: { he: "תוכן נתונים-כבד עם כלי חישוב אינטראקטיבי", en: "Data-heavy content with interactive calculators" },
        expectedLift: "+31% qualified leads",
      },
    ],
    avgMetrics: { conversionRate: "3.8%", ltv: "₪32,000", churnRate: "3%" },
  },
  analytical_starters: {
    cohortId: "analytical_starters",
    name: { he: "אנליטיים מתחילים", en: "Analytical Starters" },
    size: 9,
    characteristics: [
      { label: { he: "DISC", en: "DISC" }, value: { he: "C דומיננטי", en: "C dominant" } },
      { label: { he: "שלב", en: "Stage" }, value: { he: "מתחיל", en: "Beginner" } },
      { label: { he: "תקציב", en: "Budget" }, value: { he: "נמוך", en: "Low" } },
    ],
    topPerformingStrategies: [
      {
        title: { he: "Step-by-step playbooks", en: "Step-by-step playbooks" },
        description: { he: "מדריכים מובנים עם נתונים מגבים", en: "Structured guides with data backing" },
        expectedLift: "+22% completion",
      },
    ],
    avgMetrics: { conversionRate: "3.1%", ltv: "₪1,800", churnRate: "11%" },
  },
  community_builders: {
    cohortId: "community_builders",
    name: { he: "בוני קהילה", en: "Community Builders" },
    size: 10,
    characteristics: [
      { label: { he: "DISC", en: "DISC" }, value: { he: "I/S משולב", en: "I/S blend" } },
      { label: { he: "מטרה", en: "Goal" }, value: { he: "נאמנות", en: "Loyalty" } },
      { label: { he: "תקציב", en: "Budget" }, value: { he: "בינוני", en: "Medium" } },
    ],
    topPerformingStrategies: [
      {
        title: { he: "קהילות סגורות + events חודשיים", en: "Private communities + monthly events" },
        description: { he: "קבוצת WhatsApp/Slack + ארוחה חודשית", en: "WhatsApp/Slack group + monthly meetup" },
        expectedLift: "+44% retention",
      },
    ],
    avgMetrics: { conversionRate: "3.4%", ltv: "₪5,200", churnRate: "5%" },
  },
  community_loyalists: {
    cohortId: "community_loyalists",
    name: { he: "נאמני קהילה", en: "Community Loyalists" },
    size: 7,
    characteristics: [
      { label: { he: "DISC", en: "DISC" }, value: { he: "S דומיננטי", en: "S dominant" } },
      { label: { he: "שלב", en: "Stage" }, value: { he: "שימור", en: "Retention" } },
      { label: { he: "תקציב", en: "Budget" }, value: { he: "בינוני-גבוה", en: "Medium-high" } },
    ],
    topPerformingStrategies: [
      {
        title: { he: "תוכנית הפניות (referral) מובנית", en: "Structured referral program" },
        description: { he: "תמריץ כפול — מזמין ומוזמן", en: "Double-sided incentive — referrer and referee" },
        expectedLift: "+38% new acquisitions",
      },
    ],
    avgMetrics: { conversionRate: "5.2%", ltv: "₪8,900", churnRate: "2%" },
  },
  visionary_storytellers: {
    cohortId: "visionary_storytellers",
    name: { he: "מספרי סיפורים", en: "Visionary Storytellers" },
    size: 9,
    characteristics: [
      { label: { he: "DISC", en: "DISC" }, value: { he: "I דומיננטי", en: "I dominant" } },
      { label: { he: "מטרה", en: "Goal" }, value: { he: "מודעות", en: "Awareness" } },
      { label: { he: "תקציב", en: "Budget" }, value: { he: "בינוני", en: "Medium" } },
    ],
    topPerformingStrategies: [
      {
        title: { he: "Brand documentary series", en: "Brand documentary series" },
        description: { he: "סדרת וידאו סיפורי-מותג ברשתות", en: "Brand-story video series on social" },
        expectedLift: "+62% brand recall",
      },
    ],
    avgMetrics: { conversionRate: "2.4%", ltv: "₪3,100", churnRate: "9%" },
  },
  visionary_experimenters: {
    cohortId: "visionary_experimenters",
    name: { he: "נסיינים חזוניים", en: "Visionary Experimenters" },
    size: 6,
    characteristics: [
      { label: { he: "DISC", en: "DISC" }, value: { he: "I + D משני", en: "I + D secondary" } },
      { label: { he: "תעשייה", en: "Industry" }, value: { he: "טכנולוגיה", en: "Tech" } },
      { label: { he: "תקציב", en: "Budget" }, value: { he: "גבוה", en: "High" } },
    ],
    topPerformingStrategies: [
      {
        title: { he: "Bold creative testing (weekly iteration)", en: "Bold creative testing (weekly iteration)" },
        description: { he: "3-5 וריאנטים בשבוע, החלטות מהירות", en: "3-5 variants per week, fast decisions" },
        expectedLift: "+41% CAC efficiency",
      },
    ],
    avgMetrics: { conversionRate: "4.5%", ltv: "₪11,200", churnRate: "6%" },
  },
  price_sensitive_starters: {
    cohortId: "price_sensitive_starters",
    name: { he: "רגישי מחיר מתחילים", en: "Price-Sensitive Starters" },
    size: 12,
    characteristics: [
      { label: { he: "DISC", en: "DISC" }, value: { he: "מעורב", en: "Mixed" } },
      { label: { he: "תקציב", en: "Budget" }, value: { he: "נמוך מאוד", en: "Very low" } },
      { label: { he: "שלב", en: "Stage" }, value: { he: "מתחיל", en: "Beginner" } },
    ],
    topPerformingStrategies: [
      {
        title: { he: "Freemium + upgrade path ברור", en: "Freemium + clear upgrade path" },
        description: { he: "הנגשה חינם עם שדרוג צעד-אחר-צעד", en: "Free access with step-by-step upgrade" },
        expectedLift: "+26% free-to-paid",
      },
    ],
    avgMetrics: { conversionRate: "1.9%", ltv: "₪650", churnRate: "18%" },
  },
  premium_challengers: {
    cohortId: "premium_challengers",
    name: { he: "מתחרי פרימיום", en: "Premium Challengers" },
    size: 5,
    characteristics: [
      { label: { he: "DISC", en: "DISC" }, value: { he: "D + C", en: "D + C" } },
      { label: { he: "תקציב", en: "Budget" }, value: { he: "High-ticket", en: "High-ticket" } },
      { label: { he: "מטרה", en: "Goal" }, value: { he: "מכירות פרימיום", en: "Premium sales" } },
    ],
    topPerformingStrategies: [
      {
        title: { he: "Invite-only onboarding + concierge", en: "Invite-only onboarding + concierge" },
        description: { he: "חוויה מותאמת אישית לכל לקוח חדש", en: "Personalized experience for every new customer" },
        expectedLift: "+52% high-ticket close rate",
      },
    ],
    avgMetrics: { conversionRate: "7.8%", ltv: "₪54,000", churnRate: "2%" },
  },
  retention_optimizers: {
    cohortId: "retention_optimizers",
    name: { he: "ממטבי שימור", en: "Retention Optimizers" },
    size: 5,
    characteristics: [
      { label: { he: "DISC", en: "DISC" }, value: { he: "S + C", en: "S + C" } },
      { label: { he: "מטרה", en: "Goal" }, value: { he: "שימור", en: "Retention" } },
      { label: { he: "שלב", en: "Stage" }, value: { he: "בוגר", en: "Mature" } },
    ],
    topPerformingStrategies: [
      {
        title: { he: "Churn prediction + proactive outreach", en: "Churn prediction + proactive outreach" },
        description: { he: "זיהוי מוקדם + מעורבות יזומה", en: "Early detection + proactive engagement" },
        expectedLift: "+29% churn reduction",
      },
    ],
    avgMetrics: { conversionRate: "5.8%", ltv: "₪14,500", churnRate: "3%" },
  },
  growth_hackers: {
    cohortId: "growth_hackers",
    name: { he: "האקרי צמיחה", en: "Growth Hackers" },
    size: 4,
    characteristics: [
      { label: { he: "DISC", en: "DISC" }, value: { he: "D + I", en: "D + I" } },
      { label: { he: "תעשייה", en: "Industry" }, value: { he: "Tech/eCommerce", en: "Tech/eCommerce" } },
      { label: { he: "שלב", en: "Stage" }, value: { he: "מתקדם", en: "Advanced" } },
    ],
    topPerformingStrategies: [
      {
        title: { he: "Viral loops + referral mechanics", en: "Viral loops + referral mechanics" },
        description: { he: "כל משתמש חדש מביא 1.3 משתמשים נוספים", en: "Each new user brings 1.3 more users" },
        expectedLift: "+2.1x growth rate",
      },
    ],
    avgMetrics: { conversionRate: "4.9%", ltv: "₪9,800", churnRate: "7%" },
  },
};

// ───────────────────────────────────────────────
// Assignment logic
// ───────────────────────────────────────────────

function inferBudgetTier(formData: FormData): "low" | "medium" | "high" {
  const budget = (formData.budgetRange ?? "").toString().toLowerCase();
  if (/low|0-|1000|small|starter/.test(budget)) return "low";
  if (/high|enterprise|50000|25000|large|scale/.test(budget)) return "high";
  return "medium";
}

function inferMaturity(formData: FormData): "beginner" | "scaling" | "advanced" {
  const level = (formData.experienceLevel ?? "").toString().toLowerCase();
  if (level === "beginner") return "beginner";
  if (level === "advanced") return "advanced";
  return "scaling";
}

export function assignToCohort(
  formData: FormData,
  discProfile: DISCProfile,
  healthScore?: number,
  churnRisk?: number,
): CohortAssignment {
  const budgetTier = inferBudgetTier(formData);
  const maturity = inferMaturity(formData);
  const primary = discProfile.primary;
  const goal = formData.mainGoal;

  let cohortId: CohortId;
  let confidence = 70;

  // Budget-driven rules first (strong signal)
  if (budgetTier === "low" && maturity === "beginner") {
    cohortId = "price_sensitive_starters";
    confidence = 82;
  } else if (budgetTier === "high" && (primary === "D" || primary === "C")) {
    cohortId = maturity === "scaling" ? "decisive_scalers" : "premium_challengers";
    confidence = 85;
  } else if (primary === "C" && maturity === "advanced") {
    cohortId = "analytical_scalers";
    confidence = 88;
  } else if (primary === "C") {
    cohortId = "analytical_starters";
    confidence = 78;
  } else if ((primary === "I" || primary === "S") && goal === "loyalty") {
    cohortId = primary === "S" ? "community_loyalists" : "community_builders";
    confidence = 83;
  } else if (primary === "I" && goal === "awareness") {
    cohortId = "visionary_storytellers";
    confidence = 80;
  } else if (primary === "I" && budgetTier === "high") {
    cohortId = "visionary_experimenters";
    confidence = 76;
  } else if (primary === "D" && maturity === "beginner") {
    cohortId = "decisive_beginners";
    confidence = 84;
  } else if ((churnRisk ?? 0) > 60 || goal === "loyalty") {
    cohortId = "retention_optimizers";
    confidence = 74;
  } else {
    cohortId = "growth_hackers";
    confidence = 68;
  }

  const primaryCohort = COHORTS[cohortId];

  // Secondary — closest runner up by DISC fallback
  const secondaryId = findSecondary(cohortId, discProfile);
  const secondaryCohort = secondaryId ? COHORTS[secondaryId] : null;

  const rationale = {
    he: `DISC ${primary} + שלב ${maturity} + תקציב ${budgetTier} → קוהורט ${primaryCohort.name.he}`,
    en: `DISC ${primary} + ${maturity} stage + ${budgetTier} budget → ${primaryCohort.name.en} cohort`,
  };

  return { primaryCohort, secondaryCohort, matchConfidence: confidence, rationale };
}

function findSecondary(primary: CohortId, disc: DISCProfile): CohortId | null {
  const discFallbacks: Record<string, CohortId> = {
    D: "growth_hackers",
    I: "visionary_storytellers",
    S: "community_builders",
    C: "analytical_scalers",
  };
  const fallback = discFallbacks[disc.primary];
  return fallback && fallback !== primary ? fallback : null;
}

export function getCohortRecommendations(cohortId: CohortId): CohortStrategy[] {
  return COHORTS[cohortId]?.topPerformingStrategies ?? [];
}

export function getAllCohorts(): BehavioralCohort[] {
  return Object.values(COHORTS);
}

export function getCohort(cohortId: CohortId): BehavioralCohort | undefined {
  return COHORTS[cohortId];
}
