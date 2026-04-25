// ═══════════════════════════════════════════════
// src/engine/intake/intakeSignal.ts
//
// Read/write the persisted IntakeSignal. The signal is the contract
// between the intake wizard and every downstream surface — Phase-2
// state-aware rendering reads this to know how to present itself.
//
// Persistence is plain localStorage via safeStorage. Not synced to
// Supabase in v1; if needed later, the Supabase mirror is additive
// (write to both, prefer localStorage on read for offline support).
// ═══════════════════════════════════════════════

import { safeStorage } from "@/lib/safeStorage";
import { resolveIntake } from "./intakeMatrix";
import { initTelemetry } from "./feedbackLoop";
import type {
  IntakeNeed,
  IntakePain,
  IntakeSignal,
} from "./types";

const STORAGE_KEY = "funnelforge-intake-signal";

/** Read the persisted signal. Returns null if intake never completed
 * OR the stored value is not a valid IntakeSignal (defensive — old
 * shapes / mocked storage shouldn't break callers). */
export function getIntakeSignal(): IntakeSignal | null {
  const raw = safeStorage.getJSON<unknown>(STORAGE_KEY, null);
  if (!raw || typeof raw !== "object") return null;
  const sig = raw as Partial<IntakeSignal>;
  if (!sig.need || !sig.pain || !sig.routing || !sig.routing.target) return null;
  return sig as IntakeSignal;
}

/** Write the signal + initialize Phase-3 telemetry. Returns the new signal. */
export function setIntakeSignal(need: IntakeNeed, pain: IntakePain): IntakeSignal {
  const signal: IntakeSignal = {
    need,
    pain,
    completedAt: new Date().toISOString(),
    routing: resolveIntake(need, pain),
  };
  safeStorage.setJSON(STORAGE_KEY, signal);
  initTelemetry(signal);
  return signal;
}

/** Clear the signal. Used by "retake intake" flow. */
export function clearIntakeSignal(): void {
  safeStorage.remove(STORAGE_KEY);
}

/** True iff the user has completed intake at least once. */
export function hasCompletedIntake(): boolean {
  return getIntakeSignal() !== null;
}
