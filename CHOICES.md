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
