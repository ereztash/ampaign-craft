// ═══════════════════════════════════════════════
// Predictive Engine — Success probability forecasting
// Uses historical campaign data to predict outcomes
// for new plans: conversion likelihood, budget efficiency.
// ═══════════════════════════════════════════════

import type { FormData, FunnelResult } from "@/types/funnel";
import type { CampaignBenchmark } from "./campaignAnalyticsEngine";
import { findBenchmark } from "./campaignAnalyticsEngine";
import {
  writeContext,
  conceptKey,
  type BlackboardWriteContext,
} from "./blackboard/contract";

export const ENGINE_MANIFEST = {
  name: "predictiveEngine",
  reads: ["USER-form-*", "CAMPAIGN-funnel-*", "BUSINESS-benchmarks-*"],
  writes: ["CAMPAIGN-prediction-*"],
  stage: "design",
  isLive: true,
  parameters: [
    "Budget prediction",
    "Outcome prediction",
    "Trend forecasting",
  ],
} as const;

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export interface PredictionResult {
  successProbability: number;   // 0-100
  budgetEfficiency: BudgetEfficiency;
  riskFactors: RiskFactor[];
  recommendations: PredictionRecommendation[];
  confidence: number;           // 0-1 (how confident we are in this prediction)
  basedOnSamples: number;
}

export interface BudgetEfficiency {
  score: number;               // 0-100
  optimalRange: { min: number; max: number };
  currentBudget: number;
  verdict: "under" | "optimal" | "over";
}

export interface RiskFactor {
  factor: { he: string; en: string };
  impact: "high" | "medium" | "low";
  mitigable: boolean;
}

export interface PredictionRecommendation {
  text: { he: string; en: string };
  priority: "high" | "medium" | "low";
  expectedImprovement: string;  // e.g. "+15% conversion"
}

// ═══════════════════════════════════════════════
// PREDICTION ENGINE
// ═══════════════════════════════════════════════

/**
 * Predict success probability for a given plan configuration.
 * Uses benchmarks from historical data + heuristic rules.
 */
