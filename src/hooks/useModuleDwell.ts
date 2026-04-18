// ═══════════════════════════════════════════════
// useModuleDwell — per-module dwell time tracker
//
// Records when the user first and last visited each route-based module.
// Returns dwell info for the current location so BlindSpotNudge can
// decide whether to surface a reminder.
//
// Storage key: funnelforge-dwell-${userId}-${moduleId}
// Dismiss key: funnelforge-nudge-dismiss-${userId}-${moduleId}
//
// Rate-limit window: 72 hours (plan §7 guardrail — max once per 72h
// per module per user).
// ═══════════════════════════════════════════════

import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { useAuth } from "@/contexts/AuthContext";
import { getBlindSpotProfile } from "@/lib/archetypeBlindSpots";
import { safeStorage } from "@/lib/safeStorage";
import type { BlindSpotEntry } from "@/lib/archetypeBlindSpots";

const DISMISS_WINDOW_MS = 72 * 60 * 60 * 1000; // 72 hours

interface DwellRecord {
  firstVisitAt: string; // ISO timestamp
  lastVisitAt: string;  // ISO timestamp
}

interface DismissRecord {
  dismissedAt: string;  // ISO timestamp
}

function dwellKey(userId: string, moduleId: string): string {
  return `funnelforge-dwell-${userId}-${moduleId}`;
}

function dismissKey(userId: string, moduleId: string): string {
  return `funnelforge-nudge-dismiss-${userId}-${moduleId}`;
}

function getDwellRecord(userId: string, moduleId: string): DwellRecord | null {
  return safeStorage.getJSON<DwellRecord | null>(dwellKey(userId, moduleId), null);
}

function setDwellRecord(userId: string, moduleId: string, record: DwellRecord): void {
  safeStorage.setJSON(dwellKey(userId, moduleId), record);
}

export function getDismissRecord(userId: string, moduleId: string): DismissRecord | null {
  return safeStorage.getJSON<DismissRecord | null>(dismissKey(userId, moduleId), null);
}

export function setDismissRecord(userId: string, moduleId: string): void {
  const record: DismissRecord = { dismissedAt: new Date().toISOString() };
  safeStorage.setJSON(dismissKey(userId, moduleId), record);
}

/** Returns true if the module was dismissed within the 72-hour window. */
export function isRecentlyDismissed(userId: string, moduleId: string): boolean {
  const record = getDismissRecord(userId, moduleId);
  if (!record) return false;
  const elapsed = Date.now() - new Date(record.dismissedAt).getTime();
  return elapsed < DISMISS_WINDOW_MS;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface ModuleDwellResult {
  /** Module id matching BlindSpotEntry.moduleId, or null if route not tracked */
  moduleId: string | null;
  /** Calendar days since first visit (0 = same day) */
  daysSinceFirstVisit: number;
  /** True if the module's completion key has been hit */
  isCompleted: boolean;
  /** The active blind spot entry for this module (if any) */
  blindSpotEntry: BlindSpotEntry | null;
  /**
   * True when:
   *   - adaptationsEnabled
   *   - dwell ≥ dwellThresholdDays
   *   - module not completed
   *   - not dismissed within 72h
   */
  shouldNudge: boolean;
}

/** Check a completionKey against localStorage — reuses same logic as useArchetypePipeline. */
function resolveCompletion(completionKey: string | undefined): boolean {
  if (!completionKey) return false;
  const raw = safeStorage.getString(completionKey, "");
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.length > 0;
  } catch { /* not JSON */ }
  return true;
}

export function useModuleDwell(): ModuleDwellResult {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { effectiveArchetypeId, adaptationsEnabled, confidenceTier } = useArchetype();

  const userId = user?.id ?? "anonymous";

  // Find the matching blind spot entry for the current route
  const blindSpotEntry = useMemo<BlindSpotEntry | null>(() => {
    if (!adaptationsEnabled || (confidenceTier !== "confident" && confidenceTier !== "strong")) {
      return null;
    }
    const profile = getBlindSpotProfile(effectiveArchetypeId);
    return profile.moduleBlindSpots.find((bs) => bs.routePath === pathname) ?? null;
  }, [pathname, effectiveArchetypeId, adaptationsEnabled, confidenceTier]);

  // Record the visit — on every pathname change
  useEffect(() => {
    if (!blindSpotEntry) return;
    const moduleId = blindSpotEntry.moduleId;
    const now = new Date().toISOString();
    const existing = getDwellRecord(userId, moduleId);
    if (existing) {
      setDwellRecord(userId, moduleId, { ...existing, lastVisitAt: now });
    } else {
      setDwellRecord(userId, moduleId, { firstVisitAt: now, lastVisitAt: now });
    }
  }, [pathname, blindSpotEntry, userId]);

  // Compute the result
  return useMemo<ModuleDwellResult>(() => {
    if (!blindSpotEntry) {
      return {
        moduleId: null,
        daysSinceFirstVisit: 0,
        isCompleted: false,
        blindSpotEntry: null,
        shouldNudge: false,
      };
    }

    const moduleId = blindSpotEntry.moduleId;
    const record = getDwellRecord(userId, moduleId);
    const firstVisitAt = record ? new Date(record.firstVisitAt).getTime() : Date.now();
    const daysSinceFirstVisit = Math.floor((Date.now() - firstVisitAt) / (1000 * 60 * 60 * 24));

    const isCompleted = resolveCompletion(
      // We find the completion key from the archetype pipeline config
      (() => {
        const completionKeyMap: Record<string, string> = {
          "/differentiate": "funnelforge-differentiation-result",
          "/data":          "funnelforge-data-sources",
          "/wizard":        "funnelforge-plans",
          "/ai":            "funnelforge-coach-messages",
          "/sales":         "funnelforge-last-quote",
          "/pricing":       "funnelforge-last-quote",
          "/retention":     "funnelforge-retention-data",
        };
        return completionKeyMap[blindSpotEntry.routePath];
      })()
    );

    const dismissed = isRecentlyDismissed(userId, moduleId);

    const shouldNudge =
      adaptationsEnabled &&
      daysSinceFirstVisit >= blindSpotEntry.dwellThresholdDays &&
      !isCompleted &&
      !dismissed;

    return { moduleId, daysSinceFirstVisit, isCompleted, blindSpotEntry, shouldNudge };
  }, [blindSpotEntry, userId, adaptationsEnabled]);
}
