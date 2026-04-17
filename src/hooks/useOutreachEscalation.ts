// useOutreachEscalation — watch for "stuck" users and trigger the outreach agent.
//
// Escalation rules (conservative — avoid spamming):
//   1. User is dwelling on a module past the archetype threshold (reuses useModuleDwell)
//   2. Dwell has lasted ≥ 7 days (longer than the BlindSpotNudge threshold)
//   3. User has NOT been outreached to for this module in the past 30 days
//   4. adaptationsEnabled is true
//
// When all 4 conditions hold, calls the outreach-agent edge function once
// (in_app channel by default — never initiates email/whatsapp without explicit consent).

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useModuleDwell } from "./useModuleDwell";
import { safeStorage } from "@/lib/safeStorage";
import { logger } from "@/lib/logger";

const ESCALATION_KEY_PREFIX = "funnelforge-outreach-sent";
const STUCK_THRESHOLD_DAYS = 7;
const COOLDOWN_DAYS = 30;

type Archetype = "strategist" | "optimizer" | "pioneer" | "connector" | "closer";
type OutreachChannel = "in_app" | "email" | "whatsapp";

interface OutreachRecord {
  moduleId: string;
  dispatchedAt: string;
  channel: OutreachChannel;
}

function wasRecentlyOutreached(userId: string, moduleId: string): boolean {
  const key = `${ESCALATION_KEY_PREFIX}-${userId}-${moduleId}`;
  const record = safeStorage.getJSON<OutreachRecord | null>(key, null);
  if (!record) return false;
  const ageDays = (Date.now() - new Date(record.dispatchedAt).getTime()) / 86_400_000;
  return ageDays < COOLDOWN_DAYS;
}

function markOutreached(userId: string, moduleId: string, channel: OutreachChannel): void {
  const key = `${ESCALATION_KEY_PREFIX}-${userId}-${moduleId}`;
  safeStorage.setJSON(key, {
    moduleId,
    channel,
    dispatchedAt: new Date().toISOString(),
  } satisfies OutreachRecord);
}

/**
 * Wire this hook once at the app shell level (or on module pages).
 * It is fire-and-forget — returns nothing visible to the caller.
 * The outreach result surfaces via NotificationCenter (in_app channel).
 */
export function useOutreachEscalation(channel: OutreachChannel = "in_app"): void {
  const { user } = useAuth();
  const { effectiveArchetypeId, adaptationsEnabled } = useArchetype();
  const { language } = useLanguage();
  const { moduleId, daysSinceFirstVisit, isCompleted, shouldNudge } = useModuleDwell();
  // Guard: fire at most once per mount per module
  const firedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    if (!adaptationsEnabled) return;
    if (!moduleId) return;
    if (isCompleted) return;
    if (!shouldNudge) return; // dwell hasn't crossed archetype threshold yet
    if (daysSinceFirstVisit < STUCK_THRESHOLD_DAYS) return;
    if (wasRecentlyOutreached(user.id, moduleId)) return;
    if (firedForRef.current === moduleId) return;
    firedForRef.current = moduleId;

    // Fire-and-forget. Failures are logged but never surfaced to the user.
    (async () => {
      try {
        const { error } = await supabase.functions.invoke("outreach-agent", {
          body: {
            moduleId,
            channel,
            archetype: effectiveArchetypeId as Archetype,
            language,
          },
        });
        if (error) {
          logger.warn("outreach-agent", error);
          return;
        }
        markOutreached(user.id, moduleId, channel);
      } catch (e) {
        logger.warn("outreach-agent:invoke", e);
      }
    })();
  }, [user?.id, adaptationsEnabled, moduleId, isCompleted, shouldNudge, daysSinceFirstVisit, channel, effectiveArchetypeId, language]);
}
