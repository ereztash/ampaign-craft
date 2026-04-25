// ═══════════════════════════════════════════════
// src/engine/intake/feedbackLoop.ts
//
// Phase 3: promise verification + behavior-mismatch detection.
//
// Always built, always collecting telemetry (lightweight localStorage
// writes). UI activation is gated by VITE_INTAKE_FEEDBACK_ENABLED so
// we can ship the data plumbing now and turn on the user-facing
// reframe prompt once we have enough N to interpret signals reliably.
//
// Two questions this layer answers:
//   1. Did the promise hold? (time-to-first-output ≤ expectedMinutes)
//   2. Does the stated need match observed behavior?
//      e.g., user said "time" but spent 40 min in differentiation.
// ═══════════════════════════════════════════════

import { safeStorage } from "@/lib/safeStorage";
import { getIntakeSignal } from "./intakeSignal";
import type { IntakeSignal } from "./types";

const TELEMETRY_KEY = "funnelforge-intake-telemetry";

/** A single observation about user behavior post-intake. */
export interface IntakeTelemetryEvent {
  /** ISO timestamp. */
  at: string;
  /** Either a route entry or a concrete output milestone. */
  kind: "route_visited" | "first_output_saved";
  /** For route_visited: the path. For output: module identifier. */
  payload: string;
}

interface TelemetryStore {
  signalCompletedAt: string;
  events: IntakeTelemetryEvent[];
}

// ─── Telemetry collection ────────────────────────────────────────────────────

/**
 * Initialize the telemetry store when intake completes. Called from
 * intakeSignal.setIntakeSignal — but kept separate so tests can clear
 * telemetry independently.
 */
export function initTelemetry(signal: IntakeSignal): void {
  const store: TelemetryStore = {
    signalCompletedAt: signal.completedAt,
    events: [],
  };
  safeStorage.setJSON(TELEMETRY_KEY, store);
}

/** Record a route visit. Skipped if no intake signal exists. */
export function recordRouteVisit(path: string): void {
  if (!getIntakeSignal()) return;
  const store = safeStorage.getJSON<TelemetryStore | null>(TELEMETRY_KEY, null);
  if (!store) return;
  store.events.push({ at: new Date().toISOString(), kind: "route_visited", payload: path });
  // Cap at 100 events to stay in localStorage budget
  if (store.events.length > 100) store.events = store.events.slice(-100);
  safeStorage.setJSON(TELEMETRY_KEY, store);
}

/** Record the first concrete output (e.g., plan saved). */
export function recordFirstOutput(moduleId: string): void {
  if (!getIntakeSignal()) return;
  const store = safeStorage.getJSON<TelemetryStore | null>(TELEMETRY_KEY, null);
  if (!store) return;
  // Only record the first output per intake
  if (store.events.some((e) => e.kind === "first_output_saved")) return;
  store.events.push({ at: new Date().toISOString(), kind: "first_output_saved", payload: moduleId });
  safeStorage.setJSON(TELEMETRY_KEY, store);
}

export function getTelemetry(): TelemetryStore | null {
  const raw = safeStorage.getJSON<unknown>(TELEMETRY_KEY, null);
  if (!raw || typeof raw !== "object") return null;
  const store = raw as Partial<TelemetryStore>;
  if (!store.signalCompletedAt || !Array.isArray(store.events)) return null;
  return store as TelemetryStore;
}

export function clearTelemetry(): void {
  safeStorage.remove(TELEMETRY_KEY);
}

// ─── Detection (pure) ────────────────────────────────────────────────────────

export interface PromiseVerification {
  /** True if first output landed within expectedMinutes window. */
  promiseHeld: boolean;
  /** Minutes between intake completion and first output. null if no output yet. */
  actualMinutes: number | null;
  /** Promise budget from the intake matrix. */
  expectedMinutes: number;
}

/**
 * Verify whether the time promise held. Returns null if either no
 * signal exists or there's not enough data to evaluate.
 */
export function verifyPromise(): PromiseVerification | null {
  const signal = getIntakeSignal();
  if (!signal) return null;
  const store = getTelemetry();
  if (!store) return null;

  const firstOutput = store.events.find((e) => e.kind === "first_output_saved");
  if (!firstOutput) return null;

  const startMs = new Date(signal.completedAt).getTime();
  const endMs = new Date(firstOutput.at).getTime();
  const actualMinutes = Math.round((endMs - startMs) / 60_000);

  return {
    promiseHeld: actualMinutes <= signal.routing.promise.expectedMinutes,
    actualMinutes,
    expectedMinutes: signal.routing.promise.expectedMinutes,
  };
}

export interface BehaviorMismatch {
  /** True if stated routing target differs from where user spent the most time. */
  mismatched: boolean;
  /** The route the user was supposed to go to. */
  statedTarget: string;
  /** The route they actually visited most. null if no visits recorded. */
  observedTarget: string | null;
}

/**
 * Detect whether the user's actual route visits diverge from the
 * intake routing. Used to suggest a re-take of intake when the system
 * sees their real preference is elsewhere.
 *
 * Only fires once at least 3 distinct route visits exist (small N
 * guard against spurious mismatch from a single back-button bounce).
 */
export function detectBehaviorMismatch(): BehaviorMismatch | null {
  const signal = getIntakeSignal();
  if (!signal) return null;
  const store = getTelemetry();
  if (!store) return null;

  const visits = store.events.filter((e) => e.kind === "route_visited");
  if (visits.length < 3) return null;

  // Tally visits per top-level path
  const counts = new Map<string, number>();
  for (const v of visits) {
    const top = "/" + (v.payload.split("/")[1] ?? "");
    counts.set(top, (counts.get(top) ?? 0) + 1);
  }

  let topPath: string | null = null;
  let topCount = 0;
  for (const [path, count] of counts) {
    if (count > topCount) {
      topPath = path;
      topCount = count;
    }
  }

  return {
    mismatched: topPath !== null && topPath !== signal.routing.target,
    statedTarget: signal.routing.target,
    observedTarget: topPath,
  };
}
