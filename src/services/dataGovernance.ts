// ═══════════════════════════════════════════════
// Data Governance Service — GDPR compliance
// Right-to-delete (Article 17) and data export (Article 20)
// ═══════════════════════════════════════════════

import { safeStorage } from "@/lib/safeStorage";
import { supabaseLoose } from "@/integrations/supabase/loose";
import { logger } from "@/lib/logger";

const ALL_STORAGE_KEYS = [
  "funnelforge-user-profile",
  "funnelforge-last-form",
  "funnelforge-plans",
  "funnelforge-achievements",
  "funnelforge-profile",
  "funnelforge-investment",
  "funnelforge-milestones",
  "funnelforge-consent",
  "funnelforge-llm-usage",
  "funnelforge-streak",
  "funnelforge-coach-messages",
  "funnelforge-differentiation-result",
  "funnelforge-stylome-voice",
  "funnelforge-data-sources",
  "funnelforge-meta-monitor",
  "funnelforge-training-buffer",
  "funnelforge-onboarding-done",
  "funnelforge-users",
  "funnelforge-session",
  "funnelforge-audit-log",
];

// Tables that contain per-user data. Both exportUserData and
// deleteAllUserData operate on this same list so Article 17 (erasure) and
// Article 20 (portability) cover the same ground.
const SUPABASE_USER_TABLES = [
  "shared_context",
  "training_pairs",
  "user_archetype_profiles",
] as const;

/**
 * GDPR Article 17 — Right to erasure.
 * Purges all user data from localStorage and optionally from Supabase.
 */
export async function deleteAllUserData(userId?: string): Promise<{ deletedKeys: string[] }> {
  const deletedKeys: string[] = [];

  // Clear known keys
  for (const key of ALL_STORAGE_KEYS) {
    if (safeStorage.getString(key, "")) {
      safeStorage.remove(key);
      deletedKeys.push(key);
    }
  }

  // Also clear any funnelforge-prefixed keys we might have missed
  for (const key of safeStorage.removeWithPrefix("funnelforge-")) {
    if (!deletedKeys.includes(key)) deletedKeys.push(key);
  }

  // Clear Supabase data if userId is provided
  if (userId) {
    for (const table of SUPABASE_USER_TABLES) {
      try {
        await supabaseLoose.from(table).delete().eq("user_id", userId);
        deletedKeys.push(`supabase:${table}`);
      } catch (err) {
        logger.warn(`dataGovernance.delete:${table}`, err);
        // Supabase unavailable for this table — local deletion still succeeds
      }
    }
  }

  return { deletedKeys };
}

/**
 * GDPR Article 20 — Right to data portability.
 * Exports all user data — both localStorage and (if userId is provided) the
 * same Supabase tables that deleteAllUserData purges. Symmetrical coverage
 * means a user who exports + deletes gets a complete archive of what was
 * removed, not just the browser-cached subset.
 */
export async function exportUserData(userId?: string): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};

  for (const key of ALL_STORAGE_KEYS) {
    const raw = safeStorage.getString(key, "");
    if (raw) {
      try {
        data[key] = JSON.parse(raw);
      } catch {
        data[key] = raw;
      }
    }
  }

  // Pull the same Supabase tables that deleteAllUserData purges. Without this
  // an Article 20 request returned only the browser cache — server-side rows
  // (training pairs, archetype profile, blackboard contexts) were invisible.
  if (userId) {
    for (const table of SUPABASE_USER_TABLES) {
      try {
        const { data: rows, error } = await supabaseLoose
          .from(table)
          .select("*")
          .eq("user_id", userId);
        if (error) throw error;
        data[`supabase:${table}`] = rows ?? [];
      } catch (err) {
        logger.warn(`dataGovernance.export:${table}`, err);
        data[`supabase:${table}`] = { _error: "fetch_failed" };
      }
    }
  }

  data._exportedAt = new Date().toISOString();
  data._format = "funnelforge-gdpr-export-v2";

  return data;
}

/**
 * Download user data export as a JSON file.
 */
export async function downloadUserDataExport(userId?: string): Promise<void> {
  const data = await exportUserData(userId);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `funnelforge-data-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
