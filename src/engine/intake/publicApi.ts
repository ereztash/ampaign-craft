// ═══════════════════════════════════════════════
// src/engine/intake/publicApi.ts
//
// Phase-4 architectural seam — gated by VITE_ENGINES_API_ENABLED.
//
// This file is the contract for "FunnelForge classification engines as
// a service": when a customer of a FunnelForge user lands on a quiz
// embed or a partner site, the answers run through this function and
// return a routing decision + behavioral signals.
//
// Current state: gated runtime check + clean wrapper. The actual
// hosting (Supabase edge fn / standalone API) is not part of this
// commit — but every consumer should already use this entrypoint so
// the swap is mechanical when we activate.
//
// Design principles:
// - Pure: never touches localStorage, never reads window.
// - Synchronous: no AI, no network. Determinism is a feature here.
// - Backwards-compatible: adding fields is non-breaking; removing or
//   renaming requires a v2 export.
// ═══════════════════════════════════════════════

import { resolveIntake } from "./intakeMatrix";
import type {
  IntakeNeed,
  IntakePain,
  IntakeRouting,
} from "./types";
import { classifyArchetype } from "@/engine/archetypeClassifier";
import { inferDISCProfile } from "@/engine/discProfileEngine";
import type { FormData } from "@/types/funnel";
import type { ArchetypeId } from "@/types/archetype";
import type { DISCProfile } from "@/engine/discProfileEngine";

/** Public input contract — keep field names stable. */
export interface ClassifyLeadInput {
  need: IntakeNeed;
  pain: IntakePain;
  /**
   * Optional richer FormData for deeper classification. When present,
   * the response carries archetype + DISC. When absent, only the
   * routing is returned.
   */
  formData?: FormData;
  /**
   * Caller-supplied id used by host integrations to correlate this
   * classification with their own records. Echoed back unchanged.
   */
  externalRefId?: string;
}

/** Public output contract — additive only. */
export interface ClassifyLeadOutput {
  /** Echo of the caller-supplied externalRefId (or undefined). */
  externalRefId?: string;
  /** Always present — the (need × pain) routing. */
  routing: IntakeRouting;
  /** Archetype classification, if formData was supplied. */
  archetype?: ArchetypeId;
  /** DISC primary letter, if formData was supplied. */
  discPrimary?: DISCProfile["primary"];
  /** Stable schema version. Bump on any breaking change. */
  apiVersion: "1.0";
  /** ISO timestamp of the classification. */
  classifiedAt: string;
}

/**
 * Returns true iff the engines-API surface has been activated. Used
 * by hosts to decide whether to call classifyLead at all.
 */
export function isEnginesApiEnabled(): boolean {
  return import.meta.env.VITE_ENGINES_API_ENABLED === "true";
}

/**
 * Classify a lead. Throws when the API is gated off (deliberately —
 * callers should check `isEnginesApiEnabled()` before calling).
 *
 * Pure beyond the timestamp. Can be safely called from a worker, an
 * edge function, or inline. No I/O, no localStorage, no logging.
 */
export function classifyLead(input: ClassifyLeadInput): ClassifyLeadOutput {
  if (!isEnginesApiEnabled()) {
    throw new Error(
      "engines-API is not enabled. Set VITE_ENGINES_API_ENABLED=true.",
    );
  }

  const routing = resolveIntake(input.need, input.pain);

  let archetype: ArchetypeId | undefined;
  let discPrimary: DISCProfile["primary"] | undefined;

  if (input.formData) {
    try {
      archetype = classifyArchetype({ formData: input.formData }).archetypeId;
    } catch { /* archetype is optional; never fail the whole call */ }
    try {
      discPrimary = inferDISCProfile(input.formData).primary;
    } catch { /* DISC is optional; never fail the whole call */ }
  }

  return {
    externalRefId: input.externalRefId,
    routing,
    archetype,
    discPrimary,
    apiVersion: "1.0",
    classifiedAt: new Date().toISOString(),
  };
}
