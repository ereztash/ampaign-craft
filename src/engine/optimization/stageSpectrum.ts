// ═══════════════════════════════════════════════
// E4 / M7 — Stage Spectrum Engine
//
// Reads the recent blackboard writes for a user and computes the
// distribution of writes across the three cascade stages:
//   discover → process → deploy
//
// When one stage holds more than 70% of the recent writes the
// cascade is considered blocked at that stage. The signal is
// propagated through ReflectiveContext.stage_spectrum and
// generateReflectiveAction will override its next_step with a
// movement-flavored sentence that pushes from the blocked stage
// to the next one in the cascade.
//
// Pure counting, no ML. The async fetch wrapper delegates to
// blackboardClient.readRecent and is the ONLY place in this file
// that touches I/O.
//
// Principle: "decision latency" — the blocked stage is exactly the
// point where information has turned into latency. The engine is
// required to propose a motion that shortens that latency.
// ═══════════════════════════════════════════════

import type { BlackboardWrite } from "./ontologicalVerifier";
import { readRecent } from "./blackboardClient";

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

export type CascadeStage = "discover" | "process" | "deploy";

export interface StageDistribution {
  discover: number;
  process: number;
  deploy: number;
  concentration: number; // max(counts) / sum(counts), or 0 when sum=0
  blocked_stage: CascadeStage | null;
  cascade_blocked: boolean; // true when concentration > CASCADE_THRESHOLD
  sample_size: number;
}

// ───────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────

export const CASCADE_THRESHOLD = 0.7;
export const DEFAULT_FETCH_LIMIT = 20;

const EMPTY_DISTRIBUTION: StageDistribution = {
  discover: 0,
  process: 0,
  deploy: 0,
  concentration: 0,
  blocked_stage: null,
  cascade_blocked: false,
  sample_size: 0,
};

// ───────────────────────────────────────────────
// Cascade helpers
// ───────────────────────────────────────────────

/**
 * The next stage in the cascade, or null when we're already at the
 * terminal stage (deploy). A null result forces the engine to emit
 * the E4 watch instead of a movement next_step.
 */
export function nextStageInCascade(
  blocked: CascadeStage,
): CascadeStage | null {
  if (blocked === "discover") return "process";
  if (blocked === "process") return "deploy";
  return null;
}

// ───────────────────────────────────────────────
// Public API — pure compute
// ───────────────────────────────────────────────

/**
 * Count how the given writes distribute across the three cascade
 * stages and decide whether the cascade is blocked at any one stage.
 *
 * Only stages in the verifier enum contribute to the count; anything
 * else is silently ignored (the boundary layer already drops
 * unknown stages, so this is belt-and-suspenders).
 */
export function computeStageDistribution(
  writes: BlackboardWrite[],
): StageDistribution {
  if (!Array.isArray(writes) || writes.length === 0) {
    return { ...EMPTY_DISTRIBUTION };
  }

  let discover = 0;
  let process = 0;
  let deploy = 0;

  for (const w of writes) {
    if (!w || typeof w !== "object") continue;
    switch (w.stage) {
      case "discover":
        discover += 1;
        break;
      case "process":
        process += 1;
        break;
      case "deploy":
        deploy += 1;
        break;
      default:
        // unknown stage — ignore
        break;
    }
  }

  const sample_size = discover + process + deploy;
  if (sample_size === 0) return { ...EMPTY_DISTRIBUTION };

  // Find the stage with the highest count. Ties resolve in cascade
  // order (discover → process → deploy) to keep the result
  // deterministic: if two stages tie for the max, the upstream one
  // is considered blocked because it's the closer bottleneck.
  let max = discover;
  let dominant: CascadeStage = "discover";
  if (process > max) {
    max = process;
    dominant = "process";
  }
  if (deploy > max) {
    max = deploy;
    dominant = "deploy";
  }

  const concentration = max / sample_size;
  const cascade_blocked = concentration > CASCADE_THRESHOLD;

  return {
    discover,
    process,
    deploy,
    concentration,
    blocked_stage: cascade_blocked ? dominant : null,
    cascade_blocked,
    sample_size,
  };
}

// ───────────────────────────────────────────────
// Public API — async fetch wrapper
// ───────────────────────────────────────────────

/**
 * Fetch the N most recent writes for a user and compute the stage
 * distribution. Returns an empty distribution on any failure or
 * when no writes are found — the engine treats that as "no signal"
 * and does not intervene.
 */
export async function fetchRecentStageDistribution(
  user_id: string,
  limit: number = DEFAULT_FETCH_LIMIT,
): Promise<StageDistribution> {
  const writes = await readRecent(user_id, limit);
  return computeStageDistribution(writes);
}
