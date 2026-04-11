// ═══════════════════════════════════════════════
// E3 — Freshness Budget
//
// Counts how many of the six ReflectiveContext components carry an
// updated_at timestamp inside the configured freshness window. If
// fewer than three are fresh, the engine must block and return the
// E3 watch instead of an opinionated card.
//
// Pure, synchronous, zero I/O. The window itself is read from env;
// the count itself is a pure function over (ctx, window_min, now).
//
// The six components are exactly:
//   funnel, gaps, regime, anomaly, forecast, profile
//
// Backward-compatibility rule:
//   when ctx.freshness is undefined entirely, the gate is bypassed.
//   Existing callers (and the existing M4 / E1 / E2 tests) do not
//   populate freshness and continue to work unchanged. Once a caller
//   starts attaching freshness data, the gate begins enforcing.
//
// Env contract:
//   VITE_REFLECTIVE_FRESH_WINDOW_MIN  — Vite project convention
//   NEXT_PUBLIC_REFLECTIVE_FRESH_WINDOW_MIN — spec form, accepted as
//                                              a fallback for forward
//                                              compatibility with the
//                                              corpus prompt naming.
//   default: 10 minutes.
// ═══════════════════════════════════════════════

import type { ReflectiveContext } from "./reflectiveAction";

export type ReflectiveComponentKey =
  | "funnel"
  | "gaps"
  | "regime"
  | "anomaly"
  | "forecast"
  | "profile";

export type FreshnessMap = Partial<Record<ReflectiveComponentKey, number>>;

export const FRESHNESS_KEYS: readonly ReflectiveComponentKey[] = [
  "funnel",
  "gaps",
  "regime",
  "anomaly",
  "forecast",
  "profile",
];

export const DEFAULT_FRESH_WINDOW_MIN = 10;
export const MIN_FRESH_COMPONENTS = 3;

// ───────────────────────────────────────────────
// Pure counter — testable without env or clock
// ───────────────────────────────────────────────

/**
 * Count how many of the six ReflectiveContext components are fresh
 * relative to `now`, where freshness means the component's updated_at
 * (from ctx.freshness) is within `window_min` minutes of `now`.
 *
 * Returns 0 when ctx.freshness is missing entirely.
 */
export function countFresh(
  ctx: ReflectiveContext,
  window_min: number,
  now: number,
): number {
  const freshness = ctx.freshness;
  if (!freshness) return 0;
  if (!Number.isFinite(window_min) || window_min <= 0) return 0;
  if (!Number.isFinite(now)) return 0;

  const windowMs = window_min * 60 * 1000;
  let count = 0;
  for (const key of FRESHNESS_KEYS) {
    const ts = freshness[key];
    if (typeof ts !== "number" || !Number.isFinite(ts)) continue;
    const age = now - ts;
    if (age >= 0 && age <= windowMs) count += 1;
  }
  return count;
}

// ───────────────────────────────────────────────
// Env reader — accepts both Vite and the spec form
// ───────────────────────────────────────────────

function readFreshWindowMin(): number {
  try {
    const meta = import.meta as { env?: Record<string, unknown> };
    const env = meta.env ?? {};
    const fromVite = env.VITE_REFLECTIVE_FRESH_WINDOW_MIN;
    const fromNext = env.NEXT_PUBLIC_REFLECTIVE_FRESH_WINDOW_MIN;
    const raw = fromVite ?? fromNext;
    if (typeof raw === "string" && raw.length > 0) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
      return raw;
    }
  } catch {
    // import.meta unavailable in some test environments — fall through.
  }
  return DEFAULT_FRESH_WINDOW_MIN;
}

// ───────────────────────────────────────────────
// Gate — env-aware wrapper around countFresh
// ───────────────────────────────────────────────

/**
 * The gate that generateReflectiveAction calls. Returns true (passes)
 * when:
 *   - ctx.freshness is undefined (backward-compat skip), OR
 *   - at least MIN_FRESH_COMPONENTS components are fresh under the
 *     env-configured window.
 *
 * Independent of coherence_score: this gate may block a card that
 * would otherwise have passed coherence and vice versa.
 */
export function freshnessGate(ctx: ReflectiveContext): boolean {
  if (!ctx.freshness) return true;
  const window_min = readFreshWindowMin();
  const now = Date.now();
  return countFresh(ctx, window_min, now) >= MIN_FRESH_COMPONENTS;
}
