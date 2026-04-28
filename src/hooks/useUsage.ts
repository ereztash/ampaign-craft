// ═══════════════════════════════════════════════
// useUsage — single-source-of-truth client view of the user's
// per-month usage counters, tier limits, and credit balance.
//
// Refreshed on mount, on window focus, and on demand via refresh().
// Components that consume this hook show "X / Y used" indicators
// and "approaching limit" upsells, and feed the LimitReachedModal
// when an edge function returns 402.
// ═══════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";

export type Tier = "free" | "pro" | "business";

export type MeteredAction =
  | "ai_coach_message"
  | "knowledge_query_deep"
  | "plan_generation";

export interface ActionUsage {
  action: MeteredAction;
  used: number;
  limit: number; // -1 = unlimited
  creditCost: number;
}

export interface UsageSnapshot {
  tier: Tier;
  creditsRemaining: number;
  perAction: ActionUsage[];
}

interface UseUsageResult {
  snapshot: UsageSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Convenience selector — returns 0/0 if the action isn't found. */
  getAction: (action: MeteredAction) => ActionUsage;
  /** True when used >= 80% of a finite quota. */
  isApproaching: (action: MeteredAction) => boolean;
}

const EMPTY_ACTION: ActionUsage = { action: "ai_coach_message", used: 0, limit: 0, creditCost: 0 };

export function useUsage(): UseUsageResult {
  const [snapshot, setSnapshot] = useState<UsageSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-usage`;
      const resp = await authFetch(url, { method: "GET" });
      if (resp.status === 401) {
        // Anonymous visitor — leave snapshot null. Components branch
        // on snapshot existence rather than treating this as an error.
        setSnapshot(null);
        return;
      }
      if (!resp.ok) throw new Error(`get-usage failed: ${resp.status}`);
      const data = (await resp.json()) as UsageSnapshot;
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const getAction = useCallback(
    (action: MeteredAction): ActionUsage => {
      const found = snapshot?.perAction.find((a) => a.action === action);
      return found ?? { ...EMPTY_ACTION, action };
    },
    [snapshot],
  );

  const isApproaching = useCallback(
    (action: MeteredAction): boolean => {
      const a = getAction(action);
      if (a.limit <= 0) return false; // 0 = blocked or -1 = unlimited
      return a.used / a.limit >= 0.8;
    },
    [getAction],
  );

  return { snapshot, loading, error, refresh, getAction, isApproaching };
}
