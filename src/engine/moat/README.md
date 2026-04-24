# src/engine/moat — Principle Grounding Layer

Strictly additive, opt-in layer that enriches DifferentiationResult output with
citations into `knowledge/principles.json` + `knowledge/sources.json`.

## Contract

- **Feature flag:** `VITE_PRINCIPLE_GROUNDING_ENABLED`. Default off.
- **Zero mutations** to `src/engine/optimization/`, `differentiationEngine.ts`,
  `differentiationKnowledge.ts`, `blackboardClient.ts`, migrations.
- **Zero LLM calls.** Static substring/exact matching only in v1.
- **Single UI surface:** `src/components/moat/PrincipleTraceModal.tsx` plus a
  flag-gated trigger on `DifferentiationResultView`. Flag off => zero DOM delta.
- **Read-only library.** `principles.json` is upstream-generated; this layer
  never mutates it and never embeds principle text as code constants.

## Module map

```
principleLibrary.ts         — startup loader + validator (throws on bad library)
hiddenValuePrincipleMap.ts  — static map: HiddenValueType -> PrincipleId[]
archetypePrincipleMap.ts    — static map: CompetitorArchetypeId -> PrincipleId[]
principleTraceEnricher.ts   — (DifferentiationResult) -> PrincipleTrace[]
__tests__/                  — library, map, enricher tests
```

## How it slots above differentiationEngine

```
DifferentiationWizard -> generateDifferentiation() -> DifferentiationResult
                                                         |
                                                         v
                                              DifferentiationResultView
                                                         |
                                     (flag on only) -----+----- enrichDifferentiationWithCitations(result)
                                                         |
                                                         v
                                                 PrincipleTraceModal
```

The enricher is pure: `DifferentiationResult -> PrincipleTrace[]`. It never
writes back into the result, never calls the network, never blocks render.

## Versioning

Library is pinned by `version` inside `principles.json`. Loader validates
shape at startup; a failed validation throws in dev and degrades to empty
trace in prod (modal shows "no research mapping yet"). See T4 of the
integration spec.
