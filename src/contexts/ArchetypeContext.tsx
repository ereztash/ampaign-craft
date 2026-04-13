// ═══════════════════════════════════════════════
// Archetype Context — UserArchetypeLayer
// Persists behavioral profile across sessions.
// Classifies user into 1 of 5 MECE archetypes post-pipeline.
// Follows the same dual-mode (Supabase / localStorage) pattern as AuthContext.
// ═══════════════════════════════════════════════

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { BlackboardState } from "@/engine/blackboard/blackboardStore";
import type {
  ArchetypeId,
  ArchetypeUIConfig,
  ConfidenceTier,
  UserArchetypeProfile,
} from "@/types/archetype";
import { classifyArchetype, blendScores } from "@/engine/archetypeClassifier";
import { getArchetypeUIConfig } from "@/lib/archetypeUIConfig";
import { useAuth } from "@/contexts/AuthContext";

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════

const COLD_START_ARCHETYPE: ArchetypeId = "optimizer";
const SIGNAL_HISTORY_CAP = 50;
const SCHEMA_VERSION = 1;

function storageKey(userId: string): string {
  return `funnelforge-archetype-${userId}`;
}

// ═══════════════════════════════════════════════
// INITIAL / COLD-START PROFILE
// ═══════════════════════════════════════════════

function makeColdStartProfile(): UserArchetypeProfile {
  return {
    archetypeId: COLD_START_ARCHETYPE,
    confidence: 0,
    confidenceTier: "none",
    scores: { strategist: 0, optimizer: 0, pioneer: 0, connector: 0, closer: 0 },
    signalHistory: [],
    lastComputedAt: new Date().toISOString(),
    sessionCount: 0,
    version: SCHEMA_VERSION,
  };
}

// ═══════════════════════════════════════════════
// CONTEXT TYPES
// ═══════════════════════════════════════════════

interface ArchetypeContextValue {
  /** The stored profile (null until first hydration is complete) */
  profile: UserArchetypeProfile;
  /** Resolved UI config for the effective archetype */
  uiConfig: ArchetypeUIConfig;
  /** Effective archetype ID (after applying user override) */
  effectiveArchetypeId: ArchetypeId;
  /** Confidence tier of the effective profile */
  confidenceTier: ConfidenceTier;
  /** True while loading from storage */
  loading: boolean;
  /**
   * Called after each pipeline run.
   * Runs classifier, blends with existing profile, persists.
   */
  updateFromBlackboard: (state: Partial<BlackboardState>) => void;
  /**
   * Manual archetype override (any user can change their own profile).
   * Pass null to clear override and return to auto-classification.
   */
  setOverride: (archetypeId: ArchetypeId | null) => void;
  /** GDPR: clear all archetype data for this user */
  clearProfile: () => void;
}

const ArchetypeContext = createContext<ArchetypeContextValue | null>(null);

// ═══════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════