export function predictSuccess(
  formData: FormData,
  funnelResult: FunnelResult,
  benchmarks: CampaignBenchmark[],
  blackboardCtx?: BlackboardWriteContext,
): PredictionResult {
  const industry = formData.businessField || "unknown";
  const riskFactors: RiskFactor[] = [];
  const recommendations: PredictionRecommendation[] = [];
  let basedOnSamples = 0;

  // Base probability starts at 60% (average)
  let probability = 60;

  // ── Factor 1: Stage count alignment ──
  const stageBenchmark = findBenchmark(benchmarks, industry, "avg_stage_count", formData.audienceType);
  if (stageBenchmark) {
    basedOnSamples = Math.max(basedOnSamples, stageBenchmark.sampleSize);
    const diff = Math.abs(funnelResult.stages.length - stageBenchmark.value);
    if (diff <= 1) {
      probability += 5; // close to industry average
    } else if (diff >= 3) {
      probability -= 10;
      riskFactors.push({
        factor: {
          he: `מספר שלבים (${funnelResult.stages.length}) חורג מהממוצע בתחום (${stageBenchmark.value})`,
          en: `Stage count (${funnelResult.stages.length}) deviates from industry average (${stageBenchmark.value})`,
        },
        impact: "medium",
        mitigable: true,
      });
    }
  }

  // ── Factor 2: Budget appropriateness ──
  const currentBudget = (funnelResult.totalBudget.min + funnelResult.totalBudget.max) / 2;
  const budgetBenchmark = findBenchmark(benchmarks, industry, "avg_budget_nis");
  let budgetEfficiency: BudgetEfficiency;

  if (budgetBenchmark && budgetBenchmark.value > 0) {
    basedOnSamples = Math.max(basedOnSamples, budgetBenchmark.sampleSize);
    const ratio = currentBudget / budgetBenchmark.value;
    const optMin = budgetBenchmark.value * 0.5;
    const optMax = budgetBenchmark.value * 2;

    let verdict: BudgetEfficiency["verdict"];
    let budgetScore: number;

    if (ratio >= 0.5 && ratio <= 2) {
      verdict = "optimal";
      budgetScore = 80 + (1 - Math.abs(ratio - 1)) * 20;
      probability += 5;
    } else if (ratio < 0.5) {
      verdict = "under";
      budgetScore = Math.max(20, ratio * 100);
      probability -= 10;
      riskFactors.push({
        factor: {
          he: "תקציב נמוך מהממוצע בתחום — עלול להגביל חשיפה",
          en: "Budget below industry average — may limit reach",
        },
        impact: "high",
        mitigable: true,
      });
      recommendations.push({
        text: {
          he: "שקול להגדיל תקציב או לצמצם ערוצים",
          en: "Consider increasing budget or reducing channels",
        },
        priority: "high",
        expectedImprovement: "+20% reach",
      });
    } else {
      verdict = "over";
      budgetScore = Math.max(50, 100 - (ratio - 2) * 20);
      probability += 2; // higher budget still helps, but diminishing returns
      recommendations.push({
        text: {
          he: "תקציב גבוה — ודא ניצול יעיל של כל ערוץ",
          en: "High budget — ensure efficient utilization of each channel",
        },
        priority: "medium",
        expectedImprovement: "+10% ROI with optimization",
      });
    }

    budgetEfficiency = {
      score: clamp(Math.round(budgetScore), 0, 100),
      optimalRange: { min: Math.round(optMin), max: Math.round(optMax) },
      currentBudget: Math.round(currentBudget),
      verdict,
    };
  } else {
    budgetEfficiency = {
      score: 60,
      optimalRange: { min: 0, max: 0 },
      currentBudget: Math.round(currentBudget),
      verdict: "optimal",
    };
  }

  // ── Factor 3: Channel diversity ──
  const uniqueChannels = new Set<string>();
  for (const stage of funnelResult.stages) {
    for (const ch of stage.channels || []) {
      uniqueChannels.add(ch.channel || ch.name?.en || "");
    }
  }

  if (uniqueChannels.size >= 3 && uniqueChannels.size <= 6) {
    probability += 5; // healthy channel mix
  } else if (uniqueChannels.size <= 1) {
    probability -= 10;
    riskFactors.push({
      factor: {
        he: "ערוץ שיווקי יחיד — מסוכן להסתמך על ערוץ אחד",
        en: "Single marketing channel — risky to rely on one channel",
      },
      impact: "high",
      mitigable: true,
    });
    recommendations.push({
      text: {
        he: "הוסף לפחות 2-3 ערוצים נוספים לגיוון סיכון",
        en: "Add at least 2-3 more channels for risk diversification",
      },
      priority: "high",
      expectedImprovement: "+30% resilience",
    });
  }

  // ── Factor 4: Experience level adjustment ──
  if (formData.experienceLevel === "beginner") {
    probability -= 10;
    riskFactors.push({
      factor: {
        he: "רמת ניסיון מתחילה — עקומת למידה צפויה",
        en: "Beginner experience — learning curve expected",
      },
      impact: "medium",
      mitigable: true,
    });
    recommendations.push({
      text: {
        he: "התחל עם ערוץ אחד, שלוט בו, ואז הרחב",
        en: "Start with one channel, master it, then expand",
      },
      priority: "high",
      expectedImprovement: "+25% efficiency",
    });
  } else if (formData.experienceLevel === "advanced") {
    probability += 10;
  }

  // ── Factor 5: Content richness ──
  const hookCount = funnelResult.hookTips?.length || 0;
  const copyCount = funnelResult.copyLab?.formulas?.length || 0;
  if (hookCount >= 3 && copyCount >= 2) {
    probability += 5; // rich content arsenal
  } else if (hookCount === 0 && copyCount === 0) {
    probability -= 5;
    riskFactors.push({
      factor: {
        he: "חסרים הוקים ונוסחאות קופי — התוכן עלול להיות חלש",
        en: "Missing hooks and copy formulas — content may be weak",
      },
      impact: "medium",
      mitigable: true,
    });
  }

  // ── Factor 6: Goal-channel alignment ──
  if (formData.mainGoal === "awareness" && uniqueChannels.has("google_search")) {
    probability += 3; // good alignment
  }
  if (formData.mainGoal === "sales" && !uniqueChannels.has("email")) {
    recommendations.push({
      text: {
        he: "הוסף אימייל מרקטינג — ערוץ ההמרה האפקטיבי ביותר",
        en: "Add email marketing — the most effective conversion channel",
      },
      priority: "medium",
      expectedImprovement: "+15% conversion",
    });
  }

  // Clamp final probability
  probability = clamp(probability, 10, 95);

  // Overall confidence based on data availability
  const confidence = basedOnSamples > 0
    ? Math.min(0.9, 0.3 + basedOnSamples * 0.05)
    : 0.3; // low confidence without benchmark data

  const result: PredictionResult = {
    successProbability: Math.round(probability),
    budgetEfficiency,
    riskFactors,
    recommendations,
    confidence: Math.round(confidence * 100) / 100,
    basedOnSamples,
  };

  if (blackboardCtx) {
    void writeContext({
      userId: blackboardCtx.userId,
      planId: blackboardCtx.planId,
      key: conceptKey("CAMPAIGN", "prediction", funnelResult.id),
      stage: "design",
      payload: {
        successProbability: result.successProbability,
        budgetEfficiency: result.budgetEfficiency,
        riskFactorCount: result.riskFactors.length,
        confidence: result.confidence,
      },
      writtenBy: ENGINE_MANIFEST.name,
    }).catch(() => {});
  }

  return result;
}

