// Behavioral-heuristic boundary: re-exports functions components need from
// behavioralHeuristicEngine. Components must import from here.
// Types live in @/types/behavioralHeuristics and @/types/archetype.

export {
  deriveHeuristicSet,
  getActiveHeuristicIds,
  getL3ComponentConfig,
  getL5CSSVars,
  getPrimaryCtaVerbs,
} from "@/engine/behavioralHeuristicEngine";
