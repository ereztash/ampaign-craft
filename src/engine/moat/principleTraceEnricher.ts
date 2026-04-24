// ═══════════════════════════════════════════════
// src/engine/moat/principleTraceEnricher.ts
//
// Pure function: (DifferentiationResult) -> PrincipleTrace[].
//
// Never mutates the input, never calls the network, never loads
// anything at call time (library is cached in principleLibrary.ts
// singletons). Deterministic — given the same result, always returns
// the same trace list in the same order.
//
// Contract with UI (T4):
//   - A surface with an empty principles array is a valid result. The
//     modal renders it as "no research mapping yet". The enricher
//     never fabricates a fallback principle.
//   - A principle with zero resolved sources is dropped from the
//     trace. This is a stricter invariant than "every principle
//     has at least one citation" — matches T3 ("at least 2 source
//     docs per principle" is asserted at the test boundary, not
//     here; here we just guarantee no zero-citation principles
//     leak through).
// ═══════════════════════════════════════════════

import type { DifferentiationResult } from "@/types/differentiation";
import { findPrinciple, findSource } from "./principleLibrary";
import { principlesForHiddenValue } from "./hiddenValuePrincipleMap";
import { principlesForArchetype } from "./archetypePrincipleMap";
import type {
  PrincipleId,
  PrincipleTrace,
  TracedPrinciple,
  TracedSource,
} from "./types";

/**
 * Resolve a list of PrincipleIds into fully-hydrated TracedPrinciples.
 * Unknown ids are dropped silently (library validator runs at startup;
 * a miss here means an upstream version drift — tests catch it via
 * the map-integrity test, not production).
 *
 * A principle whose source refs all fail to resolve is ALSO dropped
 * — see T3. A principle with at least one resolved source is kept
 * even if some refs were stale; the surviving sources are listed.
 */
function resolvePrinciples(ids: PrincipleId[]): TracedPrinciple[] {
  const out: TracedPrinciple[] = [];
  for (const id of ids) {
    const p = findPrinciple(id);
    if (!p) continue;

    const sources: TracedSource[] = [];
    for (const ref of p.sources) {
      const s = findSource(ref);
      if (!s) continue;
      sources.push({
        id: s.id,
        course: s.course,
        core_claim: s.core_claim,
        researchers: s.researchers,
        filename: s.filename,
      });
    }
    if (sources.length === 0) continue;

    out.push({
      principle_id: p.id,
      name_he: p.name_he,
      name_en: p.name_en,
      definition_he: p.definition_he,
      research_backbone: p.research_backbone,
      sources,
    });
  }
  return out;
}

/**
 * Build a principle-grounded trace for a DifferentiationResult.
 *
 * Returns one entry per hidden value in hiddenValueProfile and one
 * per competitor archetype in competitorMap, in the order they
 * appear in the input. Order is preserved for deterministic render.
 *
 * Call site MUST guard on VITE_PRINCIPLE_GROUNDING_ENABLED — this
 * function itself does not read the flag. Keeping the flag at the
 * call site means the enricher stays pure and testable in isolation.
 */
export function enrichDifferentiationWithCitations(
  result: DifferentiationResult,
): PrincipleTrace[] {
  const out: PrincipleTrace[] = [];

  for (const hv of result.hiddenValueProfile) {
    const ids = principlesForHiddenValue(hv.valueId);
    out.push({
      surface: { kind: "hidden_value", id: hv.valueId, score: hv.score },
      principles: resolvePrinciples(ids),
    });
  }

  for (const comp of result.competitorMap) {
    const ids = principlesForArchetype(comp.archetype);
    out.push({
      surface: { kind: "archetype", id: comp.archetype },
      principles: resolvePrinciples(ids),
    });
  }

  return out;
}

/**
 * Flatten a trace list into the set of distinct PrincipleIds surfaced
 * in it. Useful for T4-style assertions ("at least N principles
 * surfaced") and for the modal's summary row.
 */
export function distinctPrinciples(trace: PrincipleTrace[]): PrincipleId[] {
  const seen = new Set<PrincipleId>();
  const out: PrincipleId[] = [];
  for (const t of trace) {
    for (const p of t.principles) {
      if (seen.has(p.principle_id)) continue;
      seen.add(p.principle_id);
      out.push(p.principle_id);
    }
  }
  return out;
}
