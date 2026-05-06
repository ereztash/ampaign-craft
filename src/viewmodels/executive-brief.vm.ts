// ─── Executive Brief ViewModel ───────────────────────────────────────────────
// Thin re-exports from executiveBriefEngine → UI boundary.

export {
  buildExecutiveBrief,
} from "@/engine/executiveBriefEngine";

export type {
  TrafficLight,
  BriefRisk,
  NRRScenario,
  ActionItem,
  ExecutiveBrief,
  BuildExecutiveBriefInput,
} from "@/engine/executiveBriefEngine";
