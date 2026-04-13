// ═══════════════════════════════════════════════
// useArchetypeCopyTone — Lightweight copy tone accessor
// Returns null when confidence is "none" (cold start / ambiguous profile).
// Consumers use it to switch between pre-defined copy variants.
// ═══════════════════════════════════════════════

import { useArchetype } from "@/contexts/ArchetypeContext";
import type { CTATone } from "@/types/archetype";

/**
 * Returns the CTA tone for the current user's archetype, or null if not yet
 * confident enough to personalize (confidenceTier === "none").
 *
 * Usage:
 *   const tone = useArchetypeCopyTone();
 *   const label = tone === "urgency" ? "סגור עכשיו" : "התחל";
 */
export function useArchetypeCopyTone(): CTATone | null {
  const { uiConfig, confidenceTier } = useArchetype();
  if (confidenceTier === "none") return null;
  return uiConfig.ctaTone;
}