// ═══════════════════════════════════════════════
// BUDGET PREDICTION
// ═══════════════════════════════════════════════

export interface BudgetPrediction {
  recommendedBudget: number;
  budgetRange: { min: number; max: number };
  confidence: number;
  rationale: { he: string; en: string };
}

/**
 * Reverse-engineer the budget needed to achieve a given goal.
 */
export function predictBudgetNeeded(
  goal: string,
  industry: string,
  audienceType: string,
  benchmarks: CampaignBenchmark[]
): BudgetPrediction {
  const budgetBenchmark = findBenchmark(benchmarks, industry, "avg_budget_nis", audienceType);

  // Goal multipliers
  const goalMultipliers: Record<string, number> = {
    awareness: 0.7,
    leads: 1.0,
    sales: 1.3,
    retention: 0.8,
    branding: 0.9,
  };
  const multiplier = goalMultipliers[goal] || 1.0;

  if (budgetBenchmark && budgetBenchmark.value > 0) {
    const base = budgetBenchmark.value * multiplier;
    return {
      recommendedBudget: Math.round(base),
      budgetRange: { min: Math.round(base * 0.6), max: Math.round(base * 1.5) },
      confidence: budgetBenchmark.confidence,
      rationale: {
        he: `מבוסס על ${budgetBenchmark.sampleSize} תוכניות בתחום ${industry}`,
        en: `Based on ${budgetBenchmark.sampleSize} plans in ${industry} industry`,
      },
    };
  }

  // Fallback estimates by goal
  const fallbackBudgets: Record<string, number> = {
    awareness: 3000,
    leads: 5000,
    sales: 7000,
    retention: 2500,
    branding: 4000,
  };
  const base = fallbackBudgets[goal] || 5000;

  return {
    recommendedBudget: base,
    budgetRange: { min: Math.round(base * 0.5), max: Math.round(base * 2) },
    confidence: 0.2,
    rationale: {
      he: "הערכה כללית — אין מספיק נתונים היסטוריים בתחום שלך",
      en: "General estimate — not enough historical data in your industry",
    },
  };
}

// ═══════════════════════════════════════════════
// TREND FORECASTING
// ═══════════════════════════════════════════════

export interface TrendPoint {
  period: string; // e.g. "2026-01", "2026-02"
  value: number;
}

export interface TrendForecast {
  historical: TrendPoint[];
  forecast: TrendPoint[];
  trend: "improving" | "declining" | "stable";
  slope: number;
  rSquared: number; // goodness of fit (0-1)
}

/**
 * Forecast future values using simple linear regression.
 */
