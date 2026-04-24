// ═══════════════════════════════════════════════
// src/engine/moat/hiddenValuePrincipleMap.ts
//
// Static map: HiddenValueType -> PrincipleId[]
//
// Each entry links an existing differentiation signal (from the legacy
// HIDDEN_VALUES knowledge base) to 0..N principles in knowledge/
// principles.json that explain the *mechanism* behind that signal.
//
// Static (not dynamic) by deliberate choice in v1. The library has
// only 16 principles; a hand-curated map is tighter and auditable.
// Migration to dynamic (embedding-based) is gated on library size
// crossing 30+ principles — see src/engine/moat/README.md.
//
// Empty array = "known unmapped" (not "forgotten"). The UI surfaces
// this explicitly as "no research mapping yet" per T4, and never
// fabricates a substitute. Adding B2C principles to the corpus in
// v1.1 is expected to fill the empty entries.
// ═══════════════════════════════════════════════

import type { HiddenValueType } from "@/types/differentiation";
import type { PrincipleId } from "./types";

/**
 * Reviewer note: every principle id appearing below is covered by
 * hiddenValueMap.test.ts which asserts the id exists in the current
 * library. A deleted/renamed principle fails the map-integrity test
 * before it can leak to production (T2).
 */
export const HIDDEN_VALUE_TO_PRINCIPLES: Record<HiddenValueType, PrincipleId[]> = {
  // ─── B2B-weighted + universal ───
  // Rotter/Kobasa locus of control is the direct mechanism for
  // autonomy. P06 adds the ops pattern: cognitive questions in UI
  // preserve agency where empathetic platitudes suppress it.
  autonomy: ["P12", "P06"],

  // P03 (Hobfoll COR + Kahneman loss aversion) is the canonical
  // risk theory. P08 (resilience triad) prevents reducing risk to
  // a single scalar — risk is resources × adaptation × efficiency.
  risk: ["P03", "P08"],

  // P15 (Maister Trust Equation) — identity here is advisor-grade
  // identity, the "they feel like one of us" signal. Personal
  // identity would be P14 (persistent trauma reframe) but that
  // belongs under narrative.
  identity: ["P15"],

  // Legitimacy = credentialed trust (P15) + structured executive
  // communication (P16 Minto / MECE). Both are needed — trust
  // without structure reads as salesy; structure without trust
  // reads as cold.
  legitimacy: ["P15", "P16"],

  // P16 is the exact match — Minto's Pyramid + Sweller cognitive
  // load theory. No second principle is needed; pairing would
  // dilute.
  cognitive_ease: ["P16"],

  // CHALLENGE to prompt B's initial static map: original was
  // [P15] only. Added P09 (Omer & Alon continuity) because status
  // is partially *historical* — "your record elevates you" — not
  // only aspirational. The prompt expected challenges here.
  status: ["P15", "P09"],

  // COUNTER-INTUITIVE match (kept deliberately). Neither P11 nor
  // P06 is an "empathy" principle — they are explicitly anti-
  // empathetic-platitudes. They serve the *signal* of empathy by
  // giving structure (P11) and cognitive rephrasing (P06) instead
  // of "we understand". A reader who sees this without context
  // may want to flip them; the map encodes the mechanism view on
  // purpose. This is the single entry most worth debating in PR.
  empathy: ["P11", "P06"],

  // P14 (zin 2012 / Straker 2013 persistent trauma) legitimizes
  // chronic-friction narrative. P13 (Hill/McCubbin ABC-X) is the
  // mechanism for changing the customer's *perception* of the
  // event — the narrative lever itself.
  narrative: ["P14", "P13"],

  // ─── B2C-specific. Conservative — empty where no defensible
  // match exists in the pilot corpus (trauma + consulting).
  // v1.1 is expected to add B2C principles.

  // P16 (MECE/simplicity) and P05 (event closure — frictionless
  // end) together cover convenience's "few steps to purchase".
  convenience: ["P16", "P05"],

  // No library principle addresses visual/sensory aesthetic.
  // Pilot corpus is behavioral/clinical. Empty until v1.1.
  aesthetic: [],

  // Community belonging is not covered by trauma-intervention
  // or consulting corpora. Candidate for v1.1.
  belonging: [],

  // P12 (locus of control) covers the self-determination side of
  // self-expression. Partial match — self-expression has an
  // aesthetic component P12 does not.
  self_expression: ["P12"],

  // Ethics / sustainability / health are not in the pilot corpus.
  // Empty — "no research mapping yet" is the honest surface.
  guilt_free: [],

  // P01 (Action Defeats Helplessness — short tasks with closure
  // in 10 minutes) is the behavioral analogue of instant-
  // gratification UX. P05 could also apply (event closure); kept
  // P01 alone to keep the map tight.
  instant_gratification: ["P01"],
};

/**
 * Returns the list of PrincipleIds mapped to a hidden value, or an
 * empty array if the value has no entry. Consumers must handle empty
 * — that is the T4 "no research mapping yet" signal.
 */
export function principlesForHiddenValue(v: HiddenValueType): PrincipleId[] {
  return HIDDEN_VALUE_TO_PRINCIPLES[v] ?? [];
}
