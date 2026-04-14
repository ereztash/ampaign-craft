# Verification Gate & Key Metrics

Honest market-gap metric methodology, verification scripts, and project key numbers.

## Honest Market-Gap Metric

The `score-market-gap.ts` script uses a hardened consumer-count metric (updated 2026-04-10):

1. **Honest `consumerCount`** — A file counts as a consumer only when it both imports a binding from the engine AND calls that binding (CallExpression or JSX). Pure re-export files drop out entirely.
2. **Location-aware thresholds** — `LIB_MIN_CONSUMERS = 1` for `src/lib/`, `src/services/`, and edge functions. `ENGINE_MIN_CONSUMERS = 3` for `src/engine/`.
3. **Runtime reachability gate** (`verify-runtime-calls.ts`) — For every engine with `ENGINE_MANIFEST.isLive: true`, walks `src/pages/` and `src/components/` and classifies it as `REACHABLE`, `IMPORTED_BUT_UNCALLED`, or `NO_IMPORT`. Exits 1 on any non-`REACHABLE` engine.
4. **Pre-wiring honest baseline**: 23/50 = **46%** SHIPPED under the original 50-parameter map.
5. **Post-wiring result**: **52/52 = 100% SHIPPED**, real differentiation **5/5 pillars**, verdict **GAP_CONFIRMED**, market delta **+30.5 pts** vs 70.2% market average.

## Verification Gate

Run before every commit that touches an engine or a target page:

```bash
npm run build
npm test
npx tsx scripts/audit-engines.ts
npx tsx scripts/verify-runtime-calls.ts    # exits 1 on IMPORTED_BUT_UNCALLED / NO_IMPORT
npx tsx scripts/score-market-gap.ts
npx tsx scripts/differentiation-check.ts
PRE_WIRING_BASELINE_PCT=46.0 \
  npx tsx scripts/generate-market-gap-report.ts
# Reports: reports/engine-audit.json, reports/reachability-audit.json,
#          reports/MARKET_GAP_REPORT.md, reports/tier4-e2e.log
```

## 5 Differentiation Pillars (all live)

| Pillar | Parameter | Backing Engine | Real Call Site |
|---|---|---|---|
| DISC behavioral profiling | #4 | `discProfileEngine` | Wizard flow + ResultsDashboard |
| Hormozi Value Equation | #5 | `hormoziValueEngine` | ResultsDashboard + funnelEngine |
| Neuro-storytelling closing | #6 | `neuroClosingEngine` | Sales pipeline + ResultsDashboard |
| Hebrew NLP optimization | #3 | `hebrewCopyOptimizer` + `stylomeEngine` | ContentTab + aiCopyService |
| Multi-agent orchestration | #1 | `agent-executor` + `agentOrchestrator` | Wizard.regenerateHeroCopy |

## Key Numbers

| Metric | Value |
|--------|-------|
| Lines of code | ~69,500 |
| TypeScript files | ~392 |
| Engines | 49 (`src/engine/*.ts`, excl. knowledge / subdirs) |
| GRAOS optimization engines | 6 (M1–M6) |
| Live engines (`ENGINE_MANIFEST.isLive`) | 30 |
| Runtime reachability | 30 / 30 REACHABLE |
| Tests | 651 passing |
| Components | 108 |
| Pages | 17 |
| Routes | 12 |
| Hooks | 16 |
| Archetypes | 5 |
| Behavioral heuristics | 8 (H1–H8, L1–L5 resolution each) |
| Pipeline steps per archetype | 7 (friction-mapped, bilingual) |
| Translation keys | 290+ (he + en) |
| Edge Functions | 12 |
| Knowledge domains | 46 |
| Blackboard agents | 13 (8 core + 4 QA + Φ_META_AGENT) |
| QA checks | 15+ (static + content + security) |
| `any` types | 0 |
| Honest shipped score | 52 / 52 = **100.0%** |
| Market delta | **+30.5 pts** vs 70.2% market average |
| Verdict | **GAP_CONFIRMED** |
