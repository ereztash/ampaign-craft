import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SavedPlan } from "@/types/funnel";

export interface PlanTemplate {
  id: string;
  authorId: string;
  planId: string;
  title: string;
  description: string;
  businessField: string;
  mainGoal: string;
  budgetRange: string;
  upvotes: number;
  useCount: number;
  isPublic: boolean;
  createdAt: string;
  planData?: SavedPlan;
}

export function useTemplateMarketplace() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTemplates = useCallback(async (filters?: {
    businessField?: string;
    mainGoal?: string;
    budgetRange?: string;
  }) => {
    setLoading(true);
    let query = supabase
      .from("plan_templates")
      .select("*")
      .eq("is_public", true)
      .order("upvotes", { ascending: false });

    if (filters?.businessField) query = query.eq("business_field", filters.businessField);
    if (filters?.mainGoal) query = query.eq("main_goal", filters.mainGoal);
    if (filters?.budgetRange) query = query.eq("budget_range", filters.budgetRange);

    const { data } = await query;
    if (data) {
      setTemplates(data.map((r) => ({
        id: r.id,
        authorId: r.author_id,
        planId: r.plan_id,
        title: r.title,
        description: r.description,
        businessField: r.business_field,
        mainGoal: r.main_goal,
        budgetRange: r.budget_range,
        upvotes: r.upvotes,
        useCount: r.use_count,
        isPublic: r.is_public,
        createdAt: r.created_at,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const publishTemplate = useCallback(async (
    plan: SavedPlan, title: string, description: string
  ) => {
    if (!user) return null;

    const { data, error } = await supabase.from("plan_templates").insert({
      author_id: user.id,
      plan_id: plan.id,
      title,
      description,
      business_field: plan.result.formData.businessField || "other",
      main_goal: plan.result.formData.mainGoal || "sales",
      budget_range: plan.result.formData.budgetRange || "medium",
    }).select().single();

    if (data) {
      await loadTemplates();
      return data.id;
    }
    return null;
  }, [user, loadTemplates]);

  const upvoteTemplate = useCallback(async (templateId: string) => {
    await supabase.rpc("increment_upvote", { template_id: templateId }).catch(() => {
      // Fallback: direct update
      supabase.from("plan_templates")
        .update({ upvotes: templates.find((t) => t.id === templateId)?.upvotes ?? 0 + 1 })
        .eq("id", templateId);
    });

    setTemplates((prev) => prev.map((t) =>
      t.id === templateId ? { ...t, upvotes: t.upvotes + 1 } : t
    ));
  }, [templates]);

  const useTemplate = useCallback(async (templateId: string) => {
    // Increment use count
    const template = templates.find((t) => t.id === templateId);
    if (!template) return null;

    await supabase.from("plan_templates")
      .update({ use_count: template.useCount + 1 })
      .eq("id", templateId);

    // Get the original plan data
    const { data } = await supabase.from("saved_plans")
      .select("result")
      .eq("id", template.planId)
      .single();

    return data?.result || null;
  }, [templates]);

  return { templates, loading, loadTemplates, publishTemplate, upvoteTemplate, useTemplate };
}
