# Architecture

Engine layout, Multi-Agent System, and GRAOS optimization overlay.

## Architecture

```
src/
├── engine/          # 45 pure-logic engines (29 carry an ENGINE_MANIFEST with isLive:true)
│   ├── funnelEngine.ts              # Core funnel generation + personalizeResult
│   ├── salesPipelineEngine.ts       # Sales pipeline + neuro-closing + DISC + personalized scripts
│   ├── pricingIntelligenceEngine.ts # Pricing model + tiers + offer stack + guarantee + framing
│   ├── retentionGrowthEngine.ts     # Onboarding + churn + referral + loyalty + growth loops
│   ├── differentiationEngine.ts     # Claim verification + hidden values + synthesis
│   ├── differentiationKnowledge.ts  # B2B + B2C knowledge (archetypes, values, metrics)
│   ├── differentiationPhases.ts     # 5-phase config with mode-aware questions
│   ├── userKnowledgeGraph.ts        # Central intelligence: cross-references all user data + DISC
│   ├── pricingWizardEngine.ts       # Behavioural-science pricing derivation: Van Westendorp PSM, Hormozi V=D×P/T×E,
│   │                                  Weber-Fechner differentiator premium, Ariely 3-tier decoy, Kahneman COI framing
│   ├── pricingKnowledge.ts          # Israeli benchmarks + behavioral pricing constants
│   ├── retentionKnowledge.ts        # Lifecycle templates + churn signals + referral
│   ├── healthScoreEngine.ts         # Marketing readiness score (0-100) + retention readiness
│   ├── pulseEngine.ts               # Weekly engagement pulse with loss framing
│   ├── costOfInactionEngine.ts      # Behavioral economics loss quantifier + compounding loss
│   ├── copyQAEngine.ts              # Copy quality audit (6 neuro-psychological checks + P&B)
│   ├── clgEngine.ts                 # Community-Led Growth strategy generator
│   ├── brandVectorEngine.ts         # Brand-neuro matching (cortisol/oxytocin/dopamine)
│   ├── retentionFlywheelEngine.ts   # 4-type retention loop designer
│   ├── stylomeEngine.ts             # Writing style fingerprint extractor + burstiness metrics
│   ├── guidanceEngine.ts            # Meta Ads KPI remediation
│   ├── gapEngine.ts                 # Performance gap analysis
│   ├── nextStepEngine.ts            # Personalized next-step recommendations
│   ├── dataImportEngine.ts          # CSV/Excel data ingestion
│   ├── hormoziValueEngine.ts        # Hormozi Value Equation (4-dimension scoring + offer grading)
│   ├── discProfileEngine.ts         # DISC personality profiling for personalized messaging
│   ├── neuroClosingEngine.ts        # DISC-optimized closing strategies + objection handling
│   ├── churnPredictionEngine.ts     # 3-stage churn model (Active→Disengaging→Silent) + NRR
│   ├── perplexityBurstiness.ts      # AI detection via Perplexity & Burstiness scoring
│   ├── campaignAnalyticsEngine.ts   # Industry benchmark generation from saved plans
│   ├── predictiveEngine.ts          # Success probability forecasting + budget efficiency
│   ├── integrationEngine.ts         # Platform connection management (Slack/WhatsApp/GA/FB)
│   ├── seoContentEngine.ts          # Keyword generation + content briefs + social calendar
│   ├── behavioralCohortEngine.ts    # 12 pre-defined cohorts × DISC × maturity × budget
│   ├── crossDomainBenchmarkEngine.ts # Curated knowledge map transferring strategies across industries
│   ├── emotionalPerformanceEngine.ts # EPS: 4-signal composite (0-100 emotional health score)
│   ├── predictiveContentScoreEngine.ts # Anyword-style pre-publication score (5 local signals)
│   ├── promptOptimizerEngine.ts     # Analyses training-pair feedback → prompt-level fixes
│   ├── visualExportEngine.ts        # Platform-specific social post structuring (FB/IG/LI/X)
│   ├── behavioralActionEngine.ts    # Behavioral nudge orchestration (COR/Fogg/DISC)
│   ├── behavioralHeuristicEngine.ts # H1–H8 heuristics with L1–L5 resolution
│   ├── archetypeClassifier.ts       # 14-signal → 5-archetype classifier with ConfidenceTier scoring
│   ├── outcomeLoopEngine.ts         # MOAT flywheel core: recommendation/variant/outcome capture
│   ├── researchOrchestrator.ts      # Shim exposing the research/ orchestrator as a direct engine
│   ├── research/                    # Cross-domain research engine (real orchestrator lives here)
│   ├── optimization/                # 6-engine GRAOS optimization overlay (strictly additive)
│   │   ├── regimeDetector.ts        # M1: 3-state classifier (stable/transitional/crisis)
│   │   ├── biomimeticAnomaly.ts     # M2: 3-layer anomaly score (threshold + predictive + novelty)
│   │   ├── extremeForecaster.ts     # M3: Bayesian collapse forecaster (clear/watch/act bands)
│   │   ├── reflectiveAction.ts      # M4: synthesizes ONE ActionCard from funnel + diagnostics
│   │   ├── daplProfile.ts           # M5: 7-dim adaptive user preference vector + 12 principles
│   │   └── ontologicalVerifier.ts   # M6: single write-gate for every shared_context write
│   └── blackboard/                  # Agent orchestration (MAS-CC Blackboard Architecture)
│       ├── blackboardStore.ts       # Shared knowledge space with verifiedSet() gated writes
│       ├── ontologicalVerifier.ts   # Pure write contract: 4 rejection rules
│       ├── agentRunner.ts           # Sync: topological sort + dependency-aware execution
│       ├── asyncAgentRunner.ts      # Async: parallel execution + timeout + retry + cost caps
│       ├── circuitBreaker.ts        # 3-state breaker (closed/open/half-open) for loop control
│       ├── llmAgent.ts              # LLM agent factory: getModelForTier() (Haiku/Sonnet/Opus)
│       └── agents/                  # 13 agents (8 core + 4 QA + Φ_META_AGENT)
│           ├── knowledgeGraphAgent, funnelAgent, hormoziAgent, discAgent
│           ├── closingAgent, coiAgent, retentionAgent, healthAgent
│           ├── qaStaticAgent.ts     # Heuristic QA: budget, KPIs, completeness, consistency
│           ├── qaContentAgent.ts    # LLM QA: cultural fit, Hebrew quality, CTA clarity
│           ├── qaSecurityAgent.ts   # Security: PII detection, injection vectors, unsafe templates
│           ├── qaOrchestratorAgent.ts # Aggregates QA scores + grade (A-F) + recommendations
│           ├── metaAgent.ts         # Φ_META_AGENT: J=∂I/∂Ω gradient, semantic half-life
│           └── debugSwarm.ts        # Iterative fix loop: Analyzer → Proposer → Critique
├── services/        # External integrations
│   ├── aiCopyService.ts             # Context-aware LLM copy generation
│   ├── llmRouter.ts                 # Model selection (Haiku/Sonnet/Opus) + fallbacks + cost caps
│   ├── blackboardPersistence.ts     # Save/load board state + task queue + audit log
│   ├── semanticSearch.ts            # pgvector-powered content similarity search
│   └── eventQueue.ts                # PostgreSQL event bus (publish/query/convenience helpers)
├── lib/             # Data libraries & utilities
│   ├── agentOrchestrator.ts         # Tier-4 pillar: wraps agent-executor with Supabase Realtime
│   ├── israeliMarketCalendar.ts     # 12 Israeli events with budget multipliers
│   ├── hebrewCopyOptimizer.ts       # 12 Hebrew neurolinguistics rules + scoring + stylometry
│   └── ...                          # archetypeBlindSpots, archetypeAnalytics, pricingTiers, utils
├── components/      # 108 React components
├── pages/           # 17 pages
├── hooks/           # 16 custom hooks
└── contexts/        # Auth + UserProfile + ArchetypeContext
supabase/functions/  # 12 Edge Functions
├── ai-coach/               # Claude marketing coach
├── differentiation-agent/  # Claude Sonnet for 5-phase differentiation
├── generate-copy/          # Claude API proxy for AI copy generation
├── agent-executor/         # Generic LLM agent executor (any Claude model)
├── research-agent/         # Deep research via Claude Opus
├── embed-content/          # Embedding generation + pgvector storage
├── queue-processor/        # Event queue processor with handler registry
└── ...                     # meta-token-exchange, create-checkout, stripe-webhook, webhooks
```

