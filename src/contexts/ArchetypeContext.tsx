// ═══════════════════════════════════════════════
// Archetype Context — UserArchetypeLayer
// Persists behavioral profile across sessions.
// Classifies user into 1 of 5 MECE archetypes post-pipeline.
// Follows the same dual-mode (Supabase / localStorage) pattern as AuthContext.
// ═══════════════════════════════════════════════

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
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
import { safeStorage } from "@/lib/safeStorage";

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════

const COLD_START_ARCHETYPE: ArchetypeId = "optimizer";
const SIGNAL_HISTORY_CAP = 50;
const SCHEMA_VERSION = 2;

// Loop 2: Behavioral Correction constants
const VARIANT_PICK_STORAGE_PREFIX = "funnelforge-variant-picks-";
const VARIANT_PICK_WINDOW = 20;      // analyze last N picks
const VARIANT_PICK_THRESHOLD = 10;   // minimum picks before correction fires
// Expected primary pick rate per archetype (from behavioral theory):
//   Strategist/Optimizer = systematic → prefer primary (high certainty picks)
//   Pioneer/Connector/Closer = heuristic → more comfortable with variation
const EXPECTED_PRIMARY_RATE: Record<ArchetypeId, number> = {
  strategist: 0.60,
  optimizer:  0.60,
  pioneer:    0.45,
  connector:  0.45,
  closer:     0.50,
};
// If actual primary rate is this far below expected, lower confidence by one tier
const DIVERGENCE_THRESHOLD = 0.25;

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
    adaptationsEnabled: false,
    revealSeen: false,
    version: SCHEMA_VERSION,
  };
}

/** Migrate a v1 profile to v2 — preserves all existing fields, adds new flags. */
function migrateV1ToV2(p: UserArchetypeProfile): UserArchetypeProfile {
  return {
    ...p,
    adaptationsEnabled: false,
    revealSeen: false,
    version: SCHEMA_VERSION,
  };
}

// ═══════════════════════════════════════════════
// CONTEXT TYPES
// ═══════════════════════════════════════════════

