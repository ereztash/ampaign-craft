// useEngineOrchestrator — assembles live ActivationSignals from app state and
// evaluates which Tier B/C engines should be running right now.
//
// Tier S engines always run; this hook only governs lazy Tier B/C engines.
// Call resolveMode(engineId) before invoking any non-Tier-S engine.

import { useEffect, useMemo, useRef } from "react";

import { useUserProfile } from "@/contexts/UserProfileContext";
import { loadChatInsights } from "@/engine/userKnowledgeGraph";
import {
  getActiveEngines,
  resolveActivationMode,
  type ActivationMode,
  type ActivationSignals,
} from "@/engine/engineActivationRules";
import { useAchievements } from "@/hooks/useAchievements";
import { useCrmInsights } from "@/hooks/useCrmInsights";
import { safeStorage } from "@/lib/safeStorage";

const HEALTH_SCORE_KEY = "funnelforge-health-score-prev";
const MS_PER_DAY = 86_400_000;

export interface EngineOrchestratorResult {
  /** Full snapshot of signals used for this evaluation cycle. */
  signals: ActivationSignals;
  /** Tier B/C engines that should run right now (mode !== "passive"). */
  activeEngines: { engineId: string; mode: ActivationMode }[];
  /** Check a single engine's current activation mode. */
  resolveMode: (engineId: string) => ActivationMode;
}

/**
 * @param userId - Supabase user ID for CRM signal (pass undefined when unauthenticated).
 * @param currentHealthScore - Latest computed health-score total (0-100).
 *   Pass the result of `calculateHealthScore(...).total` from the calling component.
 *   When omitted, the previous persisted score is reused.
 */
export function useEngineOrchestrator(
  userId: string | undefined,
  currentHealthScore?: number,
): EngineOrchestratorResult {
  const { insights } = useCrmInsights(userId);
  const { profile } = useUserProfile();
  const { masteryFeatures } = useAchievements();

  // Persist the latest health score so we can compute delta on next render.
  const prevHealthScoreRef = useRef<number>(
    Number(safeStorage.getString(HEALTH_SCORE_KEY, "") || currentHealthScore || 0),
  );

  useEffect(() => {
    if (currentHealthScore === undefined) return;
    safeStorage.setString(HEALTH_SCORE_KEY, String(currentHealthScore));
    prevHealthScoreRef.current = currentHealthScore;
  }, [currentHealthScore]);

  const signals = useMemo((): ActivationSignals => {
    const leadCount = insights?.totalLeads ?? 0;

    const firstSeen = profile.investment?.firstSeenDate;
    const daysActive = firstSeen
      ? Math.floor((Date.now() - new Date(firstSeen).getTime()) / MS_PER_DAY)
      : 0;

    const healthScore = currentHealthScore ?? prevHealthScoreRef.current;
    const healthScoreDelta = healthScore - prevHealthScoreRef.current;

    // Derive intent keywords from persisted chat insights (requestedTopics +
    // mentionedObjections give the richest signal without requiring real-time
    // parsing of the current chat message).
    const chatInsights = loadChatInsights();
    const intentKeywords = [
      ...(chatInsights?.requestedTopics ?? []),
      ...(chatInsights?.mentionedObjections ?? []),
    ];

    const visitedTabs = masteryFeatures ? Array.from(masteryFeatures) : [];

    return { leadCount, daysActive, healthScore, healthScoreDelta, intentKeywords, visitedTabs };
  }, [insights, profile.investment?.firstSeenDate, currentHealthScore, masteryFeatures]);

  const activeEngines = useMemo(() => getActiveEngines(signals), [signals]);

  const resolveMode = useMemo(
    () => (engineId: string) => resolveActivationMode(engineId, signals),
    [signals],
  );

  return { signals, activeEngines, resolveMode };
}
