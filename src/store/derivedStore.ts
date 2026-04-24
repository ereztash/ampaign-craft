// ═══════════════════════════════════════════════
// Derived-state store — single source of truth for
// cross-page derivations (graph, healthScore, disc, …).
//
// Why this exists
// ───────────────
// Before this store, Dashboard and CommandCenter each re-ran the
// same heavy engines on every mount *and* on every unrelated tick
// of UserProfileContext (which, pre-Move-1, churned reference
// identity on the 60s session-minute ticker). Some engines ran
// twice inside a single page — e.g. inferDISCProfile at
// Dashboard.tsx:114 and :128 with identical inputs.
//
// This module computes each derivation ONCE per input change and
// caches it. Pages read via `useDerivedStore(s => s.healthScore)`
// selectors; Zustand does the shallow-eq dance so a consumer only
// re-renders when the exact slice it reads changed.
//
// Inputs are driven by <DerivedStateSync/> mounted once under
// UserProfileProvider. Synchronisation is unidirectional:
//   UserProfileContext + plans-storage  →  syncFromInputs()  →  store
//                                             ↑
//               (engines run here, once per input change)
//
// Move 3 will move the synchronous engine work off the main
// thread. The action signature stays the same; only the body
// switches to `await runInWorker(...)`.
// ═══════════════════════════════════════════════

import { create } from "zustand";

import type { FormData, SavedPlan } from "@/types/funnel";
import {
  buildUserKnowledgeGraph,
  loadChatInsights,
  loadImportedDataSignals,
  loadMetaSignals,
  type UserKnowledgeGraph,
} from "@/engine/userKnowledgeGraph";
import { calculateHealthScore, type HealthScore } from "@/engine/healthScoreEngine";
import { inferDISCProfile, type DISCProfile } from "@/engine/discProfileEngine";
import { assessChurnRisk, type ChurnRiskAssessment } from "@/engine/churnPredictionEngine";
import { assignToCohort, type CohortAssignment } from "@/engine/behavioralCohortEngine";
import { calculateCostOfInaction, type CostOfInaction } from "@/engine/costOfInactionEngine";

export interface DerivedState {
  /** ── Inputs — driven by DerivedStateSync ── */
  formData: FormData | null;
  latestPlan: SavedPlan | null;

  /** ── Derivations — computed once per input change ── */
  graph: UserKnowledgeGraph | null;
  healthScore: HealthScore | null;
  disc: DISCProfile | null;
  churnRisk: ChurnRiskAssessment | null;
  cohort: CohortAssignment | null;
  costOfInaction: CostOfInaction | null;

  /** ── Actions ── */
  /**
   * Recompute derivations from inputs. No-op if references are
   * identical (Object.is). Computation is incremental:
   *   - formData changes  → graph, disc, churnRisk rebuild
   *   - plan changes      → healthScore, costOfInaction rebuild
   *   - either changes    → cohort rebuilds
   */
  syncFromInputs: (formData: FormData | null, latestPlan: SavedPlan | null) => void;
  /** Clear everything — used on sign-out and in tests. */
  reset: () => void;
}

const EMPTY: Omit<DerivedState, "syncFromInputs" | "reset"> = {
  formData: null,
  latestPlan: null,
  graph: null,
  healthScore: null,
  disc: null,
  churnRisk: null,
  cohort: null,
  costOfInaction: null,
};

export const useDerivedStore = create<DerivedState>((set, get) => ({
  ...EMPTY,

  syncFromInputs(formData, latestPlan) {
    const prev = get();
    const formDataChanged = formData !== prev.formData;
    const planChanged = latestPlan !== prev.latestPlan;
    if (!formDataChanged && !planChanged) return;

    // ── formData-scoped derivations ──
    let graph = prev.graph;
    let disc = prev.disc;
    let churnRisk = prev.churnRisk;
    if (formDataChanged) {
      graph = formData
        ? buildUserKnowledgeGraph(
            formData,
            undefined,
            undefined,
            undefined,
            undefined,
            {
              chatInsights: loadChatInsights() ?? undefined,
              importedData: loadImportedDataSignals() ?? undefined,
              metaSignals: loadMetaSignals() ?? undefined,
            },
          )
        : null;
      disc = formData ? inferDISCProfile(formData, graph) : null;
      churnRisk = formData ? assessChurnRisk(formData) : null;
    }

    // ── plan-scoped derivations ──
    let healthScore = prev.healthScore;
    let costOfInaction = prev.costOfInaction;
    if (planChanged || formDataChanged) {
      healthScore = latestPlan
        ? calculateHealthScore(latestPlan.result, graph ?? undefined)
        : null;
      costOfInaction = latestPlan
        ? calculateCostOfInaction(latestPlan.result, graph ?? undefined)
        : null;
    }

    // ── cross-input derivation ──
    const cohort =
      formData && disc
        ? assignToCohort(formData, disc, healthScore?.total, undefined)
        : null;

    set({ formData, latestPlan, graph, healthScore, disc, churnRisk, cohort, costOfInaction });
  },

  reset() {
    set(EMPTY);
  },
}));

// Convenience selectors. Prefer these over inline (s => s.x) so
// the selector identity stays stable across renders (Zustand uses
// the selector reference as part of its subscribe key).
export const selectGraph = (s: DerivedState) => s.graph;
export const selectHealthScore = (s: DerivedState) => s.healthScore;
export const selectDisc = (s: DerivedState) => s.disc;
export const selectChurnRisk = (s: DerivedState) => s.churnRisk;
export const selectCohort = (s: DerivedState) => s.cohort;
export const selectCostOfInaction = (s: DerivedState) => s.costOfInaction;
