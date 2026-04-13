// ═══════════════════════════════════════════════
// Executive Risk Briefing Engine
// Cross-domain: Health Score × Churn Prediction × Pricing × Retention
// Produces a one-page C-suite brief: risks, NRR scenarios, action checklist
// ═══════════════════════════════════════════════

import { FunnelResult } from "@/types/funnel";
import { UserKnowledgeGraph } from "./userKnowledgeGraph";
import { calculateHealthScore, HealthScore } from "./healthScoreEngine";
import { assessChurnRisk, ChurnRiskAssessment } from "./churnPredictionEngine";

export const ENGINE_MANIFEST = {
  name: "executiveBriefEngine",
  reads: [
    "USER-form-*",
    "USER-knowledgeGraph-*",
    "USER-health-*",
    "USER-churn-*",
    "USER-pricing-*",
  ],
  writes: ["USER-brief-*"],
  stage: "deploy",
  isLive: true,
  parameters: ["Executive brief"],
} as const;

// ═══ TYPES ═══

export interface BilingualText {
  he: string;
  en: string;
}

export type TrafficLight = "green" | "amber" | "red";

function trafficLight(score: number): TrafficLight {
  if (score >= 70) return "green";
  if (score >= 40) return "amber";
  return "red";
}

export interface BriefRisk {
  id: string;
  category: "churn" | "revenue" | "market" | "operations";
  severity: TrafficLight;
  title: BilingualText;
  description: BilingualText;
  mitigationAction: BilingualText;
  timeHorizon: "30d" | "90d" | "6m";
}

export interface NRRScenario {
  label: BilingualText;
  nrr: number; // percent
  delta: number; // delta vs baseline
  description: BilingualText;
  color: TrafficLight;
}

export interface ActionItem {
  priority: 1 | 2 | 3;
  action: BilingualText;
  owner: BilingualText;
  timeframe: string;
  expectedImpact: BilingualText;
  done: boolean;
}

export interface ExecutiveBrief {
  id: string;
  generatedAt: string;
  /** Overall marketing health — feeds the gauge */
  healthScore: number;
  healthTier: "critical" | "needs-work" | "good" | "excellent";
  healthLight: TrafficLight;
  /** Always exactly 3 risks (padded with generic ones if needed) */
  topRisks: [BriefRisk, BriefRisk, BriefRisk];
  /** Three NRR scenarios: pessimistic / baseline / optimistic */
  nrrScenarios: [NRRScenario, NRRScenario, NRRScenario];
  /** Prioritized action checklist */
  actionChecklist: ActionItem[];
  /** One-paragraph plain language summary */
  executiveSummary: BilingualText;
}

export interface BuildExecutiveBriefInput {
  result: FunnelResult;
  ukg: UserKnowledgeGraph;
  healthScore?: HealthScore;
  churnRisk?: ChurnRiskAssessment;
}

// ═══ RISK CATALOG ═══

function buildChurnRisk(churn: ChurnRiskAssessment): BriefRisk {
  const light = trafficLight(100 - churn.riskScore);
  return {
    id: "churn-risk",
    category: "churn",
    severity: light,
    title: { he: "סיכון נטישת לקוחות", en: "Customer Churn Risk" },
    description: {
      he: `ציון סיכון הנטישה הנוכחי הוא ${churn.riskScore}/100 (${churn.riskTier}). NRR משוער: ${churn.nrrProjection.current}%.`,
      en: `Current churn risk score: ${churn.riskScore}/100 (${churn.riskTier}). Estimated NRR: ${churn.nrrProjection.current}%.`,
    },
    mitigationAction: {
      he: churn.retentionPlaybook[0]?.he ?? "הפעל תוכנית שימור לקוחות יזומה",
      en: churn.retentionPlaybook[0]?.en ?? "Activate a proactive customer retention program",
    },
    timeHorizon: "30d",
  };
}

function buildRevenueRisk(healthScore: HealthScore, ukg: UserKnowledgeGraph): BriefRisk {
  const conversionScore = healthScore.breakdown.find((b) => b.category === "conversion")?.score ?? 50;
  const light = trafficLight(conversionScore);
  return {
    id: "revenue-risk",
    category: "revenue",
    severity: light,
    title: { he: "סיכון הכנסה ומרווח", en: "Revenue & Margin Risk" },
    description: {
      he: `ציון המרה: ${conversionScore}/100. ${ukg.business.price > 0 ? `מחיר ממוצע: ₪${ukg.business.price}` : "מחיר לא הוגדר."}`,
      en: `Conversion score: ${conversionScore}/100. ${ukg.business.price > 0 ? `Average price: ₪${ukg.business.price}` : "Price not defined."}`,
    },
    mitigationAction: {
      he: "בנה מבנה תמחור עם שכבות ערך ברורות ואסטרטגיית anchor",
      en: "Build a tiered pricing structure with clear value layers and anchor strategy",
    },
    timeHorizon: "90d",
  };
}

