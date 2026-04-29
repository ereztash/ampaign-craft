// ═══════════════════════════════════════════════
// useCrmInsights — Loads leads + interactions for the current user
// from Supabase and runs the deterministic crmInsightEngine over them.
//
// Returns null while loading. Insights re-fetch when `userId` changes
// or when the caller explicitly refreshes (returned `refresh` callback).
// ═══════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import {
  listLeads,
  type Lead,
  type LeadInteraction,
} from "@/services/leadsService";
import { supabaseLoose as db } from "@/integrations/supabase/loose";
import { logger } from "@/lib/logger";
import { computeCrmInsights, type CrmInsights } from "@/engine/crmInsightEngine";

interface UseCrmInsightsResult {
  insights: CrmInsights | null;
  loading: boolean;
  refresh: () => void;
}

async function listAllInteractionsForUser(userId: string): Promise<LeadInteraction[]> {
  const { data, error } = await db
    .from("lead_interactions")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false });
  if (error) {
    logger.error("useCrmInsights.listAllInteractionsForUser", error);
    return [];
  }
  type Row = {
    id: string; lead_id: string; user_id: string;
    type: LeadInteraction["type"]; note: string; occurred_at: string;
  };
  return ((data as Row[] | null) ?? []).map((r) => ({
    id: r.id,
    leadId: r.lead_id,
    userId: r.user_id,
    type: r.type,
    note: r.note,
    occurredAt: r.occurred_at,
  }));
}

export function useCrmInsights(userId: string | undefined): UseCrmInsightsResult {
  const [insights, setInsights] = useState<CrmInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!userId) {
      setInsights(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const [leads, interactions]: [Lead[], LeadInteraction[]] = await Promise.all([
        listLeads(userId),
        listAllInteractionsForUser(userId),
      ]);
      if (cancelled) return;
      setInsights(computeCrmInsights(leads, interactions));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, tick]);

  return { insights, loading, refresh };
}