export function forecastTrend(
  historicalData: TrendPoint[],
  periodsAhead: number
): TrendForecast {
  if (historicalData.length < 2) {
    return {
      historical: historicalData,
      forecast: [],
      trend: "stable",
      slope: 0,
      rSquared: 0,
    };
  }

  const n = historicalData.length;
  const xs = historicalData.map((_, i) => i);
  const ys = historicalData.map((d) => d.value);

  // Linear regression: y = mx + b
  const sumX = xs.reduce((s, x) => s + x, 0);
  const sumY = ys.reduce((s, y) => s + y, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumXX = xs.reduce((s, x) => s + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R-squared (coefficient of determination)
  const meanY = sumY / n;
  const ssTotal = ys.reduce((s, y) => s + Math.pow(y - meanY, 2), 0);
  const ssResidual = ys.reduce((s, y, i) => s + Math.pow(y - (slope * xs[i] + intercept), 2), 0);
  const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

  // Generate forecast points
  const forecast: TrendPoint[] = [];
  for (let i = 0; i < periodsAhead; i++) {
    const x = n + i;
    const value = Math.max(0, slope * x + intercept);
    // Generate period label by incrementing from last historical period
    const lastPeriod = historicalData[historicalData.length - 1].period;
    const nextPeriod = incrementPeriod(lastPeriod, i + 1);
    forecast.push({ period: nextPeriod, value: Math.round(value * 100) / 100 });
  }

  // Determine trend direction
  const slopeNormalized = meanY > 0 ? slope / meanY : 0;
  let trend: TrendForecast["trend"];
  if (slopeNormalized > 0.02) {
    trend = "improving";
  } else if (slopeNormalized < -0.02) {
    trend = "declining";
  } else {
    trend = "stable";
  }

  return {
    historical: historicalData,
    forecast,
    trend,
    slope: Math.round(slope * 1000) / 1000,
    rSquared: Math.round(rSquared * 1000) / 1000,
  };
}

function incrementPeriod(period: string, months: number): string {
  const parts = period.split("-");
  if (parts.length === 2) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) + months;
    const newYear = year + Math.floor((month - 1) / 12);
    const newMonth = ((month - 1) % 12) + 1;
    return `${newYear}-${String(newMonth).padStart(2, "0")}`;
  }
  return `${period}+${months}`;
}

// ═══════════════════════════════════════════════
// CAMPAIGN OUTCOME PREDICTION
// ═══════════════════════════════════════════════

export interface OutcomePrediction {
  expectedConversions: { min: number; max: number };
  expectedRevenue: { min: number; max: number };
  breakEvenProbability: number;
  timeToResults: { he: string; en: string };
}

/**
 * Predict campaign outcome range based on plan config and benchmarks.
 */
export function predictCampaignOutcome(
  formData: FormData,
  funnelResult: FunnelResult,
  benchmarks: CampaignBenchmark[]
): OutcomePrediction {
  const budget = (funnelResult.totalBudget.min + funnelResult.totalBudget.max) / 2;

  // Industry conversion rates
  const conversionRates: Record<string, { low: number; high: number }> = {
    fashion: { low: 0.015, high: 0.04 },
    tech: { low: 0.02, high: 0.06 },
    food: { low: 0.025, high: 0.07 },
    services: { low: 0.02, high: 0.05 },
    education: { low: 0.03, high: 0.08 },
    health: { low: 0.015, high: 0.04 },
    realEstate: { low: 0.005, high: 0.02 },
    tourism: { low: 0.02, high: 0.05 },
    personalBrand: { low: 0.03, high: 0.08 },
    other: { low: 0.02, high: 0.05 },
  };

  const rates = conversionRates[formData.businessField] || conversionRates.other;

  // Experience modifier
  const expMod = formData.experienceLevel === "beginner" ? 0.7
    : formData.experienceLevel === "advanced" ? 1.3 : 1.0;

  // Estimate impressions from budget (rough ₪5-20 CPM depending on channel)
  const avgCPM = 12;
  const impressions = (budget / avgCPM) * 1000;

  const minConversions = Math.round(impressions * rates.low * expMod);
  const maxConversions = Math.round(impressions * rates.high * expMod);

  const avgPrice = formData.averagePrice || 100;
  const minRevenue = minConversions * avgPrice;
  const maxRevenue = maxConversions * avgPrice;

  const breakEvenProbability = maxRevenue > budget ? clamp(
    0.3 + (maxRevenue - budget) / maxRevenue * 0.6,
    0.1,
    0.95
  ) : 0.15;

  const timeEstimate = budget > 10000
    ? { he: "2-4 שבועות", en: "2-4 weeks" }
    : budget > 3000
      ? { he: "4-8 שבועות", en: "4-8 weeks" }
      : { he: "6-12 שבועות", en: "6-12 weeks" };

  return {
    expectedConversions: { min: minConversions, max: maxConversions },
    expectedRevenue: { min: Math.round(minRevenue), max: Math.round(maxRevenue) },
    breakEvenProbability: Math.round(breakEvenProbability * 100) / 100,
    timeToResults: timeEstimate,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
