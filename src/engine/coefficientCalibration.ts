// Coefficient Calibration — empirical-validation hook for behavioral engines.
//
// The behavioral-science review flagged hard-coded heuristic constants
// (premiumPct=22/18/12, WASTE_RATES=0.45/0.40, decoy ratios, compoundRate
// 1.05) as having no empirical backing. This module provides the runtime
// hooks to:
//   1. Read a calibrated value when N >= 30 and confidence is high enough.
//   2. Fall back to the heuristic when below threshold.
//   3. Record an observation when an outcome is known (closed-loop).
//
// Engines call `getCoefficient(name, heuristic)` instead of using the
// constant directly. The first call seeds an in-memory cache so engines
// stay synchronous and side-effect free.

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface CalibratedRecord {
  coefficient: string;
  calibrated: number;
  heuristic: number;
  n: number;
  confidence: number;
  computedAt: number;
}

const CACHE = new Map<string, CalibratedRecord>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MIN_CONFIDENCE = 0.4; // below this, prefer the heuristic

// Optional async preload — call once at app startup to avoid the cold
// fallback on the first wizard run. Safe to skip; engines handle the
// missing-cache case by returning the heuristic.
export async function preloadCalibration(): Promise<void> {
  try {
    const { data } = await supabase.from("coefficient_calibrated").select("*");
    const now = Date.now();
    for (const row of data ?? []) {
      const r = row as {
        coefficient: string;
        calibrated: number;
        heuristic: number;
        n: number;
        confidence: number;
      };
      CACHE.set(r.coefficient, { ...r, computedAt: now });
    }
  } catch (e) {
    logger.warn("coefficientCalibration.preload", e);
  }
}

// Synchronous read — returns the heuristic when no cached calibration is
// available. Safe to call from pure engines.
export function getCoefficient(name: string, heuristic: number): number {
  const cached = CACHE.get(name);
  if (!cached) return heuristic;
  if (Date.now() - cached.computedAt > CACHE_TTL_MS) return heuristic;
  if (cached.n < 30 || cached.confidence < MIN_CONFIDENCE) return heuristic;
  return cached.calibrated;
}

// Returns the cached metadata so callers can render a confidence band
// or a "Beta — based on N=X observations" banner.
export function getCalibrationMeta(name: string): {
  source: "calibrated" | "heuristic";
  n: number;
  confidence: number;
} {
  const cached = CACHE.get(name);
  if (!cached || cached.n < 30 || cached.confidence < MIN_CONFIDENCE) {
    return { source: "heuristic", n: cached?.n ?? 0, confidence: cached?.confidence ?? 0 };
  }
  return { source: "calibrated", n: cached.n, confidence: cached.confidence };
}

// Record an actual observation. Called by outcomeLoopEngine and similar
// downstream signals. Non-blocking: errors are logged but never thrown.
export async function recordObservation(
  coefficient: string,
  predicted: number,
  actual: number,
  context: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { error } = await supabase.from("coefficient_observations").insert({
      coefficient,
      predicted,
      actual,
      context,
    });
    if (error) logger.warn("coefficientCalibration.record", error);
  } catch (e) {
    logger.warn("coefficientCalibration.record", e);
  }
}

// Test-only helper to clear the cache. Engines should never call this.
export function _resetCacheForTests(): void {
  CACHE.clear();
}