export interface ArchetypeContextValue {
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
  /**
   * Whether the user has opted in to UI adaptations.
   * Set via the ArchetypeRevealScreen or Profile page.
   * All personalisation (colours, density, motion) is gated on this flag.
   */
  adaptationsEnabled: boolean;
  /** Toggle UI adaptation on/off. One-click opt-out from Profile or AppSidebar. */
  setAdaptationsEnabled: (enabled: boolean) => void;
  /** True once the user has visited the ArchetypeRevealScreen at least once. */
  revealSeen: boolean;
  /** Mark the reveal as seen (called on first mount of ArchetypeRevealScreen). */
  markRevealSeen: () => void;
  /**
   * Loop 2 — Behavioral Correction.
   * Record a variant pick (primary / variation / skip).
   * After VARIANT_PICK_THRESHOLD picks, checks if the user's actual pick pattern
   * diverges from the expected pattern for their archetype.
   * If divergence exceeds DIVERGENCE_THRESHOLD, lowers confidence tier by one step.
   */
  recordVariantPick: (choice: "primary" | "variation" | "skip") => void;
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
  // Pull user.id out so the effect only depends on the stable id, not the
  // (sometimes-recreated) user object reference.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      setProfile(makeColdStartProfile());
      setLoading(false);
      return;
    }

    setLoading(true);
    const parsed = safeStorage.getJSON<UserArchetypeProfile | null>(storageKey(userId), null);
    if (parsed) {
      if (parsed.version === SCHEMA_VERSION) {
        setProfile(parsed);
      } else if (parsed.version === 1) {
        // Migrate v1 → v2: existing personalisation was silent/automatic,
        // so we start with adaptationsEnabled=false — the user must accept
        // the reveal to re-enable it (IKEA-effect transparency).
        setProfile(migrateV1ToV2(parsed));
      } else {
        setProfile(makeColdStartProfile());
      }
    } else {
      setProfile(makeColdStartProfile());
    }
    setLoading(false);
  }, [userId]);

  // ── Persist to localStorage whenever profile changes ──
  const persist = useCallback((next: UserArchetypeProfile) => {
    if (!user) return;
    safeStorage.setJSON(storageKey(user.id), next);

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
      safeStorage.remove(storageKey(user.id));
    }
  }, [user]);

  // ── setAdaptationsEnabled ──
  const setAdaptationsEnabled = useCallback((enabled: boolean) => {
    setProfile((prev) => {
      const next: UserArchetypeProfile = {
        ...prev,
        adaptationsEnabled: enabled,
        lastComputedAt: new Date().toISOString(),
      };
      persist(next);
      return next;
    });
  }, [persist]);

  // ── markRevealSeen ──
  const markRevealSeen = useCallback(() => {
    setProfile((prev) => {
      if (prev.revealSeen) return prev; // idempotent
      const next: UserArchetypeProfile = {
        ...prev,
        revealSeen: true,
        lastComputedAt: new Date().toISOString(),
      };
      persist(next);
      return next;
    });
  }, [persist]);

  // ── recordVariantPick (Loop 2: Behavioral Correction) ──
  const recordVariantPick = useCallback((choice: "primary" | "variation" | "skip") => {
    if (!user) return;

    const pickKey = `${VARIANT_PICK_STORAGE_PREFIX}${user.id}`;
    const picks = safeStorage.getJSON<string[]>(pickKey, []);

    picks.push(choice);
    const window = picks.slice(-VARIANT_PICK_WINDOW);
    safeStorage.setJSON(pickKey, window);

    if (window.length < VARIANT_PICK_THRESHOLD) return;

    // Check divergence from expected primary rate for this archetype
    const primaryCount = window.filter((c) => c === "primary").length;
    const primaryRate = primaryCount / window.length;
    const expected = EXPECTED_PRIMARY_RATE[effectiveArchetypeId] ?? 0.50;
    const divergence = expected - primaryRate; // positive = user picks primary less than expected

    if (divergence >= DIVERGENCE_THRESHOLD) {
      setProfile((prev) => {
        // Lower confidence by one tier
        const tierOrder: ConfidenceTier[] = ["none", "tentative", "confident", "strong"];
        const currentIdx = tierOrder.indexOf(prev.confidenceTier);
        const newTier = currentIdx > 0 ? tierOrder[currentIdx - 1] : prev.confidenceTier;
        if (newTier === prev.confidenceTier) return prev; // already at floor

        const next: UserArchetypeProfile = {
          ...prev,
          confidenceTier: newTier,
          confidence: Math.max(prev.confidence - 0.10, 0),
          lastComputedAt: new Date().toISOString(),
        };
        persist(next);
        return next;
      });
    }
  }, [user, effectiveArchetypeId, persist]);

  const adaptationsEnabled = profile.adaptationsEnabled === true;
  const revealSeen = profile.revealSeen === true;

  // Memoise so consumers only re-render when something actually changes.
  // Without this, every provider render rebuilds the object literal and
  // every `useArchetype()` consumer re-renders even on unrelated state.
  const value = useMemo(
    () => ({
      profile,
      uiConfig,
      effectiveArchetypeId,
      confidenceTier,
      loading,
      updateFromBlackboard,
      setOverride,
      clearProfile,
      adaptationsEnabled,
      setAdaptationsEnabled,
      revealSeen,
      markRevealSeen,
      recordVariantPick,
    }),
    [
      profile,
      uiConfig,
      effectiveArchetypeId,
      confidenceTier,
      loading,
      updateFromBlackboard,
      setOverride,
      clearProfile,
      adaptationsEnabled,
      setAdaptationsEnabled,
      revealSeen,
      markRevealSeen,
      recordVariantPick,
    ],
  );

  return <ArchetypeContext.Provider value={value}>{children}</ArchetypeContext.Provider>;
}

// ═══════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════

export function useArchetype(): ArchetypeContextValue {
  const ctx = useContext(ArchetypeContext);
  if (!ctx) throw new Error("useArchetype must be used within ArchetypeProvider");
  return ctx;
}
