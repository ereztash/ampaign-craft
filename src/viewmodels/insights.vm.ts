// ─── Insights ViewModel ──────────────────────────────────────────────────────
// Bridges bottleneckEngine, insightsEngine, weeklyLoopEngine → UI props.

import type { Bottleneck, BottleneckModule, BottleneckSeverity } from "@/engine/bottleneckEngine";
import { selectTactic, detectBottlenecks } from "@/engine/bottleneckEngine";
import type { BusinessInsight } from "@/engine/insightsEngine";
import { generateInsights } from "@/engine/insightsEngine";
import type { LoopSnapshot, WeeklyCommitment, LoopState } from "@/engine/weeklyLoopEngine";
import {
  commitToAction,
  reportOutcome,
  startNewWeek,
  getStreak,
  getLoopSnapshot,
  getInsightUsageCount,
} from "@/engine/weeklyLoopEngine";
import type { BilingualText } from "@/types/i18n";

// ── Re-exports (components import types from here, never the engine) ──────────
export type { BottleneckModule, BottleneckSeverity, LoopState };
export type { Bottleneck, LoopSnapshot, WeeklyCommitment, BusinessInsight };
export { selectTactic, detectBottlenecks, generateInsights, commitToAction, reportOutcome, startNewWeek, getStreak, getLoopSnapshot, getInsightUsageCount };
export type { ReportOutcome } from "@/engine/weeklyLoopEngine";
export { abandonCommitment, continueCommitment } from "@/engine/weeklyLoopEngine";
export { generateWeeklyPulse } from "@/engine/pulseEngine";

// ── InsightVM ─────────────────────────────────────────────────────────────────

export interface InsightVM {
  id: string;
  type: "win" | "pattern" | "risk" | "tip";
  title: BilingualText;
  body: BilingualText;
  metric?: string;
  /** Normalised 0-100 for badge display. */
  confidencePct: number;
}

export function toInsightVM(insight: BusinessInsight): InsightVM {
  return {
    id: insight.id,
    type: insight.type,
    title: insight.title,
    body: insight.body,
    metric: insight.metric,
    confidencePct: Math.round(insight.confidence * 100),
  };
}

// ── BottleneckVM ──────────────────────────────────────────────────────────────

export interface BottleneckVM {
  id: string;
  module: BottleneckModule;
  severity: BottleneckSeverity;
  title: BilingualText;
  description: BilingualText;
  /** The tactic already resolved for the current usage-count level. */
  activeTactic: BilingualText;
  marketContext?: BilingualText;
}

export function toBottleneckVM(bottleneck: Bottleneck, insightUsageCount: number): BottleneckVM {
  const tactic = selectTactic(bottleneck.tactics, insightUsageCount);
  return {
    id: bottleneck.id,
    module: bottleneck.module,
    severity: bottleneck.severity,
    title: bottleneck.title,
    description: bottleneck.description,
    activeTactic: { he: tactic.he, en: tactic.en },
    marketContext: bottleneck.marketContext,
  };
}

// ── LoopStateVM ───────────────────────────────────────────────────────────────

export interface LoopStateVM {
  state: LoopState;
  hasActiveCommitment: boolean;
  commitment: WeeklyCommitment | null;
  commitmentTitle: string | null;
  commitmentModule: string | null;
  daysSinceCommit: number | null;
  daysSinceReport: number | null;
  /** True when a report is overdue (committed but not reported within 8 days). */
  isOverdue: boolean;
}

export function toLoopStateVM(snapshot: LoopSnapshot): LoopStateVM {
  return {
    state: snapshot.state,
    hasActiveCommitment: snapshot.commitment !== null,
    commitment: snapshot.commitment,
    commitmentTitle: snapshot.commitment?.actionTitle ?? null,
    commitmentModule: snapshot.commitment?.module ?? null,
    daysSinceCommit: snapshot.daysSinceCommit,
    daysSinceReport: snapshot.daysSinceReport,
    isOverdue:
      snapshot.commitment !== null &&
      snapshot.commitment.reportedAt === null &&
      (snapshot.daysSinceCommit ?? 0) > 8,
  };
}
