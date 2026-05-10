// Weekly-loop boundary: re-exports from weeklyLoopEngine.
// Note: insights.vm.ts already re-exports a subset; this file exposes the full
// surface area (additional helpers needed by some components).

export type {
  ReportOutcome,
  WeeklyHistoryItem,
} from "@/engine/weeklyLoopEngine";

export {
  deriveLoopState,
  continueCommitment,
  abandonCommitment,
  getWeeklyHistory,
} from "@/engine/weeklyLoopEngine";
