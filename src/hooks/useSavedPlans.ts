import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FunnelResult, SavedPlan } from "@/types/funnel";
import { safeParseJson } from "@/lib/utils";

const LOCAL_KEY = "funnelforge-plans";

function loadLocal(): SavedPlan[] {
  return safeParseJson<SavedPlan[]>(LOCAL_KEY, []);
}

function saveLocal(plans: SavedPlan[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(plans));
}

export function useSavedPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Load plans on mount and when auth changes
  useEffect(() => {
    loadPlans();
  }, [user?.id]);

  const loadPlans = useCallback(async () => {
    setLoading(true);

    if (user) {
      // Try Supabase first
      const { data, error } = await supabase
        .from("saved_plans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const supaPlans: SavedPlan[] = data.map((row) => ({
          id: row.id,
          name: row.name,
          result: row.result as unknown as FunnelResult,
          savedAt: row.created_at,
        }));

        // Migrate localStorage plans on first login
        const localPlans = loadLocal();
        if (localPlans.length > 0) {
          const existingIds = new Set(supaPlans.map((p) => p.id));
          const newPlans = localPlans.filter((p) => !existingIds.has(p.id));
          if (newPlans.length > 0) {
            await Promise.all(
              newPlans.map((p) =>
                supabase.from("saved_plans").insert([{
                  id: p.id,
                  user_id: user.id,
                  name: p.name,
                  result: JSON.parse(JSON.stringify(p.result)),
                  created_at: p.savedAt,
                }])
              )
            );
            supaPlans.push(...newPlans);
          }
          // Clear localStorage after migration
          localStorage.removeItem(LOCAL_KEY);
        }

        setPlans(supaPlans);
      } else {
        // Fallback to localStorage if Supabase fails
        setPlans(loadLocal());
      }
    } else {
      setPlans(loadLocal());
    }

    setLoading(false);
  }, [user]);

  const savePlan = useCallback(
    async (result: FunnelResult, name: string) => {
      const plan: SavedPlan = {
        id: result.id,
        name,
        result,
        savedAt: new Date().toISOString(),
      };

      if (user) {
        await supabase.from("saved_plans").insert([{
          id: plan.id,
          user_id: user.id,
          name: plan.name,
          result: JSON.parse(JSON.stringify(plan.result)),
          created_at: plan.savedAt,
        }]);
      }

      // Always save locally as cache
      const local = loadLocal();
      local.push(plan);
      saveLocal(local);

      setPlans((prev) => [plan, ...prev]);
      return plan;
    },
    [user]
  );

  const deletePlan = useCallback(
    async (id: string) => {
      if (user) {
        await supabase.from("saved_plans").delete().eq("id", id).eq("user_id", user.id);
      }

      const local = loadLocal().filter((p) => p.id !== id);
      saveLocal(local);

      setPlans((prev) => prev.filter((p) => p.id !== id));
    },
    [user]
  );

  return { plans, loading, savePlan, deletePlan, reload: loadPlans };
}
