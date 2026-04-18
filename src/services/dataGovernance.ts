// ═══════════════════════════════════════════════
// Data Governance Service — GDPR compliance
// Right-to-delete (Article 17) and data export (Article 20)
// ═══════════════════════════════════════════════

import { safeStorage } from "@/lib/safeStorage";

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
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const db = supabase as unknown as import("@supabase/supabase-js").SupabaseClient;
      await db.from("shared_context").delete().eq("user_id", userId);
      await db.from("training_pairs").delete().eq("user_id", userId);
      await db.from("user_archetype_profiles").delete().eq("user_id", userId);
      deletedKeys.push("supabase:shared_context", "supabase:training_pairs", "supabase:user_archetype_profiles");
    } catch {
      // Supabase unavailable — local deletion still succeeds
    }
  }

  return { deletedKeys };
}

/**
 * GDPR Article 20 — Right to data portability.
 * Exports all user data as a JSON object.
 */
export function exportUserData(): Record<string, unknown> {
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

  data._exportedAt = new Date().toISOString();
  data._format = "funnelforge-gdpr-export-v1";

  return data;
}

/**
 * Download user data export as a JSON file.
 */
export function downloadUserDataExport(): void {
  const data = exportUserData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `funnelforge-data-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
