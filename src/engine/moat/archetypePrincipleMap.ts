// ═══════════════════════════════════════════════
// src/engine/moat/archetypePrincipleMap.ts
//
// Static map: CompetitorArchetypeId -> PrincipleId[]
//
// Each archetype in COMPETITOR_ARCHETYPES / B2C_COMPETITOR_ARCHETYPES
// has a counter_strategy already written in differentiationKnowledge.ts.
// This map links that strategy to principles that explain *why* the
// counter works — so the Trace modal can show the client a named
// mechanism behind the defense, not just advice.
//
// Empty array = known unmapped. Same T4 semantics as the hidden-value
// map: UI shows "no research mapping yet", never fabricates.
// ═══════════════════════════════════════════════

import type { CompetitorArchetypeId } from "@/types/differentiation";
import type { PrincipleId } from "./types";

export const ARCHETYPE_TO_PRINCIPLES: Record<CompetitorArchetypeId, PrincipleId[]> = {
  // ─── B2B archetypes (from COMPETITOR_ARCHETYPES) ───

  // Laser-focused niche specialist. Counter is showing the cost of
  // narrow scope. P08 (resilience triad) is the mechanism: a narrow
  // niche is scalar not triadic. P04 (phase-specific intervention)
  // exposes that their niche is frozen across customer phases.
  laser_focused: ["P08", "P04"],

  // Wins on price + relationships, ignores positioning. Counter is
  // "make hidden cost visible" (P03 Hobfoll COR loss framing) and
  // out-advising them at the relational level (P15 Trust Equation:
  // low self-orientation beats old relationships).
  quiet_vendor: ["P15", "P03"],

  // Low entry price, high hidden costs. P03 (COR + Kahneman loss
  // aversion) is the canonical reframe: surface what's at risk.
  // P13 (ABC-X perception change) shifts the customer's C from
  // "I got a deal" to "I'm exposed".
  hidden_cost_engineer: ["P03", "P13"],

  // Wins on politics, not product. Counter: arm the Technical
  // Evaluator with substance (P15 trust equation — credibility
  // attribute) and help the buyer separate control from noise
  // (P12 locus of control boundaries).
  political_disruptor: ["P15", "P12"],

  // Adjacent-market player with resources + distribution.
  // Counter: emphasize domain depth. P04 (phase-specific) shows
  // they don't know the customer's transition phases. P11
  // (structure prevents secondary traumatization) shows
  // operational depth they lack.
  unexpected_joiner: ["P04", "P11"],

  // ─── B2C archetypes (from B2C_COMPETITOR_ARCHETYPES) ───

  // Owns the category name in consumers' minds. Counter is
  // sub-category creation. P16 (Minto/MECE) is the framing
  // tool. P09 (continuity) lets you redefine the category
  // from its history, not from the incumbent's present.
  category_king: ["P16", "P09"],

  // Cheapest option, sets price expectations. P03 (loss
  // framing) is the canonical counter: total cost of cheap.
  // P16 (MECE) re-chunks the comparison into non-overlapping
  // categories so price is only one axis.
  price_anchor: ["P03", "P16"],

  // Sells identity, not product. Counter is authenticity.
  // P15 (trust low self-orientation) beats identity marketing
  // that is high self-orientation. P12 (locus of control)
  // distinguishes real empowerment from aspirational.
  lifestyle_brand: ["P15", "P12"],

  // Marketplace that commoditizes sellers. Counter is direct
  // relationships and owned channels. P11 (structured
  // relationship with closure) + P09 (continuity — direct
  // history the platform cannot own).
  platform_aggregator: ["P11", "P09"],

  // Brand with built-in audience via creator. Counter:
  // substance over personality. P15 (trust equation — low
  // self-orientation + credibility) and P08 (resilience
  // triad — what happens when the creator moves on).
  creator_led: ["P15", "P08"],
};

/**
 * Returns PrincipleIds for the archetype, or empty if not mapped.
 * Consumers must handle empty arrays (T4).
 */
export function principlesForArchetype(a: CompetitorArchetypeId): PrincipleId[] {
  return ARCHETYPE_TO_PRINCIPLES[a] ?? [];
}