---

## MAS-CC: Multi-Agent System Architecture

The system uses a Blackboard Architecture pattern where 13 specialized agents read from and write to a shared knowledge space. Async execution runs independent agents in parallel.

```
FormData → [Blackboard Store] → Agents (parallel layers) → Complete Analysis

Core Agents (sync, run on every plan):
1. knowledgeGraph  (no deps)     → builds UserKnowledgeGraph
2. funnel          (→ kGraph)    → generates personalized funnel
3. hormozi         (→ kGraph)    → Hormozi Value Equation scoring
4. disc            (→ kGraph)    → DISC personality profiling
5. closing         (→ disc)      → neuro-closing strategies
6. coi             (→ funnel)    → cost of inaction + compounding loss
7. retention       (no deps)     → retention flywheel + churn risk
8. health          (→ funnel)    → health score + retention readiness

QA Agents (triggered separately):
9.  qaStatic       (→ funnel)    → heuristic validation (budget, KPIs, completeness)
10. qaContent      (→ funnel,kG) → LLM content quality (cultural, Hebrew, CTA)
11. qaSecurity     (→ funnel)    → PII detection, injection vectors, unsafe templates
12. qaOrchestrator (→ 9,10,11)   → aggregates scores → grade A-F + recommendations

Φ_META_AGENT (always last):
13. metaAgent      (→ all)       → J=∂I/∂Ω gradient, semantic half-life,
                                    per-agent rejection rates, threshold recommendations
```

