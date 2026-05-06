// Intake boundary: re-exports types and functions components need from the
// intake telemetry layer. Components must import from here, not from
// @/engine/intake/feedbackLoop directly.

export type {
  PromiseVerification,
  BehaviorMismatch,
} from "@/engine/intake/feedbackLoop";

export { verifyPromise } from "@/engine/intake/feedbackLoop";

export { getIntakeSignal } from "@/engine/intake/intakeSignal";
export { detectBehaviorMismatch } from "@/engine/intake/feedbackLoop";
export type { IntakeNeed, IntakeRouteTarget } from "@/engine/intake/types";
