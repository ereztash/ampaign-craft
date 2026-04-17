// A/B Variant Infrastructure — ENV-based, no external service required.
//
// Variants are defined in ENV as: VITE_AB_<EXPERIMENT_ID>=<variant>
// Example: VITE_AB_LANDING_CTA=control | challenger
//
// Assignment is deterministic per-user (djb2 hash of userId + experimentId)
// when userId is available; falls back to ENV override; falls back to "control".
//
// Usage:
//   const variant = getVariant("landing_cta", userId);
//   if (variant === "challenger") { ... }
//
// Track exposure:
//   trackVariantExposure("landing_cta", variant, userId);

import { track } from "./analytics";

export type VariantId = string;

const VARIANTS_PER_EXPERIMENT: Record<string, VariantId[]> = {
  landing_cta:      ["control", "challenger"],
  onboarding_flow:  ["control", "short"],
  pricing_display:  ["control", "value_focused"],
};

// djb2 hash — same function as referralEngine, kept local to avoid circular imports
function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) + s.charCodeAt(i);
    h &= h;
  }
  return Math.abs(h);
}

/**
 * Get the variant for a given experiment.
 *
 * Priority:
 * 1. ENV override: VITE_AB_<EXPERIMENT_ID_UPPER>=<variant>
 * 2. Deterministic assignment via djb2(userId + experimentId)
 * 3. "control" fallback
 */
export function getVariant(experimentId: string, userId?: string): VariantId {
  const envKey = `VITE_AB_${experimentId.toUpperCase().replace(/-/g, "_")}`;
  const envOverride = (import.meta.env as Record<string, string>)[envKey];
  if (envOverride) return envOverride;

  const variants = VARIANTS_PER_EXPERIMENT[experimentId];
  if (!variants || variants.length === 0) return "control";
  if (!userId) return "control";

  const hash = djb2(`${userId}:${experimentId}`);
  return variants[hash % variants.length];
}

/**
 * Track that a user was exposed to a variant.
 * Fire once per session per experiment.
 */
const _exposed = new Set<string>();

export function trackVariantExposure(experimentId: string, variant: VariantId, userId?: string): void {
  const key = `${experimentId}:${variant}:${userId ?? "anon"}`;
  if (_exposed.has(key)) return;
  _exposed.add(key);

  void track("aarrr.activation.aha_moment", {
    trigger: `ab_exposure:${experimentId}`,
    variant,
    experiment: experimentId,
  }, { userId, uiOnly: true });
}

/**
 * Hook-friendly helper — returns variant and tracks exposure on first call.
 */
export function useVariant(experimentId: string, userId?: string): VariantId {
  const variant = getVariant(experimentId, userId);
  trackVariantExposure(experimentId, variant, userId);
  return variant;
}

/** List all active experiments and their current ENV overrides. */
export function getExperimentOverrides(): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.keys(VARIANTS_PER_EXPERIMENT).map((id) => {
      const envKey = `VITE_AB_${id.toUpperCase().replace(/-/g, "_")}`;
      return [id, (import.meta.env as Record<string, string>)[envKey]];
    })
  );
}
