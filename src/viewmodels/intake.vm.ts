// Intake boundary: re-exports types and functions components need from the
// intake telemetry layer. Components must import from here, not from
// @/engine/intake/* directly.

export type {
  PromiseVerification,
  BehaviorMismatch,
  IntakeTelemetryEvent,
} from "@/engine/intake/feedbackLoop";

export {
  verifyPromise,
  detectBehaviorMismatch,
  initTelemetry,
  recordRouteVisit,
  recordFirstOutput,
  getTelemetry,
  clearTelemetry,
} from "@/engine/intake/feedbackLoop";

export type {
  IntakeNeed,
  IntakePain,
  IntakeRouteTarget,
  IntakePromise,
  IntakeRouting,
  IntakeSignal,
} from "@/engine/intake/types";

export {
  getIntakeSignal,
  setIntakeSignal,
  clearIntakeSignal,
  hasCompletedIntake,
} from "@/engine/intake/intakeSignal";
