/**
 * renderGate — single source of truth for UI complexity gating.
 *
 * Replaces three uncoordinated boolean checks scattered across the codebase:
 *   • experienceLevel === "beginner"     (adaptiveTabRules)
 *   • confidenceTier === "none"          (archetype components)
 *   • cognitiveLoad > 70 (shouldSimplify) (behavioralActionEngine)
 *
 * All three are collapsed into one FoggTier derived from the Fogg B=MAT score
 * (motivation × ability × triggerReadiness). When a live foggScore is available
 * it takes full priority; otherwise, the individual signals are averaged into a
 * synthetic score so cold-start renders remain predictable.
 *
 * Thresholds (calibrated to the BAE COR fatigue + confidence curves):
 *   LOW    < 0.20  → simplified mode  (replaces isBeginner / cognitiveLoad > 70)
 *   MEDIUM 0.20–0.50 → standard mode
 *   HIGH   ≥ 0.50  → full / advanced mode  (replaces isAdvanced)
 */

export type FoggTier = "low" | "medium" | "high";

export const FOGG_LOW_THRESHOLD = 0.2;
export const FOGG_HIGH_THRESHOLD = 0.5;

export function classifyFoggTier(foggScore: number): FoggTier {
  if (foggScore < FOGG_LOW_THRESHOLD)  return "low";
  if (foggScore < FOGG_HIGH_THRESHOLD) return "medium";
  return "high";
}

export interface RenderGateSignals {
  /** Live Fogg B=MAT score from behavioralActionEngine (0-1). Preferred. */
  foggScore?: number;
  /** Fallback when BAE hasn't run yet. */
  experienceLevel?: string;
  /** Fallback — archetype classification confidence. */
  confidenceTier?: string;
  /** Fallback — COR cognitive load (0-100). */
  cognitiveLoad?: number;
}

/**
 * Derives a unified FoggTier from any combination of the four signals.
 * When foggScore is present it wins outright. Otherwise a synthetic score
 * is computed from the other three signals so the gate degrades gracefully
 * during cold start or before BAE has run.
 */
export function deriveFoggTier(signals: RenderGateSignals): FoggTier {
  if (signals.foggScore !== undefined) {
    return classifyFoggTier(signals.foggScore);
  }

  // Map experienceLevel → 0-1
  const experienceScore =
    signals.experienceLevel === "advanced"     ? 0.75 :
    signals.experienceLevel === "intermediate" ? 0.45 :
    0.15; // beginner or empty

  // Map confidenceTier → 0-1
  const confidenceScore =
    signals.confidenceTier === "strong"    ? 0.80 :
    signals.confidenceTier === "confident" ? 0.60 :
    signals.confidenceTier === "tentative" ? 0.35 :
    0.15; // "none" or missing

  // Map cognitiveLoad → ability proxy (inverted)
  const abilityScore =
    signals.cognitiveLoad !== undefined
      ? Math.max(0, 1 - signals.cognitiveLoad / 100)
      : 0.50; // unknown → assume neutral

  const synthetic = (experienceScore + confidenceScore + abilityScore) / 3;
  return classifyFoggTier(synthetic);
}

export interface RenderGate {
  tier: FoggTier;
  /** LOW tier — show simplified / beginner-friendly views. */
  isSimplified: boolean;
  /** HIGH tier — show full / advanced views. */
  isFull: boolean;
}

/**
 * Pure function — call in component render or useMemo.
 * Returns one object with all gating flags components need.
 *
 * @example
 * const gate = computeRenderGate({ foggScore: motivationState.foggScore });
 * // then: gate.isSimplified, gate.isFull, gate.tier
 */
export function computeRenderGate(signals: RenderGateSignals): RenderGate {
  const tier = deriveFoggTier(signals);
  return {
    tier,
    isSimplified: tier === "low",
    isFull: tier === "high",
  };
}
