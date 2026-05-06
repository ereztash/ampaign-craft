// ─── Churn ViewModel ─────────────────────────────────────────────────────────
// Thin re-exports from churnPlaybookEngine.
// Components import from here; never directly from @/engine/*.

export { buildChurnPlaybook } from "@/engine/churnPlaybookEngine";
export type {
  LeadingIndicator,
  NudgeEvent,
  Phase,
  RiskTier,
  WeeklyAction,
} from "@/engine/churnPlaybookEngine";
