// ═══════════════════════════════════════════════
// Weekly Loop Engine — State Machine
//
// The product's core loop surfaced as a finite state machine:
//   Signal → Decision → Execute → Report
//
// Given: stuck-point presence, persisted weekly commitment, days since
// commitment, and report-back status — derive the state the UI should render.
//
// Owns its own persistence via safeStorage. The UI reads state, calls actions
// (commit / report / reset), re-reads state. No component needs to know about
// timestamps or storage keys.
// ═══════════════════════════════════════════════

import { safeStorage } from "@/lib/safeStorage";
import { logger } from "@/lib/logger";

// ── Persistence keys ──
const COMMITMENT_KEY = "funnelforge-weekly-commitment";
const HISTORY_KEY = "funnelforge-weekly-history";
const HISTORY_MAX = 26; // ~6 months of weeks

// ── Types ──

export type LoopState =
  | "no_signal"         // No stuck point yet — user hasn't entered the loop
  | "decision_pending"  // Have a signal/candidate action but nothing committed
  | "action_ready"      // Committed — same day, user should go execute now
  | "in_progress"       // Committed — 1-6 days in, working on it
  | "awaiting_report"   // 7+ days since commit, no report — ask for outcome
  | "between_weeks"     // Reported — inside cooldown before next weekly move
  | "missed_cycle";     // 14+ days since commit, no report — graceful re-engage

export type ReportOutcome = "done" | "partial" | "skipped";

export interface WeeklyCommitment {
  id: string;
  actionId: string;        // route / module / external id
  actionTitle: string;     // human-readable at time of commit
  module: string;          // bottleneck module or "marketing" fallback
  severity: "critical" | "warning" | "info";
  committedAt: string;     // ISO
  reportedAt: string | null;
  outcome: ReportOutcome | null;
  note: string | null;     // optional freeform from the report step
}

export interface WeeklyHistoryItem {
  commitment: WeeklyCommitment;
  weekStart: string;       // ISO — Monday 00:00 of the commitment week
}

export interface LoopSnapshot {
  state: LoopState;
  commitment: WeeklyCommitment | null;
  daysSinceCommit: number | null;
  daysSinceReport: number | null;
  hasSignal: boolean;
}

// ── Time helpers ──

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(a: string, b: Date = new Date()): number {
  const aTime = new Date(a).getTime();
  if (Number.isNaN(aTime)) return 0;
  return Math.floor((b.getTime() - aTime) / MS_PER_DAY);
}

