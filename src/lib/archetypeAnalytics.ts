// ═══════════════════════════════════════════════
// Archetype Analytics — fire-and-forget event emitter
//
// Events defined in the implementation plan §7 (Analytics):
//   archetype_revealed          — user saw the ArchetypeRevealScreen
//   archetype_opted_in          — user accepted personalisation
//   archetype_opted_out         — user declined or disabled personalisation
//   archetype_override_changed  — manual archetype change via Profile/Admin
//   blindspot_nudge_shown       — BlindSpotNudge appeared
//   blindspot_nudge_dismissed   — BlindSpotNudge dismissed (x / cta / timeout)
//   theme_pack_applied          — theme pack became active for first time
//
// Transport: structured console.info (captured by Vercel/monitoring).
// analytics-ingest edge function is not yet deployed; this logger
// preserves event visibility until that function ships.
// The emitter is intentionally synchronous to call-site — it never
// blocks user interaction and never throws to the caller.
// ═══════════════════════════════════════════════

import type { ArchetypeId, ConfidenceTier } from "@/types/archetype";

export type ArchetypeEventName =
  | "archetype_revealed"
  | "archetype_opted_in"
  | "archetype_opted_out"
  | "archetype_override_changed"
  | "blindspot_nudge_shown"
  | "blindspot_nudge_dismissed"
  | "theme_pack_applied";

export type NudgeDismissReason = "x" | "cta_followed" | "auto_timeout";
export type RevealSource = "auto" | "manual_profile" | "manual_sidebar";

interface ArchetypeEventPayload {
  archetypeId?: ArchetypeId;
  tier?: ConfidenceTier;
  source?: RevealSource | string;
  moduleId?: string;
  dwellDays?: number;
  dismissReason?: NudgeDismissReason;
  fromArchetype?: ArchetypeId;
  toArchetype?: ArchetypeId;
  dimensionsApplied?: string[];
}

/**
 * Emit an archetype-related analytics event.
 * Fire-and-forget — never throws to caller.
 */
export function emitArchetypeEvent(
  name: ArchetypeEventName,
  payload: ArchetypeEventPayload = {},
): void {
  const event = {
    name,
    payload,
    emittedAt: new Date().toISOString(),
  };

  if (import.meta.env.DEV) {
    console.debug("[archetypeAnalytics]", name, payload);
  } else {
    // Structured log captured by Vercel runtime / monitoring ingestion
    console.info("[archetypeAnalytics]", JSON.stringify(event));
  }
}
