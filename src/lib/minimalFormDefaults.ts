import { safeStorage } from "./safeStorage";
import type { SavedPlan, FunnelResult } from "@/types/funnel";

// Helpers for standalone module entry pages
export function getLatestPlanResult() {
  const plans = safeStorage.getJSON<SavedPlan[]>("funnelforge-plans", []);
  if (plans.length === 0) return null;
  const sorted = [...plans].sort((a, b) =>
    new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
  return sorted[0].result as FunnelResult;
}
