import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { safeParseJson } from "@/lib/utils";

const LOCAL_KEY = "funnelforge-tracking";

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
  localStorage.setItem(LOCAL_KEY, JSON.stringify(metrics));
}

export function useCampaignTracking(planId: string | null) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<TrackedMetric[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!planId) return;
    loadMetrics();
  }, [planId, user?.id]);

  const loadMetrics = useCallback(async () => {
    if (!planId) return;
    setLoading(true);

    if (user) {
      const { data } = await supabase
        .from("campaign_tracking")
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
      await supabase.from("campaign_tracking").insert({
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

    // Local cache
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
