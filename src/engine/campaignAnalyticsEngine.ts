// ═══════════════════════════════════════════════
// Campaign Analytics Engine — Proprietary Data Moat
// Aggregates saved plan data to generate industry benchmarks.
// Powers the "Cornered Resource" strategic moat.
// ═══════════════════════════════════════════════

import type { FunnelResult, FormData, SavedPlan } from "@/types/funnel";
import {
  writeContext,
  conceptKey,
  type BlackboardWriteContext,
} from "./blackboard/contract";

export const ENGINE_MANIFEST = {
  name: "campaignAnalyticsEngine",
  reads: ["CAMPAIGN-plans-*"],
  writes: ["CAMPAIGN-benchmarks-*"],
  stage: "deploy",
  isLive: true,
  parameters: ["Campaign analytics"],
} as const;

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export interface CampaignBenchmark {
  industry: string;
  audienceType: string;
  metric: string;
  value: number;
  sampleSize: number;
  confidence: number; // 0-1
  updatedAt: string;
}

export interface IndustryInsight {
  industry: string;
  topChannels: { channel: string; frequency: number }[];
  avgBudgetRange: { min: number; max: number };
  avgStageCount: number;
  commonGoals: { goal: string; frequency: number }[];
  sampleSize: number;
}

export interface AnalyticsResult {
  benchmarks: CampaignBenchmark[];
  industryInsights: IndustryInsight[];
  totalPlansAnalyzed: number;
  generatedAt: string;
}

// ═══════════════════════════════════════════════
// BENCHMARK GENERATION
// ═══════════════════════════════════════════════

/**
 * Generate benchmarks from a collection of saved plans.
 * This runs client-side on the user's own plans.
 * Server-side aggregation (across all users) would use the
 * campaign_benchmarks table via an Edge Function.
 */
