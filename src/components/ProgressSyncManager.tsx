import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProgressSync } from "@/hooks/useProgressSync";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { safeStorage } from "@/lib/safeStorage";
import type { OnboardingMilestones, InvestmentMetrics } from "@/contexts/UserProfileContext";

/**
 * Mounts inside UserProfileProvider and AuthProvider.
 * Runs the cross-device sync loop:
 *   1. On first load with a logged-in user: merges Supabase record with
 *      localStorage and applies any remote milestones/achievements to context.
 *   2. Whenever local progress state changes: pushes a debounced write to
 *      Supabase so other devices pick up changes.
 *
 * Renders nothing — purely a side-effect component.
 */
export function ProgressSyncManager() {
  const { user } = useAuth();
  const { profile, completeMilestone } = useUserProfile();
  const { pushSnapshot } = useProgressSync(user?.id);

  // After initial sync, apply any remote milestones that are now in localStorage
  // but not yet reflected in React state (happens on new device / new session).
  useEffect(() => {
    if (!user?.id) return;

    const synced = safeStorage.getJSON<OnboardingMilestones>("funnelforge-milestones", {
      formCompleted: false, firstPlanSaved: false, dataSourceConnected: false,
      stylomeAnalyzed: false, coachUsed: false,
    });

    (Object.keys(synced) as (keyof OnboardingMilestones)[]).forEach((key) => {
      if (synced[key] && !profile.milestones[key]) {
        completeMilestone(key);
      }
    });
  // Run once after user logs in (userId change triggers useProgressSync which
  // writes merged state to localStorage before this effect runs on next tick).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Push debounced snapshot to Supabase whenever tracked progress changes
  useEffect(() => {
    pushSnapshot();
  }, [
    profile.milestones.formCompleted,
    profile.milestones.firstPlanSaved,
    profile.milestones.dataSourceConnected,
    profile.milestones.stylomeAnalyzed,
    profile.milestones.coachUsed,
    profile.investment.plansCreated,
    profile.investment.modulesCompleted,
    profile.achievements.length,
    pushSnapshot,
  ]);

  return null;
}
