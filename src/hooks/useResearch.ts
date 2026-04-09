// ═══════════════════════════════════════════════
// useResearch Hook — Trigger and track research sessions
// ═══════════════════════════════════════════════

import { useState, useCallback, useRef } from "react";
import { runResearch } from "@/engine/research/researchOrchestrator";
import type { ResearchQuery, ResearchSession, ResearchDomain } from "@/types/research";

interface UseResearchReturn {
  session: ResearchSession | null;
  isResearching: boolean;
  error: string | null;
  startResearch: (question: string, context: ResearchContext) => Promise<void>;
  reset: () => void;
}

interface ResearchContext {
  industry: string;
  audienceType: string;
  mainGoal: string;
  priority?: ResearchQuery["priority"];
}

export function useResearch(): UseResearchReturn {
  const [session, setSession] = useState<ResearchSession | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const startResearch = useCallback(async (question: string, context: ResearchContext) => {
    if (isResearching) return;

    abortRef.current = false;
    setIsResearching(true);
    setError(null);
    setSession(null);

    const query: ResearchQuery = {
      id: `rq-${Date.now()}`,
      question,
      domain: "marketing", // orchestrator will decompose across all domains
      context: {
        industry: context.industry,
        audienceType: context.audienceType,
        mainGoal: context.mainGoal,
        country: "IL",
      },
      priority: context.priority || "medium",
      createdAt: new Date().toISOString(),
    };

    try {
      const result = await runResearch(query, (progress) => {
        if (!abortRef.current) {
          setSession(progress);
        }
      });

      if (!abortRef.current) {
        setSession(result);
        if (result.status === "error") {
          setError(result.error || "Research failed");
        }
      }
    } catch (err) {
      if (!abortRef.current) {
        setError(err instanceof Error ? err.message : "Research failed");
      }
    } finally {
      if (!abortRef.current) {
        setIsResearching(false);
      }
    }
  }, [isResearching]);

  const reset = useCallback(() => {
    abortRef.current = true;
    setSession(null);
    setIsResearching(false);
    setError(null);
  }, []);

  return { session, isResearching, error, startResearch, reset };
}
