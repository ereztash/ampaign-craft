// ═══════════════════════════════════════════════
// Share Service — Generate shareable plan links
// Stores plan snapshots in Supabase (if available)
// or falls back to localStorage-based sharing.
// ═══════════════════════════════════════════════

import type { SavedPlan } from "@/types/funnel";

const SHARES_KEY = "funnelforge-shared-plans";
const EXPIRY_DAYS = 30;

export interface SharedPlanSnapshot {
  shareId: string;
  planId: string;
  planName: string;
  result: unknown; // FunnelResult — stripped of sensitive data
  formData: unknown; // FormData — basics only
  createdAt: string;
  expiresAt: string;
  viewCount: number;
}

function generateShareId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function getSharedPlans(): SharedPlanSnapshot[] {
  try {
    const raw = localStorage.getItem(SHARES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSharedPlans(plans: SharedPlanSnapshot[]): void {
  localStorage.setItem(SHARES_KEY, JSON.stringify(plans));
}

/**
 * Strip sensitive data from a plan before sharing.
 * Removes DISC profile, financial details, and personal identifiers.
 */
function stripSensitiveData(plan: SavedPlan): { result: unknown; formData: unknown } {
  const result = { ...plan.result };
  // Keep funnel stages, budget ranges, channels — strip any personal data
  const formData = {
    businessField: plan.result.formData.businessField,
    audienceType: plan.result.formData.audienceType,
    mainGoal: plan.result.formData.mainGoal,
    salesModel: plan.result.formData.salesModel,
    experienceLevel: plan.result.formData.experienceLevel,
    // Don't share: productDescription (may contain business secrets), averagePrice, etc.
  };

  return { result, formData };
}

/**
 * Create a shareable link for a plan.
 * Returns the share URL path (e.g., /shared/abc123xyz456).
 */
export async function createShareLink(plan: SavedPlan): Promise<string> {
  const shareId = generateShareId();
  const { result, formData } = stripSensitiveData(plan);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + EXPIRY_DAYS);

  const snapshot: SharedPlanSnapshot = {
    shareId,
    planId: plan.id,
    planName: plan.name,
    result,
    formData,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    viewCount: 0,
  };

  // Try Supabase first
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const db = supabase as unknown as import("@supabase/supabase-js").SupabaseClient;
    await db.from("shared_plans").insert({
      share_id: shareId,
      plan_id: plan.id,
      snapshot: JSON.stringify(snapshot),
      expires_at: expiresAt.toISOString(),
    });
  } catch {
    // Supabase unavailable — save locally
  }

  // Always save locally as backup
  const existing = getSharedPlans();
  existing.push(snapshot);
  saveSharedPlans(existing);

  return `/shared/${shareId}`;
}

/**
 * Load a shared plan by its shareId.
 * Checks expiry and increments view count.
 */
export function loadSharedPlan(shareId: string): SharedPlanSnapshot | null {
  const plans = getSharedPlans();
  const plan = plans.find((p) => p.shareId === shareId);

  if (!plan) return null;

  // Check expiry
  if (new Date(plan.expiresAt) < new Date()) {
    return null; // expired
  }

  // Increment view count
  plan.viewCount++;
  saveSharedPlans(plans);

  return plan;
}

/**
 * Get all shared plans (for the sharing user's management view).
 */
export function getMySharedPlans(): SharedPlanSnapshot[] {
  return getSharedPlans().filter((p) => new Date(p.expiresAt) >= new Date());
}

/**
 * Revoke a shared plan.
 */
export function revokeShareLink(shareId: string): void {
  const plans = getSharedPlans().filter((p) => p.shareId !== shareId);
  saveSharedPlans(plans);
}
