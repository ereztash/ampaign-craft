// ═══════════════════════════════════════════════
// Φ_META_AGENT — Ontological Survival Metrics
//
// Runs at the end of the topological sort (depends on all major agents).
// Reads the cycle's telemetry logs from the Blackboard, computes:
//
//   1. Rejection Rate  — % of writes rejected per agent/tier
//   2. Semantic Half-Life — average survival time of data before overwrite
//   3. J gradient      — J = ∂I/∂Ω = 1 − systemRejectionRate
//
// If any agent's rejection rate exceeds REJECTION_THRESHOLD (15%),
// writes a downgrade recommendation to the metaMetrics payload.
//
// All computation is synchronous and pure (no LLM, no I/O).
// ═══════════════════════════════════════════════

import type { AgentDefinition } from "../agentRunner";
import type { Blackboard } from "../blackboardStore";
import type { MetaMetrics, AgentMetaStats } from "../blackboardStore";

// ═══════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════

/** Rejection rate above this threshold triggers a downgrade recommendation. */
const REJECTION_THRESHOLD = 0.15; // 15%

/**
 * All known agent names in the pipeline.
 * Listed as dependencies so the meta-agent always runs last in the
 * topological sort. Missing agents are silently skipped by the runner.
 */
const ALL_KNOWN_AGENTS = [
  // Core sync agents
  "knowledgeGraph",
  "funnel",
  "disc",
  "hormozi",
  "closing",
  "coi",
  "retention",
  "health",
  // QA pipeline (Phase 2)
  "qaStatic",
  "qaContent",
  "qaSecurity",
  "qaOrchestrator",
] as const;

// ═══════════════════════════════════════════════
// Pure computation helpers
// ═══════════════════════════════════════════════

/**
 * Build per-agent stats from the cycle's success and rejection logs.
 * Pure function — no side effects.
 */
function buildPerAgentStats(
  successEntries: ReadonlyArray<{ agentName: string; modelTier?: string }>,
  rejectionEntries: ReadonlyArray<{ agentName: string; modelTier?: string; reason: string }>,
): AgentMetaStats[] {
  // Aggregate by agent name
  const map = new Map<
    string,
    { writes: number; rejections: number; tier?: string }
  >();

  for (const e of successEntries) {
    const existing = map.get(e.agentName) ?? { writes: 0, rejections: 0, tier: e.modelTier };
    map.set(e.agentName, { ...existing, writes: existing.writes + 1 });
  }

  for (const e of rejectionEntries) {
    const existing = map.get(e.agentName) ?? { writes: 0, rejections: 0, tier: e.modelTier };
    map.set(e.agentName, { ...existing, rejections: existing.rejections + 1 });
  }

  return Array.from(map.entries()).map(([agentName, stats]) => {
    const total = stats.writes + stats.rejections;
    const rejectionRate = total > 0 ? stats.rejections / total : 0;

    const recommendation =
      rejectionRate > REJECTION_THRESHOLD
        ? buildRecommendation(agentName, stats.tier, rejectionRate)
        : undefined;

    return {
      agentName,
      modelTier: stats.tier,
      totalWrites: stats.writes,
      totalRejections: stats.rejections,
      rejectionRate,
      recommendation,
    };
  });
}

/**
 * Generate a remediation recommendation when rejection rate exceeds threshold.
 * Suggestions are tier-aware:
 *  - fast tier → enforce stricter JSON schema or move to standard
 *  - standard  → reduce prompt complexity or add output validation
 *  - deep      → check for identity writes (model may be over-thinking)
 */
function buildRecommendation(
  agentName: string,
  tier: string | undefined,
  rate: number,
): string {
  const pct = (rate * 100).toFixed(1);
  const threshold = (REJECTION_THRESHOLD * 100).toFixed(0);

  if (tier === "fast") {
    return (
      `[Φ] ${agentName} rejection rate ${pct}% > ${threshold}% threshold. ` +
      `Fast-tier agent: enforce stricter output schema in userPrompt, ` +
      `or promote to "standard" tier for higher schema compliance.`
    );
  }
  if (tier === "standard") {
    return (
      `[Φ] ${agentName} rejection rate ${pct}% > ${threshold}% threshold. ` +
      `Reduce prompt complexity, add explicit schema constraints, ` +
      `or check for identity_write patterns (agent outputting unchanged values).`
    );
  }
  if (tier === "deep") {
    return (
      `[Φ] ${agentName} rejection rate ${pct}% > ${threshold}% threshold. ` +
      `Deep-tier agent: check for empty_object or identity_write rejections — ` +
      `the model may be over-generating without contributing new information.`
    );
  }
  return (
    `[Φ] ${agentName} rejection rate ${pct}% > ${threshold}% threshold. ` +
    `Review agent output parser and verify schema alignment with boardSection contract.`
  );
}

/**
 * Compute the mean of a numeric array. Returns null for empty arrays.
 */
function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ═══════════════════════════════════════════════
// Agent Definition
// ═══════════════════════════════════════════════

export const metaAgent: AgentDefinition = {
  name: "metaAgent",

  /**
   * Dependencies include all known pipeline agents.
   * The runner silently skips any that are not registered,
   * so this list is safe to extend without breaking smaller pipelines.
   */
  dependencies: [...ALL_KNOWN_AGENTS],

  writes: ["metaMetrics"],

  run(board: Blackboard): void {
    const rejections = board.getRejectionLog();
    const halfLifes = board.getHalfLifeLog();
    const successes = board.getSuccessLog();
    const cycleStartMs = board.getCycleStartMs();
    const now = Date.now();

    // ── Per-agent breakdown ─────────────────────
    const perAgent = buildPerAgentStats(successes, rejections);

    // ── System-wide rejection rate ──────────────
    const totalAttempts = successes.length + rejections.length;
    const systemRejectionRate =
      totalAttempts > 0 ? rejections.length / totalAttempts : 0;

    // ── J gradient (information gain ratio) ─────
    // J = ∂I/∂Ω ≈ 1 − systemRejectionRate
    // J = 1 → all writes accepted (maximum information gain)
    // J = 0 → all writes rejected (identity stasis / total information lock)
    const jGradient = 1 - systemRejectionRate;

    // ── Semantic Half-Life ───────────────────────
    const survivalTimes = halfLifes.map((e) => e.survivalMs);
    const avgHalfLifeMs = mean(survivalTimes);

    // ── Flagged agents ───────────────────────────
    const flaggedAgents = perAgent
      .filter((a) => a.rejectionRate > REJECTION_THRESHOLD)
      .map((a) => a.agentName);

    // ── Write to board ───────────────────────────
    const metrics: MetaMetrics = {
      cycleId: cycleStartMs.toString(),
      evaluatedAt: now,
      cycleDurationMs: now - cycleStartMs,
      systemRejectionRate,
      jGradient,
      avgHalfLifeMs,
      perAgent,
      flaggedAgents,
    };

    // Use board.set() directly — metaAgent is exempt from verifiedSet()
    // because it IS the telemetry consumer (no self-referential rejection loop).
    board.set("metaMetrics", metrics);
  },
};
