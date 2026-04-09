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

// ═══════════════════════════════════════════════
// CHANNEL-LEVEL ROI ATTRIBUTION
// ═══════════════════════════════════════════════

export interface ChannelMetrics {
  channel: string;
  spend: number;
  conversions: number;
  revenue: number;
}

export interface ChannelROI {
  channel: string;
  spend: number;
  conversions: number;
  revenue: number;
  roi: number; // (revenue - spend) / spend
  cpa: number; // cost per acquisition
  conversionRate: number;
}

export interface AttributionResult {
  channelROIs: ChannelROI[];
  totalSpend: number;
  totalRevenue: number;
  totalROI: number;
  bestChannel: string | null;
  worstChannel: string | null;
}

/**
 * Calculate per-channel ROI from channel metrics.
 */
export function calculateChannelROI(channels: ChannelMetrics[]): AttributionResult {
  const channelROIs: ChannelROI[] = channels.map((ch) => ({
    channel: ch.channel,
    spend: ch.spend,
    conversions: ch.conversions,
    revenue: ch.revenue,
    roi: ch.spend > 0 ? (ch.revenue - ch.spend) / ch.spend : 0,
    cpa: ch.conversions > 0 ? ch.spend / ch.conversions : 0,
    conversionRate: ch.spend > 0 ? ch.conversions / ch.spend : 0,
  }));

  const totalSpend = channels.reduce((s, ch) => s + ch.spend, 0);
  const totalRevenue = channels.reduce((s, ch) => s + ch.revenue, 0);

  const sorted = [...channelROIs].sort((a, b) => b.roi - a.roi);

  return {
    channelROIs,
    totalSpend,
    totalRevenue,
    totalROI: totalSpend > 0 ? (totalRevenue - totalSpend) / totalSpend : 0,
    bestChannel: sorted.length > 0 ? sorted[0].channel : null,
    worstChannel: sorted.length > 0 ? sorted[sorted.length - 1].channel : null,
  };
}

// ═══════════════════════════════════════════════
// MULTI-TOUCH ATTRIBUTION
// ═══════════════════════════════════════════════

export type AttributionModel = "first_touch" | "last_touch" | "linear" | "time_decay";

export interface Touchpoint {
  channel: string;
  timestamp: number;
}

export interface ConversionPath {
  touchpoints: Touchpoint[];
  conversionValue: number;
}

/**
 * Attribute conversions across channels using the specified model.
 */
export function attributeConversions(
  paths: ConversionPath[],
  model: AttributionModel = "linear"
): Record<string, number> {
  const attribution: Record<string, number> = {};

  for (const path of paths) {
    if (path.touchpoints.length === 0) continue;

    const sorted = [...path.touchpoints].sort((a, b) => a.timestamp - b.timestamp);

    switch (model) {
      case "first_touch":
        attribution[sorted[0].channel] =
          (attribution[sorted[0].channel] || 0) + path.conversionValue;
        break;

      case "last_touch":
        attribution[sorted[sorted.length - 1].channel] =
          (attribution[sorted[sorted.length - 1].channel] || 0) + path.conversionValue;
        break;

      case "linear": {
        const share = path.conversionValue / sorted.length;
        for (const tp of sorted) {
          attribution[tp.channel] = (attribution[tp.channel] || 0) + share;
        }
        break;
      }

      case "time_decay": {
        // More recent touchpoints get exponentially more credit
        const decayFactor = 0.7;
        const weights = sorted.map((_, i) => Math.pow(decayFactor, sorted.length - 1 - i));
        const totalWeight = weights.reduce((s, w) => s + w, 0);

        for (let i = 0; i < sorted.length; i++) {
          const share = (weights[i] / totalWeight) * path.conversionValue;
          attribution[sorted[i].channel] = (attribution[sorted[i].channel] || 0) + share;
        }
        break;
      }
    }
  }

  return attribution;
}

// ═══════════════════════════════════════════════
// PLAN COMPARISON
// ═══════════════════════════════════════════════

export interface PlanComparison {
  plan1Name: string;
  plan2Name: string;
  budgetDiff: number;
  stageDiff: number;
  channelOverlap: number; // 0-1
  roiAdvantage: string; // which plan has better estimated ROI
}

/**
 * Compare two campaign plans on key metrics.
 */
export function comparePlans(
  plan1: { name: string; budget: number; stages: number; channels: string[] },
  plan2: { name: string; budget: number; stages: number; channels: string[] }
): PlanComparison {
  const allChannels = new Set([...plan1.channels, ...plan2.channels]);
  const commonChannels = plan1.channels.filter((ch) => plan2.channels.includes(ch));
  const channelOverlap = allChannels.size > 0 ? commonChannels.length / allChannels.size : 0;

  const efficiency1 = plan1.stages > 0 ? plan1.budget / plan1.stages : 0;
  const efficiency2 = plan2.stages > 0 ? plan2.budget / plan2.stages : 0;

  return {
    plan1Name: plan1.name,
    plan2Name: plan2.name,
    budgetDiff: plan2.budget - plan1.budget,
    stageDiff: plan2.stages - plan1.stages,
    channelOverlap: Math.round(channelOverlap * 100) / 100,
    roiAdvantage:
      efficiency1 < efficiency2
        ? plan1.name
        : efficiency2 < efficiency1
          ? plan2.name
          : "equal",
  };
}
