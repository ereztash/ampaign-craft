// ═══════════════════════════════════════════════
// Prospect Intelligence Engine
//
// On signup, we fire a background request to infer the prospect's business
// context from their email domain + name. The result is stored in
// safeStorage and surfaced on the first post-signup screen.
//
// Weakest-leg detection maps to Fogg B=MAT:
//   motivation — user hasn't described a clear goal
//   ability     — domain signals a solo operator with limited time
//   trigger     — no external urgency detected
// ═══════════════════════════════════════════════

import { safeStorage } from "@/lib/safeStorage";
import { supabase } from "@/integrations/supabase/client";

export type FoggLeg = "motivation" | "ability" | "trigger";

export interface ProspectProfile {
  email: string;
  fullName: string;
  confidence: number;             // 0-1: how confident the inference is
  inferredBusinessType?: string;  // "freelancer" | "agency" | "ecommerce" | "saas" | "local_service" | "unknown"
  inferredIndustry?: string;
  weakestLeg: FoggLeg;           // which Fogg B=MAT leg needs the most attention
  firstScreenMessage: {
    he: string;
    en: string;
  };
  fetchedAt: number; // Date.now()
}

const STORAGE_KEY = "prospect_profile_v1";

export function getProspectProfile(): ProspectProfile | null {
  const raw = safeStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProspectProfile;
  } catch {
    return null;
  }
}

export function clearProspectProfile(): void {
  safeStorage.removeItem(STORAGE_KEY);
}

/**
 * Fire-and-forget: calls the prospect-research Edge Function and stores the
 * result locally. Called immediately after successful signup.
 * Errors are swallowed — a missing prospect profile should never block signup.
 */
export async function triggerProspectResearch(
  email: string,
  fullName: string,
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prospect-research`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ email, fullName }),
    });

    if (!res.ok) return;

    const profile = (await res.json()) as ProspectProfile;
    safeStorage.setItem(STORAGE_KEY, JSON.stringify({ ...profile, fetchedAt: Date.now() }));
  } catch {
    // Prospect research is best-effort; never block signup flow
  }
}