function buildMarketRisk(ukg: UserKnowledgeGraph): BriefRisk {
  const channelCount = ukg.business.channels.length;
  const light: TrafficLight = channelCount >= 3 ? "green" : channelCount >= 2 ? "amber" : "red";
  return {
    id: "market-risk",
    category: "market",
    severity: light,
    title: { he: "סיכון שיווקי — ריכוז ערוצים", en: "Marketing Risk — Channel Concentration" },
    description: {
      he: `${channelCount} ערוץ${channelCount !== 1 ? "ים" : ""} פעיל${channelCount !== 1 ? "ים" : ""}. ${channelCount < 2 ? "תלות יתר בערוץ יחיד." : "פיזור סביר."}`,
      en: `${channelCount} active channel${channelCount !== 1 ? "s" : ""}. ${channelCount < 2 ? "Over-reliance on a single channel." : "Reasonable diversification."}`,
    },
    mitigationAction: {
      he: "הרחב ל-2+ ערוצים עם תקציב מינימלי לבדיקה (10% מהתקציב לניסויים)",
      en: "Expand to 2+ channels with minimal test budget (10% of budget for experiments)",
    },
    timeHorizon: "90d",
  };
}

const GENERIC_RISK: BriefRisk = {
  id: "generic-ops",
  category: "operations",
  severity: "amber",
  title: { he: "בשלות תפעולית", en: "Operational Maturity" },
  description: {
    he: "אין נתוני אנליטיקה מחוברים — קשה לאמוד סיכונים תפעוליים.",
    en: "No analytics data connected — operational risks are hard to assess.",
  },
  mitigationAction: {
    he: "חבר מקור נתונים (Meta Ads, CRM) לקבלת תובנות מעמיקות",
    en: "Connect a data source (Meta Ads, CRM) for deeper operational insights",
  },
  timeHorizon: "6m",
};

function buildTopRisks(
  churn: ChurnRiskAssessment,
  health: HealthScore,
  ukg: UserKnowledgeGraph,
): [BriefRisk, BriefRisk, BriefRisk] {
  const r1 = buildChurnRisk(churn);
  const r2 = buildRevenueRisk(health, ukg);
  const r3 = buildMarketRisk(ukg);

  // Sort by severity (red > amber > green) and always return exactly 3
  const ordered = [r1, r2, r3].sort((a, b) => {
    const w = { red: 0, amber: 1, green: 2 };
    return w[a.severity] - w[b.severity];
  });

  return [ordered[0] ?? GENERIC_RISK, ordered[1] ?? GENERIC_RISK, ordered[2] ?? GENERIC_RISK];
}

// ═══ NRR SCENARIOS ═══

function buildNRRScenarios(churn: ChurnRiskAssessment): [NRRScenario, NRRScenario, NRRScenario] {
  const baseline = churn.nrrProjection.current;
  const optimistic = churn.nrrProjection.withIntervention;
  const pessimistic = Math.max(60, baseline - 15);

  return [
    {
      label: { he: "פסימי — ללא שינוי", en: "Pessimistic — no action" },
      nrr: pessimistic,
      delta: pessimistic - baseline,
      description: {
        he: "NRR ירד אם לא יופעלו אמצעי שימור",
        en: "NRR declines without retention measures",
      },
      color: "red",
    },
    {
      label: { he: "בסיס — מצב נוכחי", en: "Baseline — current state" },
      nrr: baseline,
      delta: 0,
      description: {
        he: "NRR לפי מצב עסקי נוכחי",
        en: "NRR based on current business state",
      },
      color: trafficLight(baseline),
    },
    {
      label: { he: "אופטימי — עם תוכנית שימור", en: "Optimistic — with retention plan" },
      nrr: optimistic,
      delta: optimistic - baseline,
      description: {
        he: "NRR צפוי לאחר הפעלת תוכנית השימור",
        en: "Projected NRR after activating the retention plan",
      },
      color: trafficLight(optimistic),
    },
  ];
}

// ═══ ACTION CHECKLIST ═══

