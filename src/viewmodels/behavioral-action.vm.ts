// ─── Behavioral-Action ViewModel ─────────────────────────────────────────────
// Bridges behavioralActionEngine and behavioralHeuristicEngine → UI props.

export type { BehavioralNudge } from "@/engine/behavioralActionEngine";
export { deriveHeuristicSet, getPrimaryCtaVerbs } from "@/engine/behavioralHeuristicEngine";
