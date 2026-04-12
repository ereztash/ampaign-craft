// ═══════════════════════════════════════════════
// Cost of Inaction Engine
// Cross-domain: Behavioral Economics × Finance × Loss Aversion
// ═══════════════════════════════════════════════

import { FunnelResult, FormData } from "@/types/funnel";

export interface CompoundingLoss {
  threeMonth: number;
  sixMonth: number;
  twelveMonth: number;
}

export interface CostOfInaction {
  monthlyWaste: number;       // ₪ wasted per month
  annualWaste: number;        // ₪ wasted per year
  unrealizedLeads: number;    // leads missed per month
  unrealizedRevenue: number;  // revenue missed per month
  lossFramedMessage: { he: string; en: string };
  comparisonMessage: { he: string; en: string };
  urgencyMessage: { he: string; en: string };
  improvementPercent: number;
  competitorGapMessage: { he: string; en: string };
  compoundingLoss: CompoundingLoss;
}

const WASTE_RATES: Record<string, number> = {
  personalBrand: 0.45, food: 0.40, fashion: 0.35, tourism: 0.35,
  health: 0.30, services: 0.30, education: 0.28, tech: 0.25,
  realEstate: 0.22, other: 0.30,
};

const BUDGET_AMOUNTS: Record<string, number> = {
  low: 1500, medium: 6000, high: 25000, veryHigh: 75000,
};

const IMPROVEMENT_BY_LEVEL: Record<string, number> = {
  beginner: 0.35, intermediate: 0.25, advanced: 0.15, "": 0.25,
};

export function calculateCostOfInaction(
  result: FunnelResult,
  ukg?: import("./userKnowledgeGraph").UserKnowledgeGraph,
): CostOfInaction {
  const { formData } = result;
  const field = formData.businessField || "other";
  // Cross-domain: if real CPL is available, derive waste from it instead of industry tables
  const wasteRate = (ukg?.derived.realMetrics.avgCPL != null && ukg.derived.realMetrics.avgCPL > 0)
    ? Math.min(0.50, ukg.derived.realMetrics.avgCPL / 100) // normalize CPL into a 0-50% waste rate proxy
    : (WASTE_RATES[field] || 0.30);
  const monthlyBudget = BUDGET_AMOUNTS[formData.budgetRange || "medium"] || 6000;
  const improvement = IMPROVEMENT_BY_LEVEL[formData.experienceLevel || ""] || 0.25;
  const avgPrice = formData.averagePrice || 500;

  const monthlyWaste = Math.round(monthlyBudget * wasteRate);
  const annualWaste = monthlyWaste * 12;
  const potentialSaving = Math.round(monthlyWaste * improvement);
  const unrealizedLeads = Math.round(potentialSaving / (avgPrice * 0.1)); // assume 10% of price is CPL
  const unrealizedRevenue = Math.round(unrealizedLeads * avgPrice * 0.15); // 15% conversion

  const formatNIS = (n: number) => `₪${n.toLocaleString()}`;

  // Compounding loss over horizons (loss accelerates as competitors improve)
  const compoundRate = 1.05; // 5% monthly compounding from competitor improvement
  const compoundingLoss: CompoundingLoss = {
    threeMonth: Math.round(monthlyWaste * ((Math.pow(compoundRate, 3) - 1) / (compoundRate - 1))),
    sixMonth: Math.round(monthlyWaste * ((Math.pow(compoundRate, 6) - 1) / (compoundRate - 1))),
    twelveMonth: Math.round(monthlyWaste * ((Math.pow(compoundRate, 12) - 1) / (compoundRate - 1))),
  };

  return {
    monthlyWaste,
    annualWaste,
    unrealizedLeads,
    unrealizedRevenue,
    improvementPercent: Math.round(improvement * 100),
    lossFramedMessage: {
      he: `כל חודש שעובר בלי אופטימיזציה, אתה מפסיד ${formatNIS(monthlyWaste)} — זה ${formatNIS(annualWaste)} בשנה שהולכים לפח`,
      en: `Every month without optimization, you're losing ${formatNIS(monthlyWaste)} — that's ${formatNIS(annualWaste)}/year going to waste`,
    },
    comparisonMessage: {
      he: `עסקים דומים בתחום ה${getFieldNameHe(field)} שהטמיעו משפך מותאם שיפרו ב-${Math.round(improvement * 100)}% בממוצע`,
      en: `Similar ${field} businesses that implemented an optimized funnel improved by ${Math.round(improvement * 100)}% on average`,
    },
    urgencyMessage: {
      he: `כל שבוע של עיכוב = ~${formatNIS(Math.round(monthlyWaste / 4))} שנשרפים. ההפסד מצטבר`,
      en: `Every week of delay = ~${formatNIS(Math.round(monthlyWaste / 4))} burned. The loss compounds`,
    },
    competitorGapMessage: {
      he: `בזמן שאתה מהסס, המתחרים שלך בתחום ה${getFieldNameHe(field)} כבר מטמיעים — הפער גדל ב-5% כל חודש. עוד 6 חודשים = ${formatNIS(compoundingLoss.sixMonth)} הפסד מצטבר`,
      en: `While you hesitate, your ${field} competitors are already implementing — the gap grows 5% monthly. In 6 months = ${formatNIS(compoundingLoss.sixMonth)} cumulative loss`,
    },
    compoundingLoss,
  };
}

function getFieldNameHe(field: string): string {
  const names: Record<string, string> = {
    fashion: "אופנה", tech: "טכנולוגיה", food: "מזון", services: "שירותים",
    education: "חינוך", health: "בריאות", realEstate: "נדל\"ן",
    tourism: "תיירות", personalBrand: "מיתוג אישי", other: "עסקים",
  };
  return names[field] || "עסקים";
}
