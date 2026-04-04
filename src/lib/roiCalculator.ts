/**
 * ROI Calculator
 * Shows potential savings from funnel optimization.
 * "If this funnel improves conversion by just 10%, you save ₪X/month"
 */

import { FormData } from "@/types/funnel";

export interface RoiEstimate {
  currentWaste: { he: string; en: string };
  potentialSaving: { he: string; en: string };
  monthlyImpact: number; // in NIS
  annualImpact: number;
  improvementPercent: number;
}

export function calculateRoi(formData: FormData): RoiEstimate {
  // Budget range to monthly spend
  const budgetMap: Record<string, number> = {
    low: 1500,
    medium: 6000,
    high: 25000,
    veryHigh: 100000,
  };
  const monthlyBudget = budgetMap[formData.budgetRange] || 3000;

  // Industry average waste rate (% of budget wasted without optimization)
  const wasteRates: Record<string, number> = {
    fashion: 0.35,
    tech: 0.25,
    food: 0.40,
    services: 0.30,
    education: 0.28,
    health: 0.32,
    realEstate: 0.22,
    tourism: 0.38,
    personalBrand: 0.45,
    other: 0.33,
  };
  const wasteRate = wasteRates[formData.businessField] || 0.33;

  // Conservative improvement from using FunnelForge (10-25%)
  const improvementPercent = formData.experienceLevel === "beginner" ? 25 :
    formData.experienceLevel === "intermediate" ? 15 : 10;

  const currentWaste = Math.round(monthlyBudget * wasteRate);
  const saving = Math.round(currentWaste * (improvementPercent / 100));
  const annual = saving * 12;

  return {
    currentWaste: {
      he: `₪${currentWaste.toLocaleString()} בזבוז חודשי ממוצע בענף שלך`,
      en: `₪${currentWaste.toLocaleString()} average monthly waste in your industry`,
    },
    potentialSaving: {
      he: `₪${saving.toLocaleString()}/חודש (₪${annual.toLocaleString()}/שנה)`,
      en: `₪${saving.toLocaleString()}/month (₪${annual.toLocaleString()}/year)`,
    },
    monthlyImpact: saving,
    annualImpact: annual,
    improvementPercent,
  };
}
