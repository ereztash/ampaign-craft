// ═══════════════════════════════════════════════════════════════════════════
// Wedge Telemetry — Instrumentation for the learning window
//
// Lightweight wrapper over the analytics track() that emits typed wedge.*
// events. The goal is to learn — within 4-6 weeks of running pricing-only
// in production — whether:
//   1. Pricing is the right wedge (acceptance rate of pricing experiments)
//   2. The market pulls toward a second wedge (locked_module_clicked counts)
//   3. TTFV is acceptable (first_value_seen latency)
//   4. The experiment loop creates real stickiness (completed cycles per user)
// ═══════════════════════════════════════════════════════════════════════════

import { track } from "@/lib/analytics";
import type { WedgeModule } from "@/lib/wedgeMode";
import { getWedgeMode } from "@/lib/wedgeMode";

let firstValueTracked = false;

interface WedgeTelemetryOptions {
  userId?: string | null;
}

/** Called once on app boot to record the active wedge mode. */
export function trackWedgeModeResolved(options: WedgeTelemetryOptions = {}): void {
  void track(
    "wedge.mode_resolved",
    { mode: getWedgeMode() },
    { userId: options.userId ?? undefined },
  );
}

/** A user navigated to an enabled module's main view. */
export function trackModuleView(module: WedgeModule, options: WedgeTelemetryOptions = {}): void {
  void track(
    "wedge.module_view",
    { module, wedgeMode: getWedgeMode() },
    { userId: options.userId ?? undefined },
  );
}

/** A user clicked on a locked module — phantom-interest signal. */
export function trackLockedModuleClicked(module: WedgeModule, options: WedgeTelemetryOptions = {}): void {
  void track(
    "wedge.locked_module_clicked",
    { module, wedgeMode: getWedgeMode() },
    { userId: options.userId ?? undefined },
  );
}

/** A user clicked the "request unlock" CTA on a locked module. */
export function trackUnlockRequested(module: WedgeModule, options: WedgeTelemetryOptions = {}): void {
  void track(
    "wedge.unlock_requested",
    { module, wedgeMode: getWedgeMode() },
    { userId: options.userId ?? undefined },
  );
}

/**
 * Records the moment the user first sees a recommendation in the active
 * wedge — TTFV measurement. Idempotent within a session.
 */
export function trackFirstValueSeen(
  module: WedgeModule,
  ttfvMs: number,
  options: WedgeTelemetryOptions = {},
): void {
  if (firstValueTracked) return;
  firstValueTracked = true;
  void track(
    "wedge.first_value_seen",
    { module, ttfv_ms: ttfvMs, wedgeMode: getWedgeMode() },
    { userId: options.userId ?? undefined },
  );
}

/** Reset (test only). */
export function _resetFirstValueTrackedForTests(): void {
  firstValueTracked = false;
}

// ── Pricing experiment lifecycle events ────────────────────────────────────

export function trackExperimentStarted(input: {
  experimentId: string;
  testedPrice: number;
  segment: string;
  cohortSize: number;
  userId?: string | null;
}): void {
  void track(
    "wedge.experiment_started",
    {
      experimentId: input.experimentId,
      tested_price: input.testedPrice,
      segment: input.segment,
      cohort_size: input.cohortSize,
    },
    { userId: input.userId ?? undefined },
  );
}

export function trackOutcomeLogged(input: {
  experimentId: string;
  outcome: string;
  paidPrice?: number;
  userId?: string | null;
}): void {
  void track(
    "wedge.experiment_outcome_logged",
    {
      experimentId: input.experimentId,
      outcome: input.outcome,
      paid_price: input.paidPrice,
    },
    { userId: input.userId ?? undefined },
  );
}

export function trackExperimentCompleted(input: {
  experimentId: string;
  acceptanceRate: number;
  recommendation: string;
  cohortSize: number;
  durationMs: number;
  userId?: string | null;
}): void {
  void track(
    "wedge.experiment_completed",
    {
      experimentId: input.experimentId,
      acceptance_rate: input.acceptanceRate,
      recommendation: input.recommendation,
      cohort_size: input.cohortSize,
      duration_ms: input.durationMs,
    },
    { userId: input.userId ?? undefined },
  );
}

export function trackExperimentAbandoned(input: {
  experimentId: string;
  loggedCount: number;
  cohortSize: number;
  userId?: string | null;
}): void {
  void track(
    "wedge.experiment_abandoned",
    {
      experimentId: input.experimentId,
      logged_count: input.loggedCount,
      cohort_size: input.cohortSize,
    },
    { userId: input.userId ?? undefined },
  );
}

export function trackNextExperimentStarted(input: {
  prevExperimentId: string;
  newExperimentId: string;
  prevPrice: number;
  newPrice: number;
  recommendation: string;
  userId?: string | null;
}): void {
  void track(
    "wedge.next_experiment_started",
    {
      prev_experiment_id: input.prevExperimentId,
      new_experiment_id: input.newExperimentId,
      prev_price: input.prevPrice,
      new_price: input.newPrice,
      recommendation: input.recommendation,
    },
    { userId: input.userId ?? undefined },
  );
}
