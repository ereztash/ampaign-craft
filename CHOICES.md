# Design Choices Log — Phase 1 + Phase 2

This file records design decisions made during the Blackboard Contract
implementation where the spec left room for interpretation. Each
choice is the *minimal* option that satisfies the requirement.

## 1. Engine context propagation

The spec says "add ONE call to `writeContext` at the end of the main
exported function" but `writeContext` requires `userId` and `planId`,
neither of which the existing engine signatures know about.

**Choice:** add an optional `blackboardCtx?: BlackboardWriteContext`
parameter at the end of each touched engine's main function. When
omitted, the engine returns its result and skips the write — preserving
all existing call sites and tests untouched. This is strictly additive
and does not refactor any internal logic.

## 2. Untyped Supabase client cast in `contract.ts`

`shared_context` and `shared_intents` are not yet in the generated
`src/integrations/supabase/types.ts` (regeneration is a separate
manual step). The existing `trainingDataEngine.ts` uses
`(supabase as any).from(...)` to bypass this; the spec says "no any".

**Choice:** cast through `unknown` to a locally-defined `BlackboardBuilder`
shape that mirrors only the chained methods we actually call. Keeps
type-checking inside the contract helper without leaking `any` and
does not require regenerating the Supabase types.

## 3. Trigger error policy

The trigger that mirrors `shared_context` inserts into `training_pairs`
swallows any exception (`EXCEPTION WHEN OTHERS THEN RETURN NEW`).
The blackboard write must never be blocked by training-data capture
failing — that would couple the primary feature to an analytics path.

## 4. Engine count

The brief says "43 engines in `src/engine/`". `ls src/engine/*.ts`
confirms 43 files at the time of this run, including three "knowledge"
files (`differentiationKnowledge`, `pricingKnowledge`,
`retentionKnowledge`) that are static lookup tables rather than true
engines. These are still registered (with stub manifests) so the
registry test stays in lockstep with the directory listing.

## 5. Audit script: static parsing instead of import

`scripts/audit-engines.ts` parses each engine file with a regex for
`ENGINE_MANIFEST` rather than importing the registry module. This
avoids dragging the Vite-coupled Supabase client into the Node script
runtime.

## 6. Resolution of non-engine "backing engines"

Several parameters in the brief reference identifiers that are not
files in `src/engine/` — Edge Functions (`agent-executor`), library
files (`hebrewCopyOptimizer`), or meta entries (`Supabase Auth + RLS`).
`scripts/score-market-gap.ts` resolves these in priority order:

1. `src/engine/<name>.ts` → use static manifest + import-grep
2. `supabase/functions/<name>/` → string-literal grep across `src/`
3. Any `src/**/<name>.ts` by basename
4. The literal "Supabase Auth + RLS" → treated as always shipped (RLS is global)
5. Otherwise → `MISSING`

## 7. Verdict tie-breaker

The brief defines three verdict bands but a high differentiation +
low shipped combo could match neither cleanly. The implementation
checks `GAP_UNPROVEN` first (because it uses `OR`), then
`GAP_CONFIRMED`, then `GAP_NARROW`. This means shipped_score < 0.60
always wins UNPROVEN even if all 5 pillars are shipped — the brief's
`OR` wording requires this.

## 8. Quick wins ranking

`Top 10 Quick Wins` sorts PARTIAL parameters above PAPER (PARTIAL
needs only 1 more consumer to flip to SHIPPED), and within each tier
sorts by total consumer count descending so the closest wins surface
first.

## Metric Corrections, 2026-04-10

The original `score-market-gap.ts` counted a file as a consumer as
soon as it had an `import ... from "...engine"` line. That matched
**re-exports**, **type-only imports**, and **unused imports**, so the
reported 26/50 (52%) shipped score was structurally inflated — an
engine could claim SHIPPED without any call site in the running
product.

The metric was hardened on 2026-04-10:

1. **Honest `consumerCount`** (`scripts/score-market-gap.ts`). A file
   counts as a consumer only when (a) it imports a binding from the
   engine and (b) at least one of those bindings appears as a
   CallExpression or JSX element in the file body, *outside* of any
   `import` or `export ... from "..."` statement. Pure re-export
   files drop out of the count entirely.

2. **Location-aware thresholds**:
   - `LIB_MIN_CONSUMERS = 1` — `src/lib/`, `src/services/`, edge
     functions. Wrappers are legitimately SHIPPED the moment a single
     view file calls them.
   - `ENGINE_MIN_CONSUMERS = 3` — `src/engine/`. Full engines must
     have real reach across the product.
   An engine whose manifest claims `isLive: true` is promoted to
   SHIPPED as soon as it has ≥1 real call site, but only under the
   gate of `verify-runtime-calls.ts`.

3. **Runtime reachability gate** (`scripts/verify-runtime-calls.ts`).
   For every engine with `isLive: true` in its `ENGINE_MANIFEST`,
   walks `src/pages/` and `src/components/` and classifies it as
   `REACHABLE`, `IMPORTED_BUT_UNCALLED`, or `NO_IMPORT`. Exits 1 on
   any non-`REACHABLE` engine. This is the gaming vector closer:
   you cannot ship a live engine without a real call site in a
   view file.

4. **Pre-wiring honest baseline** under the hardened metric:
   23/50 = **46%** SHIPPED. This is the true starting point for the
   subsequent Phase 1+2 wiring, not the 52% that the loose metric
   had reported.

5. **Post-wiring result** (after Phase 1+2+4): 42/50 = **84%**
   SHIPPED, real differentiation 5/5, verdict `GAP_CONFIRMED`,
   reachability 24/24. The delta between the 52% inflated baseline
   and the 46% honest baseline confirms the claim that the original
   metric was gamable by import-only references.

## 9. Tier-4 pillar wiring

Multi-agent orchestration (`agent-executor` + `queue-processor`)
already had 3+ edge-function invocations in the codebase and was
technically SHIPPED, but the *pillar* was carried by an edge function
alone — no client-side orchestration layer existed. Phase 4 added
`src/lib/agentOrchestrator.ts` which:

1. Inserts a pending row into `agent_tasks`.
2. Calls `supabase.functions.invoke('agent-executor', ...)`.
3. Updates the task row on success.
4. Best-effort polls `event_queue` for an `agent.completed` event up
   to 30 s.
5. Falls back to the direct invoke response on poll timeout.

The sole required call site is in `src/pages/Wizard.tsx`, where the
`regenerateHeroCopy` callback calls `runAgent(...)` first and falls
back to `aiCopyService.generateCopy(...)` on any error. This gives
the Multi-agent pillar a genuine client-side reach into a view file,
regardless of how many edge-function string references exist.
