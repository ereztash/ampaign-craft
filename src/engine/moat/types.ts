// ═══════════════════════════════════════════════
// src/engine/moat/types.ts
//
// Single import surface for consumers inside src/. Re-exports the
// authoritative contracts from knowledge/types/principles.ts so that
// src/ callers never have to reach upstream path directly.
//
// Upstream is read-only: edits go to knowledge/types/principles.ts,
// never here.
// ═══════════════════════════════════════════════

export type {
  ModuleId,
  PrincipleId,
  Principle,
  PrincipleSourceRef,
  PrincipleLibrary,
  SourceDoc,
  SourceRegistry,
  ClientDiagnostic,
  CompetitorSnapshot,
  MatchResult,
  MoatCandidate,
} from "../../../knowledge/types/principles";

// ─── Additions local to the grounding layer ───

import type { PrincipleId } from "../../../knowledge/types/principles";
import type { HiddenValueType, CompetitorArchetypeId } from "@/types/differentiation";

/**
 * Output of the enricher. One entry per (hiddenValue|archetype) surface
 * in the DifferentiationResult. Empty `principles` means the surface
 * has no mapping in the current library version — the UI must still
 * show the entry with a "no research mapping yet" message (T4).
 */
export interface PrincipleTrace {
  /** Which surface this trace annotates. */
  surface:
    | { kind: "hidden_value"; id: HiddenValueType; score: number }
    | { kind: "archetype"; id: CompetitorArchetypeId };
  /** Resolved principles for that surface. Possibly empty. */
  principles: TracedPrinciple[];
}

/**
 * A principle resolved with its source documents inlined. This is what
 * the modal renders. `sources` are the full SourceDoc entries, not just
 * IDs, so the modal has everything it needs without a second lookup.
 */
export interface TracedPrinciple {
  principle_id: PrincipleId;
  name_he: string;
  name_en: string;
  definition_he: string;
  research_backbone: string[];
  sources: TracedSource[];
}

export interface TracedSource {
  id: string;
  course: string;
  core_claim: string;
  researchers: string[];
  filename: string;
}
