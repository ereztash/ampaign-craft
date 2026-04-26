import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { safeStorage } from "@/lib/safeStorage";
import type { OnboardingMilestones, InvestmentMetrics } from "@/contexts/UserProfileContext";
import type { Json } from "@/integrations/supabase/types";

interface ProgressSnapshot {
  milestones: OnboardingMilestones;
  investment: InvestmentMetrics;
  masteryFeatures: string[];
  achievements: Record<string, string>;
  streak: { currentStreak: number; longestStreak: number; lastActiveDate: string | null };
}

// Merge two progress snapshots — all fields are monotonically increasing so
// the merge is always a union/max with no data loss.
function mergeSnapshots(local: ProgressSnapshot, remote: ProgressSnapshot): ProgressSnapshot {
  return {
    milestones: {
      formCompleted:        local.milestones.formCompleted        || remote.milestones.formCompleted,
      firstPlanSaved:       local.milestones.firstPlanSaved       || remote.milestones.firstPlanSaved,
      dataSourceConnected:  local.milestones.dataSourceConnected  || remote.milestones.dataSourceConnected,
      stylomeAnalyzed:      local.milestones.stylomeAnalyzed      || remote.milestones.stylomeAnalyzed,
      coachUsed:            local.milestones.coachUsed            || remote.milestones.coachUsed,
    },
    investment: {
      plansCreated:         Math.max(local.investment.plansCreated,         remote.investment.plansCreated),
      modulesCompleted:     Math.max(local.investment.modulesCompleted,      remote.investment.modulesCompleted),
      totalVisits:          Math.max(local.investment.totalVisits,           remote.investment.totalVisits),
      firstSeenDate:        local.investment.firstSeenDate || remote.investment.firstSeenDate,
      totalSessionsMinutes: Math.max(local.investment.totalSessionsMinutes,  remote.investment.totalSessionsMinutes),
    },
    masteryFeatures: [...new Set([...local.masteryFeatures, ...remote.masteryFeatures])],
    achievements: { ...remote.achievements, ...local.achievements },
    streak: local.streak.currentStreak >= remote.streak.currentStreak ? local.streak : remote.streak,
  };
}

function readLocalSnapshot(): ProgressSnapshot {
  return {
    milestones: safeStorage.getJSON<OnboardingMilestones>("funnelforge-milestones", {
      formCompleted: false, firstPlanSaved: false, dataSourceConnected: false,
      stylomeAnalyzed: false, coachUsed: false,
    }),
    investment: safeStorage.getJSON<InvestmentMetrics>("funnelforge-investment", {
      plansCreated: 0, modulesCompleted: 0, totalVisits: 0, firstSeenDate: null, totalSessionsMinutes: 0,
    }),
    masteryFeatures: safeStorage.getJSON<string[]>("funnelforge-mastery", []),
    achievements: safeStorage.getJSON<Record<string, string>>("funnelforge-achievements", {}),
    streak: safeStorage.getJSON("funnelforge-streak", { currentStreak: 0, longestStreak: 0, lastActiveDate: null }),
  };
}

function writeLocalSnapshot(s: ProgressSnapshot) {
  safeStorage.setJSON("funnelforge-milestones",    s.milestones);
  safeStorage.setJSON("funnelforge-investment",    s.investment);
  safeStorage.setJSON("funnelforge-mastery",       s.masteryFeatures);
  safeStorage.setJSON("funnelforge-achievements",  s.achievements);
  safeStorage.setJSON("funnelforge-streak",        s.streak);
}

/**
 * Syncs user progress between localStorage and Supabase.
 *
 * - On mount (when userId is available): fetches remote row, merges with local,
 *   writes merged state back to both localStorage and Supabase.
 * - pushSnapshot(): debounced write to Supabase. Call this whenever local
 *   progress state changes (milestones, achievements, mastery, etc.).
 *
 * Returns `hasSynced` so callers can wait for the initial merge before
 * rendering milestone-gated UI.
 */
export function useProgressSync(userId: string | null | undefined) {
  const hasSynced = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount: fetch remote → merge → write back
  useEffect(() => {
    if (!userId) return;

    async function initialSync() {
      const local = readLocalSnapshot();

      const { data, error } = await supabase
        .from("user_progress")
        .select("milestones, investment, mastery_features, achievements, streak")
        .eq("user_id", userId!)
        .maybeSingle();

      if (error) {
        hasSynced.current = true;
        return;
      }

      if (!data) {
        // No remote record yet — push local state up (backfill on first login)
        await supabase.from("user_progress").insert({
          user_id: userId!,
          milestones:       local.milestones       as Json,
          investment:       local.investment       as Json,
          mastery_features: local.masteryFeatures,
          achievements:     local.achievements     as Json,
          streak:           local.streak           as Json,
        });
        hasSynced.current = true;
        return;
      }

      const remote: ProgressSnapshot = {
        milestones:       (data.milestones       as OnboardingMilestones) ?? { formCompleted: false, firstPlanSaved: false, dataSourceConnected: false, stylomeAnalyzed: false, coachUsed: false },
        investment:       (data.investment       as InvestmentMetrics)    ?? { plansCreated: 0, modulesCompleted: 0, totalVisits: 0, firstSeenDate: null, totalSessionsMinutes: 0 },
        masteryFeatures:  (data.mastery_features as string[])             ?? [],
        achievements:     (data.achievements     as Record<string, string>) ?? {},
        streak:           (data.streak           as ProgressSnapshot["streak"]) ?? { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
      };

      const merged = mergeSnapshots(local, remote);
      writeLocalSnapshot(merged);

      // Push merged result back if it differs from remote
      await supabase.from("user_progress").upsert({
        user_id:          userId!,
        milestones:       merged.milestones       as Json,
        investment:       merged.investment       as Json,
        mastery_features: merged.masteryFeatures,
        achievements:     merged.achievements     as Json,
        streak:           merged.streak           as Json,
      });

      hasSynced.current = true;
    }

    initialSync();
  // Run once per userId change (login/logout)
   
  }, [userId]);

  // Debounced remote write — call this after any local progress change
  const pushSnapshot = useCallback(() => {
    if (!userId) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      const local = readLocalSnapshot();
      await supabase.from("user_progress").upsert({
        user_id:          userId,
        milestones:       local.milestones       as Json,
        investment:       local.investment       as Json,
        mastery_features: local.masteryFeatures,
        achievements:     local.achievements     as Json,
        streak:           local.streak           as Json,
      });
    }, 1500);
  }, [userId]);

  return { pushSnapshot, hasSynced: hasSynced.current };
}
