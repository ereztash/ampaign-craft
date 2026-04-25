// ═══════════════════════════════════════════════
// src/engine/intake/types.ts
//
// Two-axis pre-form intake. The minimum signal we extract from a new
// user before any module-specific work begins.
//
// Design principle: the pair (need, pain) is the smallest stable
// classifier we can use to (a) route to a module and (b) frame the
// opening promise. Every (need × pain) cell must produce a deterministic
// route + a measurable promise — see intakeMatrix.ts.
// ═══════════════════════════════════════════════

/** What the user is most short on right now. Drives tone, not module. */
export type IntakeNeed = "time" | "money" | "attention";

/** Where the felt pain sits. Determines which module we route to. */
export type IntakePain = "finance" | "product" | "sales" | "marketing";

/** Modules the intake can route to (subset of app routes). */
export type IntakeRouteTarget =
  | "/differentiate"
  | "/sales"
  | "/pricing"
  | "/wizard";

/**
 * The promise we make to the user at intake. MUST be measurable —
 * i.e. it can later be checked ("did they hit this in N minutes?")
 * by the Phase-3 feedback loop.
 */
export interface IntakePromise {
  /** Bilingual headline shown at module entry. */
  headline: { he: string; en: string };
  /** Estimated minutes to first concrete output. Used for promise verification. */
  expectedMinutes: number;
  /** A short kicker line under the headline. Tone varies by `need`. */
  kicker: { he: string; en: string };
}

/** Output of the matrix lookup: where to send + what to promise. */
export interface IntakeRouting {
  target: IntakeRouteTarget;
  promise: IntakePromise;
}

/** Persisted signal. Stored in localStorage and available to every module. */
export interface IntakeSignal {
  need: IntakeNeed;
  pain: IntakePain;
  /** ISO timestamp when intake was completed. */
  completedAt: string;
  /** Cached for convenience — re-derivable from (need, pain). */
  routing: IntakeRouting;
}
