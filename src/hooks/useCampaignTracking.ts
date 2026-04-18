import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { safeParseJson } from "@/lib/utils";
import { safeStorage } from "@/lib/safeStorage";

const LOCAL_KEY = "funnelforge-tracking";

interface CampaignTrackingRow {
  id: string;
  plan_id: string;
  stage_id: string;
  channel: string;
  metric: string;
  projected_value: string;
  actual_value: number;
  date: string;
  user_id: string;
}

type AdhocQuery = Promise<{ data: CampaignTrackingRow[] | null }> & {
  eq(column: string, value: unknown): AdhocQuery;
  order(column: string, options: { ascending: boolean }): AdhocQuery;
};
type AdhocFrom = (table: string) => {
  select(cols: string): AdhocQuery;
  insert(data: Record<string, unknown>): Promise<void>;
};
const adhocFrom = (supabase as unknown as { from: AdhocFrom }).from.bind(supabase);

export interface TrackedMetric {
  id: string;
  planId: string;
  stageId: string;
  channel: string;
  metric: string;
  projectedValue: string;
  actualValue: number;
  date: string;
}

export interface MetricComparison {
  metric: string;
  projected: string;
  actual: number;
  delta: string;
  status: "outperforming" | "underperforming" | "on-target";
}

function loadLocal(planId: string): TrackedMetric[] {
  const all = safeParseJson<TrackedMetric[]>(LOCAL_KEY, []);
  return all.filter((m) => m.planId === planId);
}

function saveLocal(metrics: TrackedMetric[]) {
  safeStorage.setJSON(LOCAL_KEY, metrics);
}

export function useCampaignTracking(planId: string | null) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<TrackedMetric[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMetrics = useCallback(async () => {
    if (!planId) return;
    setLoading(true);

    if (user) {
      const { data } = await adhocFrom("campaign_tracking")
        .select("*")
        .eq("plan_id", planId)
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (data) {
        setMetrics(data.map((r) => ({
          id: r.id,
          planId: r.plan_id,
          stageId: r.stage_id,
          channel: r.channel,
          metric: r.metric,
          projectedValue: r.projected_value,
          actualValue: r.actual_value,
          date: r.date,
        })));
      } else {
        setMetrics(loadLocal(planId));
      }
    } else {
      setMetrics(loadLocal(planId));
    }

    setLoading(false);
  }, [planId, user]);

  useEffect(() => {
    if (!planId) return;
    void loadMetrics();
  }, [planId, loadMetrics]);

  const addMetric = useCallback(async (
    stageId: string, channel: string, metric: string,
    projectedValue: string, actualValue: number, date: string
  ) => {
    if (!planId) return;

    const entry: TrackedMetric = {
      id: crypto.randomUUID(),
      planId, stageId, channel, metric, projectedValue, actualValue, date,
    };

    if (user) {
      await adhocFrom("campaign_tracking").insert({
        id: entry.id,
        user_id: user.id,
        plan_id: planId,
        stage_id: stageId,
        channel, metric,
        projected_value: projectedValue,
        actual_value: actualValue,
        date,
      });
    }

    const all = safeParseJson<TrackedMetric[]>(LOCAL_KEY, []);
    all.push(entry);
    saveLocal(all);

    setMetrics((prev) => [entry, ...prev]);
  }, [planId, user]);

  const getComparison = useCallback((): MetricComparison[] => {
    const grouped = new Map<string, TrackedMetric[]>();
    for (const m of metrics) {
      const key = m.metric;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(m);
    }

    return [...grouped.entries()].map(([metric, entries]) => {
      const latest = entries[0];
      const projectedNum = parseFloat(latest.projectedValue.replace(/[^\d.]/g, "")) || 0;
      const actual = latest.actualValue;
      const deltaPercent = projectedNum > 0 ? Math.round(((actual - projectedNum) / projectedNum) * 100) : 0;

      return {
        metric,
        projected: latest.projectedValue,
        actual,
        delta: `${deltaPercent > 0 ? "+" : ""}${deltaPercent}%`,
        status: deltaPercent > 5 ? "outperforming" : deltaPercent < -5 ? "underperforming" : "on-target",
      };
    });
  }, [metrics]);

  return { metrics, loading, addMetric, getComparison };
}
