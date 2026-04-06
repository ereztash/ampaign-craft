// Fill partial FormData with sensible defaults for standalone module entry
import { FormData, initialFormData } from "@/types/funnel";

export function fillFormDefaults(partial: Partial<FormData>): FormData {
  return { ...initialFormData, ...partial };
}

export function getLatestPlanResult() {
  try {
    const plans = JSON.parse(localStorage.getItem("funnelforge-plans") || "[]");
    if (plans.length === 0) return null;
    const sorted = [...plans].sort((a: { savedAt: string }, b: { savedAt: string }) =>
      new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
    return sorted[0].result;
  } catch { return null; }
}
