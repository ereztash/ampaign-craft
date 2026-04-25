import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FunnelResult, SavedPlan } from "@/types/funnel";
import { safeStorage } from "@/lib/safeStorage";

const LOCAL_KEY = "funnelforge-plans";

function loadLocal(): SavedPlan[] {
  return safeStorage.getJSON<SavedPlan[]>(LOCAL_KEY, []);
}

function saveLocal(plans: SavedPlan[]) {
  safeStorage.setJSON(LOCAL_KEY, plans);
}

type SupaRow = Record<string, unknown>;
const db = supabase as unknown as {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        order: (
          col: string,
          opts: { ascending: boolean },
        ) => Promise<{ data: SupaRow[] | null; error: unknown }>;
      };
    };
    insert: (rows: SupaRow[]) => Promise<{ error: unknown }>;
    delete: () => {
      eq: (col: string, val: string) => {
        eq: (col: string, val: string) => Promise<{ error: unknown }>;
      };
    };
  };
};

type AuthUser = { id: string } | null;

async function fetchPlans(user: AuthUser): Promise<SavedPlan[]> {
  if (!user) return loadLocal();

  const { data, error } = await db
    .from("saved_plans")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return loadLocal();

  const supaPlans: SavedPlan[] = data.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    result: row.result as unknown as FunnelResult,
    savedAt: row.created_at as string,
  }));

  // Migrate localStorage plans that aren't yet in Supabase
  const localPlans = loadLocal();
  if (localPlans.length > 0) {
    const existingIds = new Set(supaPlans.map((p) => p.id));
    const newPlans = localPlans.filter((p) => !existingIds.has(p.id));
    if (newPlans.length > 0) {
      await Promise.all(
        newPlans.map((p) =>
          db.from("saved_plans").insert([{
            id: p.id,
            user_id: user.id,
            name: p.name,
            result: JSON.parse(JSON.stringify(p.result)) as SupaRow,
            created_at: p.savedAt,
          }])
        ),
      );
      supaPlans.push(...newPlans);
    }
  }

  // Always keep localStorage in sync as a local cache.
  // DO NOT clear it — PlanView and CommandCenter read directly from
  // localStorage and clearing causes "Plan not found" on next visit.
  saveLocal(supaPlans);
  return supaPlans;
}

async function insertPlan(user: AuthUser, plan: SavedPlan): Promise<SavedPlan> {
  if (user) {
    await db.from("saved_plans").insert([{
      id: plan.id,
      user_id: user.id,
      name: plan.name,
      result: JSON.parse(JSON.stringify(plan.result)) as SupaRow,
      created_at: plan.savedAt,
    }]);
  }
  const local = loadLocal();
  local.push(plan);
  saveLocal(local);
  return plan;
}

async function removePlan(user: AuthUser, id: string): Promise<void> {
  if (user) {
    await db.from("saved_plans").delete().eq("id", id).eq("user_id", user.id);
  }
  saveLocal(loadLocal().filter((p) => p.id !== id));
}

const plansQueryKey = (userId: string | undefined) =>
  ["saved-plans", userId] as const;

export function useSavedPlans() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading: loading } = useQuery({
    queryKey: plansQueryKey(user?.id),
    queryFn: () => fetchPlans(user),
    staleTime: 2 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: ({ result, name }: { result: FunnelResult; name: string }) => {
      const plan: SavedPlan = {
        id: result.id,
        name,
        result,
        savedAt: new Date().toISOString(),
      };
      return insertPlan(user, plan);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: plansQueryKey(user?.id) }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removePlan(user, id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: plansQueryKey(user?.id) }),
  });

  const savePlan = useCallback(
    (result: FunnelResult, name: string) =>
      saveMutation.mutateAsync({ result, name }),
    [saveMutation],
  );

  const deletePlan = useCallback(
    (id: string) => deleteMutation.mutateAsync(id),
    [deleteMutation],
  );

  const reload = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: plansQueryKey(user?.id) });
  }, [queryClient, user?.id]);

  return { plans, loading, savePlan, deletePlan, reload };
}
