// ═══════════════════════════════════════════════
// DerivedStateSync — unidirectional data sync
//
// Mounts once inside UserProfileProvider. Watches the two inputs
// that drive all page-level derivations — `profile.lastFormData`
// and the latest saved plan — and pushes them into the derived
// store. Pages read from the store via selectors and never
// recompute locally.
//
// Why a component rather than a hook in App.tsx directly
// ──────────────────────────────────────────────────────
// We need access to useUserProfile(), so the subscriber has to
// live under UserProfileProvider. A dedicated zero-render
// component keeps App.tsx tidy and makes the sync boundary
// explicit — a reviewer can grep `DerivedStateSync` and see
// every input that feeds the store.
// ═══════════════════════════════════════════════

import { useEffect, useMemo } from "react";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { safeStorage } from "@/lib/safeStorage";
import type { SavedPlan } from "@/types/funnel";
import { useDerivedStore } from "@/store/derivedStore";

function readLatestPlan(): SavedPlan | null {
  const plans = safeStorage.getJSON<SavedPlan[]>("funnelforge-plans", []);
  if (plans.length === 0) return null;
  // Plans are rarely more than a handful per user; O(n) scan is fine.
  let latest = plans[0];
  let latestMs = new Date(latest.savedAt).getTime();
  for (let i = 1; i < plans.length; i++) {
    const ms = new Date(plans[i].savedAt).getTime();
    if (ms > latestMs) {
      latest = plans[i];
      latestMs = ms;
    }
  }
  return latest;
}

export function DerivedStateSync(): null {
  const { profile } = useUserProfile();
  const syncFromInputs = useDerivedStore((s) => s.syncFromInputs);

  // Latest plan is keyed on savedPlanCount + last plan summary — the same
  // reactive proxies UserProfileContext already exposes. This avoids a
  // poll or a storage event listener.
  const latestPlan = useMemo(
    () => readLatestPlan(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile.savedPlanCount, profile.lastPlanSummary?.date],
  );

  useEffect(() => {
    syncFromInputs(profile.lastFormData, latestPlan);
  }, [profile.lastFormData, latestPlan, syncFromInputs]);

  return null;
}
