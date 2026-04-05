// ═══════════════════════════════════════════════
// Cost of Inaction Engine
// Cross-domain: Behavioral Economics × Finance × Loss Aversion
// ═══════════════════════════════════════════════

import { FunnelResult, FormData } from "@/types/funnel";

export interface CostOfInaction {
  monthlyWaste: number;       // ₪ wasted per month
  annualWaste: number;        // ₪ wasted per year
  unrealizedLeads: number;    // leads missed per month
  unrealizedRevenue: number;  // revenue missed per month
  lossFramedMessage: { he: string; en: string };
  comparisonMessage: { he: string; en: string };
  urgencyMessage: { he: string; en: string };
  improvementPercent: number;
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

export function calculateCostOfInaction(result: FunnelResult): CostOfInaction {
  const { formData } = result;
  const field = formData.businessField || "other";
  const wasteRate = WASTE_RATES[field] || 0.30;
  const monthlyBudget = BUDGET_AMOUNTS[formData.budgetRange || "medium"] || 6000;
  const improvement = IMPROVEMENT_BY_LEVEL[formData.experienceLevel || ""] || 0.25;
  const avgPrice = formData.averagePrice || 500;

  const monthlyWaste = Math.round(monthlyBudget * wasteRate);
  const annualWaste = monthlyWaste * 12;
  const potentialSaving = Math.round(monthlyWaste * improvement);
  const unrealizedLeads = Math.round(potentialSaving / (avgPrice * 0.1)); // assume 10% of price is CPL
  const unrealizedRevenue = Math.round(unrealizedLeads * avgPrice * 0.15); // 15% conversion

  const formatNIS = (n: number) => `₪${n.toLocaleString()}`;

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
