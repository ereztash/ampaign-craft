// ═══════════════════════════════════════════════
// Feature Flags — Lightweight A/B + rollout gate
//
// Priority order:
//  1. localStorage override (dev / QA)
//  2. Supabase remote flags (production — TODO: wire to feature_flags table)
//  3. Default value in FLAG_DEFAULTS
// ═══════════════════════════════════════════════

export type FlagName =
  | "pricing.headline"       // A/B on PricingPage headline: "control" | "roi" | "money"
  | "paywall.archetype"      // Show DISC-specific paywall framing
  | "processing.stages"      // Show labeled Processing screen stages
  | "acquisition.scarcity"   // Show Early Adopter seat counter
  | "dashboard.tab_collapse" // Collapse 12 tabs → 5
  | "hormozi.gauge"          // Show Hormozi offer grade at plan completion
  | "checkout.recovery"      // Enable checkout abandonment recovery emails
  | "referral.leaderboard";  // Show public referral leaderboard

const FLAG_DEFAULTS: Record<FlagName, boolean | string> = {
  "pricing.headline": "control",
  "paywall.archetype": true,
  "processing.stages": true,
  "acquisition.scarcity": true,
  "dashboard.tab_collapse": true,
  "hormozi.gauge": true,
  "checkout.recovery": false, // requires email infra
  "referral.leaderboard": false, // requires Supabase migration
};

const LS_PREFIX = "ff_";

/**
 * Get the value of a feature flag.
 * Returns boolean for on/off flags, string for variant flags.
 */
export function getFlag(name: FlagName): boolean | string {
  try {
    const stored = localStorage.getItem(`${LS_PREFIX}${name}`);
    if (stored !== null) {
      if (stored === "true") return true;
      if (stored === "false") return false;
      return stored;
    }
  } catch {
    // SSR or storage unavailable
  }
  return FLAG_DEFAULTS[name];
}

/**
 * Convenience: returns true when flag is enabled (boolean) or matches variant.
 */
export function isFlagEnabled(name: FlagName, variant?: string): boolean {
  const val = getFlag(name);
  if (variant !== undefined) return val === variant;
  return val === true;
}

/**
 * Override a flag locally (for dev / QA).
 */
export function setFlag(name: FlagName, value: boolean | string): void {
  try {
    localStorage.setItem(`${LS_PREFIX}${name}`, String(value));
  } catch {
    // ignore
  }
}

/**
 * Clear a local override, reverting to default.
 */
export function clearFlag(name: FlagName): void {
  try {
    localStorage.removeItem(`${LS_PREFIX}${name}`);
  } catch {
    // ignore
  }
}
