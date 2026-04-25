import { useState, useEffect, useRef } from "react";
import { runPartialAgents } from "@/engine/blackboard/partialRunner";
import type { AgentInsight } from "@/engine/blackboard/partialRunner";
import type { UnifiedProfile } from "@/types/profile";
import { safeSessionStorage } from "@/lib/safeStorage";

const AB_KEY = "funnelforge_insight_cloud_ab";
const DEBOUNCE_MS = 500;

function isInCohort(): boolean {
  const stored = safeSessionStorage.getJSON<boolean | null>(AB_KEY, null);
  if (stored !== null) return stored;
  const inCohort = Math.random() < 0.2;
  safeSessionStorage.setJSON(AB_KEY, inCohort);
  return inCohort;
}

export function usePartialAgents(profile: Partial<UnifiedProfile>): AgentInsight[] {
  const [insights, setInsights] = useState<AgentInsight[]>([]);
  const enabledRef = useRef(isInCohort());
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!enabledRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setInsights(runPartialAgents(profile));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
     
  }, [profile]);

  return insights;
}
