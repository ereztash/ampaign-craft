// Cohort Benchmarks — query the anonymized cohort_benchmarks materialized view
// and convert to prompt-ready priors. Used by aiCopyService to inject
// high-converting patterns into Claude's system prompt.
//
// Data flow:
//   outcome_loop events → cohort_benchmarks (view) → fetchCohortPriors → prompt
//
// The view is anonymized + archetype-cohort-keyed. No PII leaves the DB.

import { supabase } from "@/integrations/supabase/client";

export interface CohortBenchmarkRow {
  archetype_id: string;
  action_id: string;
  sample_n: number;
  primary_pick_rate: number;
  variation_pick_rate: number;
  skip_rate: number;
  avg_conversion_7d: number | null;
  avg_conversion_30d: number | null;
  computed_at: string;
}

export interface CohortPriors {
  archetype: string;
  topActions: Array<{
    action_id: string;
    pick_rate: number;
    conversion_7d: number | null;
    sample_n: number;
  }>;
  sampleSize: number;
  /** Set to true only when there's enough data to be statistically meaningful. */
  isSignificant: boolean;
}

const MIN_SAMPLE_SIZE = 50;
const TOP_K = 5;

type SupabaseClient = typeof supabase;

/**
 * Fetch the top-K actions for a given archetype from cohort_benchmarks.
 * Returns null when the cohort is below the minimum sample threshold (cold start).
 */
export async function fetchCohortPriors(
  archetype: string,
  client: SupabaseClient = supabase,
): Promise<CohortPriors | null> {
  try {
    const { data, error } = await client
      .from("cohort_benchmarks")
      .select("archetype_id, action_id, sample_n, primary_pick_rate, avg_conversion_7d")
      .eq("archetype_id", archetype)
      .gte("sample_n", 10)
      .order("primary_pick_rate", { ascending: false })
      .limit(TOP_K);

    if (error || !data || data.length === 0) return null;

    const rows = data as Array<Pick<CohortBenchmarkRow, "archetype_id" | "action_id" | "sample_n" | "primary_pick_rate" | "avg_conversion_7d">>;
    const totalSample = rows.reduce((sum, r) => sum + r.sample_n, 0);

    return {
      archetype,
      topActions: rows.map((r) => ({
        action_id: r.action_id,
        pick_rate: Number(r.primary_pick_rate),
        conversion_7d: r.avg_conversion_7d !== null ? Number(r.avg_conversion_7d) : null,
        sample_n: r.sample_n,
      })),
      sampleSize: totalSample,
      isSignificant: totalSample >= MIN_SAMPLE_SIZE,
    };
  } catch {
    return null;
  }
}

/**
 * Format cohort priors as a prompt section.
 * Returns an empty string when priors are insufficient — never poisons the prompt.
 */
export function buildCohortPromptSection(priors: CohortPriors | null, language: "he" | "en" = "he"): string {
  if (!priors || !priors.isSignificant || priors.topActions.length === 0) return "";

  const lines: string[] = [];
  const header = language === "he"
    ? `=== נתוני קהורט אנונימיים (archetype: ${priors.archetype}, n=${priors.sampleSize}) ===`
    : `=== COHORT EVIDENCE (anonymized, archetype: ${priors.archetype}, n=${priors.sampleSize}) ===`;
  lines.push(header);

  const intro = language === "he"
    ? "משתמשים בארכיטיפ זה העדיפו את התבניות הבאות (לפי pick-rate; המרות של 7 ימים בסוגריים):"
    : "Users in this archetype preferred the following patterns (ranked by pick-rate; 7-day conversion in parens):";
  lines.push(intro);

  for (const action of priors.topActions) {
    const pct = Math.round(action.pick_rate * 100);
    const conv = action.conversion_7d !== null ? ` (conv: ${action.conversion_7d.toFixed(2)})` : "";
    lines.push(`  • ${action.action_id}: ${pct}%${conv} [n=${action.sample_n}]`);
  }

  const guidance = language === "he"
    ? "השתמש בדפוסים האלה כהטיה — לא כחיקוי. התאם למקרה הספציפי של המשתמש."
    : "Use these patterns as priors — not templates. Adapt to the user's specific case.";
  lines.push(guidance);

  return lines.join("\n");
}
