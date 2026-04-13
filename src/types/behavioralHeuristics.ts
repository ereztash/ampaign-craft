// ═══════════════════════════════════════════════
// BehavioralHeuristics Types — UserArchetypeLayer
// Type definitions for the 8 research-backed heuristics
// that drive L1–L5 adaptive UI resolution.
//
// L1 = navigation order
// L2 = tab priorities
// L3 = card/content layout
// L4 = interaction patterns
// L5 = CSS custom properties
// ═══════════════════════════════════════════════

import type { ArchetypeId } from "@/types/archetype";

/** Resolution levels from L1 (navigation) to L5 (CSS custom properties) */
export type HeuristicLevel = "L1" | "L2" | "L3" | "L4" | "L5";

/** A single research-backed behavioral heuristic */
export interface BehavioralHeuristic {
  /** Short ID, e.g. "H1" */
  id: string;
  /** Human-readable principle name */
  principle: string;
  /** Research source(s) — shown in Glass-Box transparency panel */
  source: string;
  /** Per-level description of how this heuristic manifests in the UI */
  manifestations: Record<HeuristicLevel, string>;
  /** Which archetypes this heuristic is primary for */
  primaryArchetypes: ArchetypeId[];
}

/** L5 CSS custom property values for micro-interactions */
export interface L5CSSVars {
  "--motion-duration-multiplier": string;
  "--motion-easing": string;
  "--cta-font-weight": string;
}

/** CTA verb pair (he/en) for an archetype */
export interface PrimaryCtaVerbs {
  he: string;
  en: string;
}
