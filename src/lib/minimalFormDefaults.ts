import { safeStorage } from "./safeStorage";

// Helpers for standalone module entry pages
export function getLatestPlanResult() {
  const plans = safeStorage.getJSON<{ savedAt: string; result: unknown }[]>("funnelforge-plans", []);
  if (plans.length === 0) return null;
  const sorted = [...plans].sort((a, b) =>
    new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
  return sorted[0].result;
}
