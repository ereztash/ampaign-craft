// ═══════════════════════════════════════════════
// Predictive Engine — Success probability forecasting
// Uses historical campaign data to predict outcomes
// for new plans: conversion likelihood, budget efficiency.
// ═══════════════════════════════════════════════

import type { FormData, FunnelResult } from "@/types/funnel";
import type { CampaignBenchmark } from "./campaignAnalyticsEngine";
import { findBenchmark } from "./campaignAnalyticsEngine";

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
  benchmarks: CampaignBenchmark[]
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

  return {
    successProbability: Math.round(probability),
    budgetEfficiency,
    riskFactors,
    recommendations,
    confidence: Math.round(confidence * 100) / 100,
    basedOnSamples,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
