import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/AuthContext";
import { safeStorage } from "@/lib/safeStorage";
import { logger } from "@/lib/logger";

/**
 * Hook for persisting user data to Supabase with localStorage fallback.
 */
export function useUserData() {
  const { user } = useAuth();

  const saveFormData = useCallback(
    async (formType: string, data: Record<string, unknown>) => {
      // Always save to localStorage as cache
      safeStorage.setJSON(`funnelforge-${formType}`, data);

      if (!user) return;

      const { error } = await (supabase as unknown as SupabaseClient)
        .from("user_form_data")
        .upsert(
          {
            user_id: user.id,
            form_type: formType,
            data,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,form_type" }
        );

      if (error) logger.warn("useUserData.saveFormData", error);
    },
    [user]
  );

  const loadFormData = useCallback(
    async <T = Record<string, unknown>>(formType: string, fallback: T): Promise<T> => {
      if (user) {
        const { data, error } = await (supabase as unknown as SupabaseClient)
          .from("user_form_data")
          .select("data")
          .eq("user_id", user.id)
          .eq("form_type", formType)
          .maybeSingle();

        if (!error && data?.data) return data.data as T;
      }

      // Fallback to localStorage
      return safeStorage.getJSON<T>(`funnelforge-${formType}`, fallback);
    },
    [user]
  );

  const saveDifferentiationResult = useCallback(
    async (formData: Record<string, unknown>, result: Record<string, unknown>) => {
      // Always cache locally
      safeStorage.setJSON("funnelforge-differentiation-result", result);

      if (!user) return;

      const { error } = await (supabase as unknown as SupabaseClient)
        .from("differentiation_results")
        .insert({
          user_id: user.id,
          form_data: formData,
          result,
        });

      if (error) logger.warn("useUserData.saveDifferentiationResult", error);
    },
    [user]
  );

  const loadDifferentiationResults = useCallback(
    async () => {
      if (!user) {
        const cached = safeStorage.getJSON<unknown>("funnelforge-differentiation-result", null);
        return cached ? [cached] : [];
      }

      const { data, error } = await (supabase as unknown as SupabaseClient)
        .from("differentiation_results")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error || !data) return [];
      return data;
    },
    [user]
  );

  const checkIsAdmin = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    const { data } = await (supabase as unknown as SupabaseClient)
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    return !!data;
  }, [user]);

  return {
    saveFormData,
    loadFormData,
    saveDifferentiationResult,
    loadDifferentiationResults,
    checkIsAdmin,
    isAuthenticated: !!user,
  };
}