export function ArchetypeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserArchetypeProfile>(makeColdStartProfile);
  const [loading, setLoading] = useState(true);

  // ── Resolve effective archetype (user override takes precedence) ──
  const effectiveArchetypeId: ArchetypeId = profile.overrideByUser ?? profile.archetypeId;
  const confidenceTier: ConfidenceTier = profile.overrideByUser ? "strong" : profile.confidenceTier;
  const uiConfig = getArchetypeUIConfig(effectiveArchetypeId);

  // ── Hydrate from localStorage on user change ──
  useEffect(() => {
    if (!user) {
      setProfile(makeColdStartProfile());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const raw = localStorage.getItem(storageKey(user.id));
      if (raw) {
        const parsed: UserArchetypeProfile = JSON.parse(raw);
        // Version guard: reset if schema changed
        if (parsed.version === SCHEMA_VERSION) {
          setProfile(parsed);
        } else {
          setProfile(makeColdStartProfile());
        }
      } else {
        setProfile(makeColdStartProfile());
      }
    } catch {
      setProfile(makeColdStartProfile());
    }
    setLoading(false);
  }, [user?.id]);

  // ── Persist to localStorage whenever profile changes ──
  const persist = useCallback((next: UserArchetypeProfile) => {
    if (!user) return;
    try {
      localStorage.setItem(storageKey(user.id), JSON.stringify(next));
    } catch { /* quota exceeded — silently skip */ }

    // Fire-and-forget Supabase upsert
    void (async () => {
      try {
        const url = import.meta.env.VITE_SUPABASE_URL;
        if (!url) return;
        const { supabase } = await import("@/integrations/supabase/client");
        // Using raw REST upsert via supabase-js (typed as any since table may not be in generated types yet)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabase as any;
        await db.from("user_archetype_profiles").upsert({
          user_id: user.id,
          archetype_id: next.archetypeId,
          confidence: next.confidence,
          confidence_tier: next.confidenceTier,
          scores: next.scores,
          signal_history: next.signalHistory.slice(-SIGNAL_HISTORY_CAP),
          session_count: next.sessionCount,
          override_by_user: next.overrideByUser ?? null,
          updated_at: next.lastComputedAt,
          version: next.version,
        });
      } catch { /* Supabase not available — localStorage is source of truth */ }
    })();
  }, [user]);

  // ── updateFromBlackboard ──
  const updateFromBlackboard = useCallback((state: Partial<BlackboardState>) => {
    const result = classifyArchetype(state);

    setProfile((prev) => {
      const isFirstSession = prev.sessionCount === 0;
      const blendedScores = isFirstSession
        ? result.scores
        : blendScores(result.scores, prev.scores);

      // Re-classify on blended scores to get final archetype + confidence
      const totalBlended = Object.values(blendedScores).reduce((s, v) => s + v, 0);
      const sortedBlended = (Object.entries(blendedScores) as [ArchetypeId, number][])
        .sort((a, b) => b[1] - a[1]);
      const blendedConfidence = totalBlended > 0
        ? (sortedBlended[0][1] - sortedBlended[1][1]) / totalBlended
        : 0;
      const blendedArchetypeId = totalBlended > 0 ? sortedBlended[0][0] : COLD_START_ARCHETYPE;

      const tier: ConfidenceTier =
        blendedConfidence >= 0.8 ? "strong"
        : blendedConfidence >= 0.65 ? "confident"
        : blendedConfidence >= 0.5 ? "tentative"
        : "none";

      const next: UserArchetypeProfile = {
        archetypeId: blendedArchetypeId,
        confidence: blendedConfidence,
        confidenceTier: tier,
        scores: blendedScores,
        signalHistory: [...prev.signalHistory, ...result.signals].slice(-SIGNAL_HISTORY_CAP),
        lastComputedAt: new Date().toISOString(),
        sessionCount: prev.sessionCount + 1,
        overrideByUser: prev.overrideByUser,
        version: SCHEMA_VERSION,
      };

      persist(next);
      return next;
    });
  }, [persist]);

  // ── setOverride ──
  const setOverride = useCallback((archetypeId: ArchetypeId | null) => {
    setProfile((prev) => {
      const next: UserArchetypeProfile = {
        ...prev,
        overrideByUser: archetypeId ?? undefined,
        lastComputedAt: new Date().toISOString(),
      };
      persist(next);
      return next;
    });
  }, [persist]);

  // ── clearProfile ──
  const clearProfile = useCallback(() => {
    const fresh = makeColdStartProfile();
    setProfile(fresh);
    if (user) {
      try { localStorage.removeItem(storageKey(user.id)); } catch { /* ignore */ }
    }
  }, [user]);

  return (
    <ArchetypeContext.Provider value={{
      profile,
      uiConfig,
      effectiveArchetypeId,
      confidenceTier,
      loading,
      updateFromBlackboard,
      setOverride,
      clearProfile,
    }}>
      {children}
    </ArchetypeContext.Provider>
  );
}

// ═══════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════

export function useArchetype(): ArchetypeContextValue {
  const ctx = useContext(ArchetypeContext);
  if (!ctx) throw new Error("useArchetype must be used within ArchetypeProvider");
  return ctx;
}