export function generateBenchmarks(
  plans: SavedPlan[],
  blackboardCtx?: BlackboardWriteContext,
  ukg?: import("./userKnowledgeGraph").UserKnowledgeGraph,
): AnalyticsResult {
  if (plans.length === 0) {
    return {
      benchmarks: [],
      industryInsights: [],
      totalPlansAnalyzed: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  const benchmarks: CampaignBenchmark[] = [];
  const industryMap = new Map<string, SavedPlan[]>();

  // Group plans by industry
  for (const plan of plans) {
    const industry = plan.result.formData?.businessField || "unknown";
    const existing = industryMap.get(industry) || [];
    existing.push(plan);
    industryMap.set(industry, existing);
  }

  // Generate per-industry benchmarks
  for (const [industry, industryPlans] of industryMap) {
    const results = industryPlans.map((p) => p.result);
    const formDatas = results.map((r) => r.formData).filter(Boolean);

    // Average stage count
    const avgStages = avg(results.map((r) => r.stages.length));
    benchmarks.push({
      industry,
      audienceType: "all",
      metric: "avg_stage_count",
      value: round(avgStages, 1),
      sampleSize: results.length,
      confidence: confidenceFromSample(results.length),
      updatedAt: new Date().toISOString(),
    });

    // Average budget
    const budgets = results
      .map((r) => (r.totalBudget.min + r.totalBudget.max) / 2)
      .filter((b) => b > 0);
    if (budgets.length > 0) {
      benchmarks.push({
        industry,
        audienceType: "all",
        metric: "avg_budget_nis",
        value: round(avg(budgets), 0),
        sampleSize: budgets.length,
        confidence: confidenceFromSample(budgets.length),
        updatedAt: new Date().toISOString(),
      });
    }

    // Average hook count
    const hookCounts = results.map((r) => r.hookTips?.length || 0);
    benchmarks.push({
      industry,
      audienceType: "all",
      metric: "avg_hooks_per_plan",
      value: round(avg(hookCounts), 1),
      sampleSize: results.length,
      confidence: confidenceFromSample(results.length),
      updatedAt: new Date().toISOString(),
    });

    // Channel frequency
    const channelCounts = new Map<string, number>();
    for (const result of results) {
      for (const stage of result.stages) {
        for (const ch of stage.channels || []) {
          const name = ch.channel || ch.name?.en || "unknown";
          channelCounts.set(name, (channelCounts.get(name) || 0) + 1);
        }
      }
    }

    // Goal frequency
    const goalCounts = new Map<string, number>();
    for (const fd of formDatas) {
      if (fd?.mainGoal) {
        goalCounts.set(fd.mainGoal, (goalCounts.get(fd.mainGoal) || 0) + 1);
      }
    }

    // By audience type
    for (const audienceType of ["b2b", "b2c"]) {
      const audiencePlans = results.filter((r) => r.formData?.audienceType === audienceType);
      if (audiencePlans.length > 0) {
        benchmarks.push({
          industry,
          audienceType,
          metric: "avg_stage_count",
          value: round(avg(audiencePlans.map((r) => r.stages.length)), 1),
          sampleSize: audiencePlans.length,
          confidence: confidenceFromSample(audiencePlans.length),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  // Generate industry insights
  const industryInsights: IndustryInsight[] = [];
  for (const [industry, industryPlans] of industryMap) {
    const results = industryPlans.map((p) => p.result);
    const formDatas = results.map((r) => r.formData).filter(Boolean);

    const channelCounts = new Map<string, number>();
    for (const result of results) {
      for (const stage of result.stages) {
        for (const ch of stage.channels || []) {
          const name = ch.channel || ch.name?.en || "unknown";
          channelCounts.set(name, (channelCounts.get(name) || 0) + 1);
        }
      }
    }

    const goalCounts = new Map<string, number>();
    for (const fd of formDatas) {
      if (fd?.mainGoal) {
        goalCounts.set(fd.mainGoal, (goalCounts.get(fd.mainGoal) || 0) + 1);
      }
    }

    const budgets = results
      .map((r) => (r.totalBudget.min + r.totalBudget.max) / 2)
      .filter((b) => b > 0);

    industryInsights.push({
      industry,
      topChannels: [...channelCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([channel, frequency]) => ({ channel, frequency })),
      avgBudgetRange: {
        min: budgets.length > 0 ? Math.min(...budgets) : 0,
        max: budgets.length > 0 ? Math.max(...budgets) : 0,
      },
      avgStageCount: round(avg(results.map((r) => r.stages.length)), 1),
      commonGoals: [...goalCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([goal, frequency]) => ({ goal, frequency })),
      sampleSize: results.length,
    });
  }

  const result: AnalyticsResult = {
    benchmarks,
    industryInsights,
    totalPlansAnalyzed: plans.length,
    generatedAt: new Date().toISOString(),
  };

  if (blackboardCtx) {
    void writeContext({
      userId: blackboardCtx.userId,
      planId: blackboardCtx.planId,
      key: conceptKey("CAMPAIGN", "benchmarks", blackboardCtx.planId ?? blackboardCtx.userId),
      stage: "deploy",
      payload: {
        benchmarkCount: result.benchmarks.length,
        industryCount: result.industryInsights.length,
        totalPlansAnalyzed: result.totalPlansAnalyzed,
      },
      writtenBy: ENGINE_MANIFEST.name,
    }).catch(() => {});
  }

  return result;
}

/**
 * Find the most relevant benchmark for a given context.
 */
export function findBenchmark(
  benchmarks: CampaignBenchmark[],
  industry: string,
  metric: string,
  audienceType = "all"
): CampaignBenchmark | undefined {
  // Try exact match first
  const exact = benchmarks.find(
    (b) => b.industry === industry && b.metric === metric && b.audienceType === audienceType
  );
  if (exact) return exact;

  // Fallback to "all" audience type
  return benchmarks.find(
    (b) => b.industry === industry && b.metric === metric && b.audienceType === "all"
  );
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function confidenceFromSample(n: number): number {
  // Simple heuristic: confidence increases with sample size
  if (n >= 50) return 0.95;
  if (n >= 20) return 0.85;
  if (n >= 10) return 0.7;
  if (n >= 5) return 0.5;
  if (n >= 2) return 0.3;
  return 0.1;
}
