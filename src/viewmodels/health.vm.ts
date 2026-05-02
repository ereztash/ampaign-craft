// ─── Health ViewModel ────────────────────────────────────────────────────────
// Bridge between healthScoreEngine output and UI props.
// Components import from here, never directly from the engine.

import type { HealthScore, HealthScoreBreakdown } from "@/engine/healthScoreEngine";
import { getHealthScoreColor } from "@/engine/healthScoreEngine";
import type { BilingualText } from "@/types/i18n";

export type { HealthScore, HealthScoreBreakdown };

export interface HealthScoreBreakdownVM {
  category: string;
  label: BilingualText;
  score: number;
  maxScore: number;
  /** Pre-computed 0-100 percentage for progress bars. */
  scorePercent: number;
  tips: BilingualText[];
}

export interface HealthScoreVM {
  total: number;
  tier: "critical" | "needs-work" | "good" | "excellent";
  /** Hex or CSS color ready for inline styles. */
  color: string;
  breakdown: HealthScoreBreakdownVM[];
  /** The single worst-performing category; null when breakdown is empty. */
  worstCategory: (HealthScoreBreakdownVM & { firstTip: BilingualText | null }) | null;
  retentionReadiness: {
    score: number;
    riskTier: string;
    nrrProjection: { current: number; withIntervention: number };
  } | null;
}

export function toHealthScoreVM(hs: HealthScore): HealthScoreVM {
  const breakdown: HealthScoreBreakdownVM[] = hs.breakdown.map((b) => ({
    category: b.category,
    label: b.label,
    score: b.score,
    maxScore: b.maxScore,
    scorePercent: b.maxScore > 0 ? Math.round((b.score / b.maxScore) * 100) : 0,
    tips: b.tips,
  }));

  const worst =
    breakdown.length > 0
      ? breakdown.reduce((w, b) => (b.scorePercent < w.scorePercent ? b : w))
      : null;

  return {
    total: hs.total,
    tier: hs.tier,
    color: getHealthScoreColor(hs.total),
    breakdown,
    worstCategory: worst ? { ...worst, firstTip: worst.tips[0] ?? null } : null,
    retentionReadiness: hs.retentionReadiness ?? null,
  };
}

/** Re-exported so components never need to reach into the engine for this util. */
export { getHealthScoreColor };
