#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════
// Differentiation Pillar Check
//
// Tests the historical 96% differentiation claim against
// the live state of the codebase. The 5 pillars are:
//   1. DISC behavioral profiling
//   2. Hormozi Value Equation
//   3. Neuro-storytelling closing
//   4. Hebrew NLP optimization
//   5. Multi-agent orchestration
//
// A pillar is "real" only if at least one SHIPPED parameter
// covers it AND it has a live engine in the backing set.
// ═══════════════════════════════════════════════

import { scoreMarketGap, type ParameterScore } from "./score-market-gap";

export interface PillarCheck {
  pillar: string;
  parameterIndex: number;
  parameterName: string;
  shipped: boolean;
  liveEngineCount: number;
}

export interface DifferentiationResult {
  pillars: PillarCheck[];
  pillarsShipped: number;
  realDifferentiation: number;     // 0..1
  shippedScore: number;            // mirrored from score-market-gap for caller convenience
}

const PILLAR_TO_PARAM_INDEX: { pillar: string; paramIndex: number }[] = [
  { pillar: "DISC behavioral profiling",   paramIndex: 4 },
  { pillar: "Hormozi Value Equation",      paramIndex: 5 },
  { pillar: "Neuro-storytelling closing",  paramIndex: 6 },
  { pillar: "Hebrew NLP optimization",     paramIndex: 3 },
  { pillar: "Multi-agent orchestration",   paramIndex: 1 },
];

export function differentiationCheck(): DifferentiationResult {
  const score = scoreMarketGap();
  const byIndex = new Map<number, ParameterScore>(
    score.parameters.map((p) => [p.index, p]),
  );

  const pillars: PillarCheck[] = PILLAR_TO_PARAM_INDEX.map(({ pillar, paramIndex }) => {
    const param = byIndex.get(paramIndex);
    if (!param) {
      return {
        pillar,
        parameterIndex: paramIndex,
        parameterName: "(missing)",
        shipped: false,
        liveEngineCount: 0,
      };
    }
    const liveEngineCount = param.resolutions.filter(
      (r) => r.isLiveInRegistry || (r.exists && r.consumerCount >= 3),
    ).length;
    return {
      pillar,
      parameterIndex: paramIndex,
      parameterName: param.name,
      shipped: param.status === "SHIPPED",
      liveEngineCount,
    };
  });

  const pillarsShipped = pillars.filter((p) => p.shipped).length;

  return {
    pillars,
    pillarsShipped,
    realDifferentiation: pillarsShipped / 5,
    shippedScore: score.summary.shippedScore,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = differentiationCheck();
  for (const p of result.pillars) {
    console.log(
      `${p.shipped ? "✓" : "✗"}  ${p.pillar}  →  param #${p.parameterIndex} (${p.parameterName}) — live engines: ${p.liveEngineCount}`,
    );
  }
  console.log(`\nReal differentiation: ${result.pillarsShipped}/5 (${(result.realDifferentiation * 100).toFixed(0)}%)`);
}
