// ═══════════════════════════════════════════════
// useLeadCoach — Loads the inputs the coach engine needs (user blackboard
// state, lead, interactions, CRM insights) and runs leadCoachEngine.
//
// Cache strategy: on cache hit younger than 24h, return cached recs.
// On miss, compute, persist, then return. Cache is invalidated when the
// caller explicitly refreshes or when an interaction is added.
// ═══════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { useUserProfile } from "@/contexts/UserProfileContext";
import {
  getLead, listInteractions,
  getCachedRecommendations, upsertCachedRecommendations,
  type Lead, type LeadInteraction,
} from "@/services/leadsService";
import { useCrmInsights } from "@/hooks/useCrmInsights";
import {
  generateLeadRecommendations,
  type LeadRecommendation,
} from "@/engine/leadCoachEngine";
import { inferDISCProfile } from "@/engine/discProfileEngine";
import { generateClosingStrategy } from "@/engine/neuroClosingEngine";
import { calculateValueScore } from "@/engine/hormoziValueEngine";
import { generateFunnel } from "@/engine/funnelEngine";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface UseLeadCoachResult {
  lead: Lead | null;
  interactions: LeadInteraction[];
  recommendations: LeadRecommendation[];
  loading: boolean;
  refresh: () => void;
}

export function useLeadCoach(
  userId: string | undefined,
  leadId: string | undefined,
): UseLeadCoachResult {
  const { profile } = useUserProfile();
  const { insights: crmInsights } = useCrmInsights(userId);

  const [lead, setLead] = useState<Lead | null>(null);
  const [interactions, setInteractions] = useState<LeadInteraction[]>([]);
  const [recommendations, setRecommendations] = useState<LeadRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!userId || !leadId) return;
    let cancelled = false;
    setLoading(true);

    void (async () => {
      const [freshLead, freshInteractions, cached] = await Promise.all([
        getLead(leadId),
        listInteractions(leadId),
        getCachedRecommendations(leadId),
      ]);
      if (cancelled) return;
      setLead(freshLead);
      setInteractions(freshInteractions);

      // Cache hit within TTL → use it (skip on explicit refresh so new interactions are reflected).
      if (tick === 0 && cached && Date.now() - new Date(cached.computedAt).getTime() < CACHE_TTL_MS) {
        if (Array.isArray(cached.recommendations)) {
          setRecommendations(cached.recommendations as LeadRecommendation[]);
          setLoading(false);
          return;
        }
      }

      // Compute fresh — engine is synchronous and pure once inputs are loaded.
      if (!freshLead) {
        setRecommendations([]);
        setLoading(false);
        return;
      }

      const formData = profile.currentFormData ?? profile.lastFormData ?? null;
      const userDisc = formData ? inferDISCProfile(formData) : null;
      const funnel = formData ? generateFunnel(formData) : null;
      const closing = userDisc && formData ? generateClosingStrategy(userDisc, formData) : null;
      const hormozi = formData ? calculateValueScore(formData) : null;

      const recs = generateLeadRecommendations({
        userDisc,
        funnel,
        closing,
        hormozi,
        crmInsights,
        lead: freshLead,
        interactions: freshInteractions,
      });

      setRecommendations(recs);
      setLoading(false);

      // Fire-and-forget cache write.
      void upsertCachedRecommendations(userId, leadId, recs);
    })();

    return () => { cancelled = true; };
  // crmInsights re-runs the effect when CRM data lands; that's intentional —
  // the recs depend on it (e.g., cohort median, top objection theme).
  }, [userId, leadId, tick, profile.currentFormData, profile.lastFormData, crmInsights]);

  return { lead, interactions, recommendations, loading, refresh };
}
