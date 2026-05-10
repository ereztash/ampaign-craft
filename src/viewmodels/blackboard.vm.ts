// Blackboard engine boundary: re-exports types that components need.
// Components must import from here, never from @/engine/* directly.

export type { AgentInsight } from "@/engine/blackboard/partialRunner";