function buildActionChecklist(
  churn: ChurnRiskAssessment,
  health: HealthScore,
  ukg: UserKnowledgeGraph,
): ActionItem[] {
  const items: ActionItem[] = [];

  if (churn.riskScore >= 50) {
    items.push({
      priority: 1,
      action: {
        he: "הפעל תוכנית שימור: שלח הודעת win-back לאלו שלא פתחו 14 יום",
        en: "Activate retention: send a win-back message to those inactive 14 days",
      },
      owner: { he: "מנהל שיווק", en: "Marketing Manager" },
      timeframe: "7 days",
      expectedImpact: {
        he: `צמצום נטישה ב-${churn.nrrProjection.improvement}%`,
        en: `Reduce churn by ${churn.nrrProjection.improvement}%`,
      },
      done: false,
    });
  }

  const channelScore = health.breakdown.find((b) => b.category === "channels")?.score ?? 0;
  if (channelScore < 60) {
    items.push({
      priority: 1,
      action: {
        he: "הוסף ערוץ שיווקי נוסף — בדוק Google Ads לצד ה-Meta הקיים",
        en: "Add another marketing channel — test Google Ads alongside existing Meta",
      },
      owner: { he: "מנהל פרפורמנס", en: "Performance Manager" },
      timeframe: "14 days",
      expectedImpact: {
        he: "הפחת תלות בערוץ יחיד, הגדל חשיפה ב-30%+",
        en: "Reduce single-channel dependency, increase reach 30%+",
      },
      done: false,
    });
  }

  if ((health.breakdown.find((b) => b.category === "strategy")?.score ?? 0) < 60) {
    items.push({
      priority: 2,
      action: {
        he: "חדד את המיצוב: הגדר מנגנון ייחודי (Mechanism) ב-1 משפט",
        en: "Sharpen positioning: define your unique mechanism in 1 sentence",
      },
      owner: { he: "מנכ״ל / CMO", en: "CEO / CMO" },
      timeframe: "3 days",
      expectedImpact: {
        he: "שיפור conversion ב-15-25% בממוצע",
        en: "Improve conversion 15-25% on average",
      },
      done: false,
    });
  }

  if (ukg.business.salesModel === "subscription" && churn.nrrProjection.current < 100) {
    items.push({
      priority: 2,
      action: {
        he: "הפעל upsell flow: הצע שדרוג לרשימת לקוחות חודש 2-3",
        en: "Activate upsell flow: offer upgrade to month 2-3 customer list",
      },
      owner: { he: "Customer Success", en: "Customer Success" },
      timeframe: "21 days",
      expectedImpact: {
        he: "הגדלת NRR ב-5-10 נקודות אחוז",
        en: "Increase NRR by 5-10 percentage points",
      },
      done: false,
    });
  }

  items.push({
    priority: 3,
    action: {
      he: "חבר נתוני אנליטיקה (Meta / Google / CRM) לניטור שוטף",
      en: "Connect analytics data (Meta / Google / CRM) for ongoing monitoring",
    },
    owner: { he: "אנליסט / מנהל נתונים", en: "Analyst / Data Manager" },
    timeframe: "30 days",
    expectedImpact: {
      he: "קבלת החלטות מבוססת נתונים — הפחתת עלויות שיווק ב-15%",
      en: "Data-driven decisions — reduce marketing costs by 15%",
    },
    done: false,
  });

  return items.sort((a, b) => a.priority - b.priority).slice(0, 5);
}

// ═══ EXECUTIVE SUMMARY ═══

function buildExecutiveSummary(
  health: HealthScore,
  churn: ChurnRiskAssessment,
  ukg: UserKnowledgeGraph,
): BilingualText {
  const tier = health.tier;
  const riskTier = churn.riskTier;
  const nrr = churn.nrrProjection.current;

  const tierLabelsHe: Record<string, string> = {
    excellent: "מצוין",
    good: "טוב",
    "needs-work": "דורש שיפור",
    critical: "קריטי",
  };
  const tierLabelsEn: Record<string, string> = {
    excellent: "excellent",
    good: "good",
    "needs-work": "needs work",
    critical: "critical",
  };

  return {
    he: `המצב השיווקי הנוכחי של העסק הוא ${tierLabelsHe[tier] ?? tier} (${health.total}/100). סיכון הנטישה הוא ${riskTier} עם NRR משוער של ${nrr}%. ${churn.riskScore >= 60 ? "פעולה מיידית נדרשת בתחום שימור לקוחות." : "המשך לפעול לפי תוכנית הצמיחה."} ב${ukg.business.channels.length} ערוצים פעילים, הפוטנציאל לגידול קיים בתנאי שיתקיים פיזור ערוצים ומיצוב ממוקד.`,
    en: `The business's current marketing health is ${tierLabelsEn[tier] ?? tier} (${health.total}/100). Churn risk is ${riskTier} with an estimated NRR of ${nrr}%. ${churn.riskScore >= 60 ? "Immediate action is needed on customer retention." : "Continue executing the growth plan."} With ${ukg.business.channels.length} active channel${ukg.business.channels.length !== 1 ? "s" : ""}, growth potential exists — provided there is channel diversification and focused positioning.`,
  };
}

// ═══ MAIN EXPORT ═══

export function buildExecutiveBrief(input: BuildExecutiveBriefInput): ExecutiveBrief {
  const { result, ukg } = input;

  const health = input.healthScore ?? calculateHealthScore(result, ukg);
  const churn = input.churnRisk ?? assessChurnRisk(result.formData);

  const topRisks = buildTopRisks(churn, health, ukg);
  const nrrScenarios = buildNRRScenarios(churn);
  const actionChecklist = buildActionChecklist(churn, health, ukg);
  const executiveSummary = buildExecutiveSummary(health, churn, ukg);

  return {
    id: `brief-${result.id}`,
    generatedAt: new Date().toISOString(),
    healthScore: health.total,
    healthTier: health.tier,
    healthLight: trafficLight(health.total),
    topRisks,
    nrrScenarios,
    actionChecklist,
    executiveSummary,
  };
}
