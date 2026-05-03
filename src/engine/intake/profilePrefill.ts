// profilePrefill — Wedge 6.
// Maps a persisted IntakeSignal (need × pain) to a partial UnifiedProfile
// that the Wizard onboarding can use as a head-start. Mirrors the
// pattern of getDifferentiationPreFill in lib/adaptiveFormRules.ts.

import type { UnifiedProfile } from "@/types/profile";
import { getIntakeSignal } from "./intakeSignal";
import type { IntakeNeed, IntakePain } from "./types";

const NEED_TO_BUDGET_CAPACITY: Record<IntakeNeed, number> = {
  // "time" implies the user wants speed; default budget remains balanced.
  time: 50,
  // "money" implies the user feels squeezed; bias toward lower spend.
  money: 30,
  // "attention" implies focus problems; budget unaffected.
  attention: 50,
};

const PAIN_TO_MAIN_GOAL: Record<IntakePain, UnifiedProfile["mainGoal"]> = {
  finance: "sales",      // Pricing pain → revenue capture.
  product: "awareness",  // Differentiation pain → market positioning.
  sales: "leads",        // Sales pain → pipeline generation.
  marketing: "leads",    // Marketing pain → top-of-funnel.
};

const PAIN_TO_STUCK_POINT: Record<IntakePain, string> = {
  finance: "תמחור ורווחיות",
  product: "בידול ומיצוב",
  sales: "סקריפטים, סגירה והתנגדויות",
  marketing: "ערוצים, hooks ותוכנית",
};

export function getIntakePrefill(): Partial<UnifiedProfile> | null {
  const signal = getIntakeSignal();
  if (!signal) return null;
  return {
    mainGoal: PAIN_TO_MAIN_GOAL[signal.pain],
    budgetCapacity: NEED_TO_BUDGET_CAPACITY[signal.need],
    currentStuckPoint: PAIN_TO_STUCK_POINT[signal.pain],
  };
}