function weekStartISO(from: Date = new Date()): string {
  const d = new Date(from);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
  // Week starts Monday. If Sunday (0), go back 6; else back (day-1).
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ── Persistence ──

function readCommitment(): WeeklyCommitment | null {
  return safeStorage.getJSON<WeeklyCommitment | null>(COMMITMENT_KEY, null);
}

function writeCommitment(c: WeeklyCommitment | null): void {
  if (c === null) {
    safeStorage.remove(COMMITMENT_KEY);
    return;
  }
  safeStorage.setJSON(COMMITMENT_KEY, c);
}

function readHistory(): WeeklyHistoryItem[] {
  return safeStorage.getJSON<WeeklyHistoryItem[]>(HISTORY_KEY, []);
}

function pushHistory(item: WeeklyHistoryItem): void {
  const arr = readHistory();
  arr.push(item);
  safeStorage.setJSON(HISTORY_KEY, arr.slice(-HISTORY_MAX));
}

// ── State derivation ──

export function deriveLoopState(params: {
  hasSignal: boolean;
  commitment: WeeklyCommitment | null;
  now?: Date;
}): LoopSnapshot {
  const { hasSignal, commitment } = params;
  const now = params.now ?? new Date();

  if (!commitment) {
    return {
      state: hasSignal ? "decision_pending" : "no_signal",
      commitment: null,
      daysSinceCommit: null,
      daysSinceReport: null,
      hasSignal,
    };
  }

  const daysSinceCommit = daysBetween(commitment.committedAt, now);
  const daysSinceReport = commitment.reportedAt
    ? daysBetween(commitment.reportedAt, now)
    : null;

  // Reported → cooldown until next week
  if (commitment.reportedAt !== null) {
    // After 7 days the cooldown expires — auto-advance to decision_pending
    // so the user isn't stuck in between_weeks forever if they don't click.
    if (daysSinceReport !== null && daysSinceReport >= 7) {
      return {
        state: hasSignal ? "decision_pending" : "no_signal",
        commitment: null, // treat as cleared for UI purposes
        daysSinceCommit,
        daysSinceReport,
        hasSignal,
      };
    }
    return {
      state: "between_weeks",
      commitment,
      daysSinceCommit,
      daysSinceReport,
      hasSignal,
    };
  }

  // Not reported
  if (daysSinceCommit >= 14) {
    return {
      state: "missed_cycle",
      commitment,
      daysSinceCommit,
      daysSinceReport: null,
      hasSignal,
    };
  }
  if (daysSinceCommit >= 7) {
    return {
      state: "awaiting_report",
      commitment,
      daysSinceCommit,
      daysSinceReport: null,
      hasSignal,
    };
  }
  if (daysSinceCommit >= 1) {
    return {
      state: "in_progress",
      commitment,
      daysSinceCommit,
      daysSinceReport: null,
      hasSignal,
    };
  }
  return {
    state: "action_ready",
    commitment,
    daysSinceCommit,
    daysSinceReport: null,
    hasSignal,
  };
}

// ── Public API ──

/**
 * Read the current loop snapshot.
 * `hasSignal` should be true when the user has at least one of:
 *   - a captured currentStuckPoint
 *   - a computed bottleneck
 *   - a guidance item
 * The engine doesn't compute this itself — the caller already has it cheap.
 */
export function getLoopSnapshot(hasSignal: boolean, now?: Date): LoopSnapshot {
  return deriveLoopState({
    hasSignal,
    commitment: readCommitment(),
    now,
  });
}

/**
 * User committed to executing an action this week.
 * Overwrites any prior commitment. Call after the user picks "Make the move".
 */
export function commitToAction(params: {
  actionId: string;
  actionTitle: string;
  module: string;
  severity: "critical" | "warning" | "info";
}): WeeklyCommitment {
  const commitment: WeeklyCommitment = {
    id: crypto.randomUUID(),
    actionId: params.actionId,
    actionTitle: params.actionTitle,
    module: params.module,
    severity: params.severity,
    committedAt: new Date().toISOString(),
    reportedAt: null,
    outcome: null,
    note: null,
  };
  writeCommitment(commitment);
  logger.info("weeklyLoop.commit", { actionId: params.actionId, module: params.module });
  return commitment;
}

/**
 * Report the outcome of the current commitment.
 * Moves state to between_weeks and archives to history.
 * Returns null if there is no active commitment.
 */
export function reportOutcome(outcome: ReportOutcome, note: string | null = null): WeeklyCommitment | null {
  const current = readCommitment();
  if (!current) return null;

  const updated: WeeklyCommitment = {
    ...current,
    reportedAt: new Date().toISOString(),
    outcome,
    note: note?.trim() ? note.trim() : null,
  };
  writeCommitment(updated);
  pushHistory({
    commitment: updated,
    weekStart: weekStartISO(new Date(updated.committedAt)),
  });
  logger.info("weeklyLoop.report", { outcome, module: updated.module });
  return updated;
}

/**
 * Clear the current commitment to return to `decision_pending`.
 * Used by "start a new week" after between_weeks or to recover from missed_cycle.
 * History is preserved.
 */
export function startNewWeek(): void {
  writeCommitment(null);
  logger.info("weeklyLoop.startNewWeek", {});
}

/**
 * Restart the current (reported) commitment as a fresh week — same move,
 * new cycle. Clears reportedAt/outcome/note, resets committedAt to now,
 * assigns a new id so downstream analytics can distinguish cycles.
 *
 * Used by the between_weeks "continue same move" flow for users who
 * reported partial progress and want another week on the same action.
 */
export function continueCommitment(): WeeklyCommitment | null {
  const current = readCommitment();
  if (!current) return null;
  const restarted: WeeklyCommitment = {
    ...current,
    id: crypto.randomUUID(),
    committedAt: new Date().toISOString(),
    reportedAt: null,
    outcome: null,
    note: null,
  };
  writeCommitment(restarted);
  logger.info("weeklyLoop.continue", { actionId: restarted.actionId, module: restarted.module });
  return restarted;
}

/**
 * Abandon the current commitment without reporting — e.g. user wants to
 * re-select a different move mid-week. Archives with outcome="skipped".
 */
export function abandonCommitment(): void {
  const current = readCommitment();
  if (!current) return;
  const archived: WeeklyCommitment = {
    ...current,
    reportedAt: new Date().toISOString(),
    outcome: "skipped",
    note: null,
  };
  pushHistory({
    commitment: archived,
    weekStart: weekStartISO(new Date(archived.committedAt)),
  });
  writeCommitment(null);
  logger.info("weeklyLoop.abandon", { module: archived.module });
}

/**
 * Full history for trend / consistency visualizations.
 * Latest at the end.
 */
export function getWeeklyHistory(): WeeklyHistoryItem[] {
  return readHistory();
}

/**
 * How many consecutive weeks ending with a `done` or `partial` report.
 * Useful for a momentum badge.
 */
export function getStreak(): number {
  const history = readHistory();
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const outcome = history[i].commitment.outcome;
    if (outcome === "done" || outcome === "partial") streak += 1;
    else break;
  }
  return streak;
}