### Async Pipeline Features

- **Parallel Execution**: Independent agents run simultaneously via `Promise.allSettled`
- **Circuit Breaker**: 3-state (closed/open/half-open) with max iterations, failure detection, cooldown
- **Cost Caps**: Per-session NIS budget limits with automatic cost tracking
- **Retry + Timeout**: Exponential backoff, configurable per agent
- **Persistent State**: Blackboard snapshots + execution audit log in PostgreSQL

### Event Queue

PostgreSQL-based event bus:
- Atomic claim with `FOR UPDATE SKIP LOCKED`
- Priority-based processing (1=highest, 10=lowest)
- Automatic retry with exponential backoff
- Dead letter queue for exhausted retries
- Supported events: `plan.generated`, `plan.qa_requested`, `research.requested`, `embedding.requested`, `benchmark.update`, `notification.send`

### Semantic Search (pgvector)

- Content + code embeddings (OpenAI text-embedding-3-small, 1536 dims)
- Cosine similarity search via IVFFlat index
- `match_content()` and `match_code()` PostgreSQL functions

**LLM Router** dynamically selects Claude models:
- **Haiku** — headlines, WhatsApp messages, social posts
- **Sonnet** — ad copy, email sequences, landing pages, QA analysis
- **Opus** — deep research, strategy documents
- **Fallback chains**: Opus → Sonnet → Haiku with automatic downgrade on failure

---

## GRAOS Optimization Layer (strictly additive)

Six engines under `src/engine/optimization/` that observe the existing funnel without mutating it. Every module is pure, synchronous, and zero I/O. Every blackboard write passes through the ontological verifier.

| Module | File | Purpose |
|---|---|---|
| M1 | `regimeDetector.ts` | 3-state classifier (`stable` / `transitional` / `crisis`) over rolling Meta Insights metrics |
| M2 | `biomimeticAnomaly.ts` | 3-layer anomaly scoring: L1 adaptive threshold, L2 predictive residual, L3 NBSR novelty |
| M3 | `extremeForecaster.ts` | Bayesian collapse forecaster. Emits `clear` / `watch` / `act` bands |
| M4 | `reflectiveAction.ts` | Synthesizes funnel + diagnostics into exactly ONE `ActionCard`. Feature-flagged by `VITE_REFLECTIVE_ENABLED=true` or `?reflective=1` |
| M5 | `daplProfile.ts` | 7-dimension Dynamic Adaptive Preference Learning vector over form-field events |
| M6 | `ontologicalVerifier.ts` | Single write-gate for every `shared_context` write. 8 fail-fast checks |

**Strictness contract:** Zero mutations to existing engines. One existing file touched (`ResultsDashboard.tsx`, 7 lines). 50 new tests (M1–M6), all green.
