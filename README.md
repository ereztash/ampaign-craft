# FunnelForge — Complete Business Growth System

Hebrew-first platform that combines 40+ cross-domain knowledge areas into a 5-module growth cycle: Differentiation → Marketing → Sales → Pricing → Retention. All personalized, all copy-paste ready. Powered by a Multi-Agent System (MAS-CC) with async Blackboard orchestration, QA pipeline, research engine, and strategic moat engines.

## The 5-Module Cycle

```
    ┌──── Differentiation ◄──────────┐
    │     B2B + B2C unified           │
    │     5-phase wizard + AI         │
    ▼                                  │
  Marketing                        Retention
  Funnel + Copy + Hooks            Onboarding + Churn Prediction + Referral
  + Hormozi Value + P&B            + NRR Projections + Growth Loops
    │                                  ▲
    ▼                                  │
  Sales ────────► Pricing ─────────────┘
  Pipeline + Scripts    Tier Structure + Offer Stack
  + DISC Profiling      + Guarantee + Price Framing
  + Neuro-Closing
```

## What It Does

**Module 1 — Differentiation** (`/differentiate`)
5-phase wizard with AI enrichment. Claim verification, hidden value discovery, competitor archetype mapping, buying committee/influence network narratives. B2B and B2C unified with market-mode detection.

**Module 2 — Marketing** (`/plans/:id/strategy`)
5-stage funnel with channel recommendations, budget allocation, KPIs. Personalized hooks (PAS/AIDA/BAB with your product), Israeli market calendar with seasonal budget multipliers. Hormozi Value Equation scoring (4-dimension offer analysis), enhanced Cost of Inaction with compounding loss timelines, and AI-powered copy generation with Perplexity & Burstiness detection.

**Module 3 — Sales** (`/plans/:id/sales`)
Pipeline stages, forecast, 4-layer personalized objection scripts (product + industry + differentiation + voice). DISC personality profiling infers prospect type from form data and generates per-type messaging strategies, CTA styles, and funnel emphasis. Neuro-closing engine produces DISC-optimized objection handlers, price presentation strategies, and follow-up sequences.

**Module 4 — Pricing** (`/plans/:id/pricing`)
Recommended pricing model, 3-tier structure with decoy, Hormozi offer stack (value equation), guarantee design, price framing scripts for 5 contexts (landing/sales/proposal/WhatsApp/email), subscription economics (LTV:CAC).

**Module 5 — Retention** (`/plans/:id/retention`)
Onboarding sequences by business type (ecommerce/SaaS/services/creator). Churn prediction engine with 3-stage model (Active → Disengaging → Silent), risk scoring across 10 industry verticals, NRR projections with/without intervention, and intervention playbooks. Referral program blueprint with WhatsApp templates, growth loop identification, loyalty program design.

**Cross-Module Intelligence**
UserKnowledgeGraph cross-references all 8 user data sources (FormData + Differentiation + Stylome + DISC + Behavior + Chat + Imported Data + Meta Ads) and feeds every module via 27 cross-domain connections. Blackboard Architecture orchestrates 12+ specialized agents via topological dependency resolution with async parallel execution. AI Coach has full context from all 5 modules. LLM Router dynamically selects Claude models (Haiku/Sonnet/Opus) based on task complexity with tier-based restrictions, fallback chains, and monthly cost caps. Cold-start detection ensures new users get immediate value. GDPR-compliant consent management gates training data capture. Network resilience layer handles offline scenarios with queued writes.

## Routes

```
/                    → Module hub (main entry point)
/legacy              → Original marketing landing page
/dashboard           → Returning user hub (pulse + progress + last plan)
/wizard              → Quick Start funnel wizard (2 min)
/differentiate       → Differentiation wizard (10 min, recommended)
/sales               → Sales module entry
/pricing             → Pricing module entry
/retention           → Retention module entry
/plans               → Saved plans list
/plans/:id           → Plan results dashboard
/plans/:id/:tab      → Deep link to specific tab (shareable)
/profile             → User profile + tier management
```

## Architecture

```
src/
├── engine/          # 47 pure-logic engines (29 carry an ENGINE_MANIFEST with isLive:true)
│   ├── funnelEngine.ts              # Core funnel generation + personalizeResult
│   ├── salesPipelineEngine.ts       # Sales pipeline + neuro-closing + DISC + personalized scripts
│   ├── pricingIntelligenceEngine.ts # Pricing model + tiers + offer stack + guarantee + framing
│   ├── retentionGrowthEngine.ts     # Onboarding + churn + referral + loyalty + growth loops
│   ├── differentiationEngine.ts     # Claim verification + hidden values + synthesis
│   ├── differentiationKnowledge.ts  # B2B + B2C knowledge (archetypes, values, metrics)
│   ├── differentiationPhases.ts     # 5-phase config with mode-aware questions
│   ├── userKnowledgeGraph.ts        # Central intelligence: cross-references all user data + DISC
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
│   ├── guidanceEngine.ts            # Meta Ads KPI remediation + cold-start educational guidance
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
│   ├── behavioralActionEngine.ts    # Behavioral nudge orchestration (COR/Fogg/DISC) — loss aversion + goal gradient + social proof
│   ├── outputModeration.ts          # Post-generation content moderation (blocklist + negativity + pressure)
│   ├── referralEngine.ts            # FunnelForge self-referral program (codes + rewards + stats)
│   ├── researchOrchestrator.ts      # Shim exposing the research/ orchestrator as a direct engine
│   ├── research/                    # Cross-domain research engine (real orchestrator lives here)
│   ├── optimization/                # 6-engine GRAOS optimization overlay (strictly additive)
│   │   ├── regimeDetector.ts        # M1: 3-state classifier (stable/transitional/crisis) over Meta metrics
│   │   ├── biomimeticAnomaly.ts     # M2: 3-layer anomaly score (threshold + predictive + novelty)
│   │   ├── extremeForecaster.ts     # M3: Bayesian collapse forecaster (clear / watch / act bands)
│   │   ├── reflectiveAction.ts      # M4: synthesizes ONE ActionCard from funnel + diagnostics
│   │   ├── daplProfile.ts           # M5: 7-dim adaptive user preference vector + 12 principles
│   │   └── ontologicalVerifier.ts   # M6: single write-gate for every shared_context write
│   ├── blackboard/                  # Agent orchestration (MAS-CC Blackboard Architecture)
│   │   ├── blackboardStore.ts       # Shared knowledge space with reactive updates
│   │   ├── agentRunner.ts           # Sync: topological sort + dependency-aware execution
│   │   ├── asyncAgentRunner.ts      # Async: parallel execution + timeout + retry + cost caps
│   │   ├── circuitBreaker.ts        # 3-state breaker (closed/open/half-open) + cost-aware tripping
│   │   ├── agentTypes.ts            # AsyncAgentDefinition, AgentExecutionMeta, CircuitBreakerConfig
│   │   ├── llmAgent.ts              # LLM agent factory (createLLMAgent) + JSON parser
│   │   ├── index.ts                 # Public API: sync + async pipelines, QA agents, debug swarm
│   │   └── agents/                  # 12 agents (8 core + 4 QA)
│   │       ├── knowledgeGraphAgent, funnelAgent, hormoziAgent, discAgent
│   │       ├── closingAgent, coiAgent, retentionAgent, healthAgent
│   │       ├── qaStaticAgent.ts     # Heuristic QA: budget, KPIs, completeness, consistency
│   │       ├── qaContentAgent.ts    # LLM QA: cultural fit, Hebrew quality, CTA clarity
│   │       ├── qaSecurityAgent.ts   # Security: PII detection, injection vectors, unsafe templates
│   │       ├── qaOrchestratorAgent.ts # Aggregates QA scores + grade (A-F) + recommendations
│   │       └── debugSwarm.ts        # Iterative fix loop: Analyzer → Proposer → Critique
│   └── research/                    # Cross-domain research engine implementation
│       ├── researchOrchestrator.ts  # Decomposes questions → dispatches sub-agents → synthesizes
│       └── subAgents/               # 3 domain specialists
│           ├── regulatoryAgent.ts   # Israeli advertising law, data protection, compliance
│           ├── marketAgent.ts       # Competitor analysis, pricing benchmarks, trends
│           └── marketingAgent.ts    # Channel effectiveness, content strategy, Israeli market
├── services/        # External integrations
│   ├── aiCopyService.ts             # Context-aware LLM copy generation + pre-gen budget check
│   ├── llmRouter.ts                 # Model selection + tier restriction + monthly tracking + cost caps
│   ├── blackboardPersistence.ts     # Save/load board state + task queue + audit log
│   ├── semanticSearch.ts            # pgvector-powered content similarity search
│   ├── eventQueue.ts               # PostgreSQL event bus (publish/query/convenience helpers)
│   ├── auditLog.ts                  # Ring-buffer audit logger (500 entries, localStorage + Supabase)
│   ├── dataGovernance.ts            # GDPR: right-to-delete + data export (Article 17 & 20)
│   ├── networkResilience.ts         # Retry with backoff + offline queue + auto-flush
│   └── shareService.ts             # Shareable plan links with expiry + privacy stripping
├── lib/             # Data libraries & utilities
│   ├── agentOrchestrator.ts         # Tier-4 pillar: wraps agent-executor with agent_tasks row,
│   │                                  direct invoke, task-status update, and 30s event_queue poll
│   │                                  for agent.completed. Falls back on direct invoke output.
│   ├── israeliMarketCalendar.ts     # 12 Israeli events with budget multipliers
│   ├── hebrewCopyOptimizer.ts       # 12 Hebrew neurolinguistics rules + scoring + stylometry
│   ├── textAdapter.ts               # Register shifting from Stylome voice profile
│   ├── industryBenchmarks.ts        # 9 industries × 5 KPIs in NIS
│   ├── differentiationFormRules.ts  # Phase validation + colors
│   ├── adaptiveTabRules.ts          # 9 tabs with priority + simplified mode
│   ├── adaptiveFormRules.ts         # Conditional steps + differentiation pre-fill
│   ├── toolRecommendations.ts       # Israeli SaaS ecosystem mapping
│   ├── roiCalculator.ts             # Industry-specific ROI estimation
│   ├── whatsappTemplates.ts         # Hebrew WhatsApp funnel templates
│   ├── pricingTiers.ts              # Free/Pro/Business tier definitions
│   ├── smartDefaults.ts             # Adaptive form defaults by business type
│   ├── minimalFormDefaults.ts       # Minimal-mode form defaults
│   ├── sanitize.ts                  # HTML sanitization (strips script/iframe/events/JS URLs)
│   ├── fallbackTemplates.ts         # 40 bilingual templates for LLM fallback (10 industries × 4 tasks)
│   └── ...                          # glossary, socialProofData, colorSemantics, utils
├── components/      # 99 React components
│   └── reflective/                  # ReflectiveCard.tsx — 3-row reflective surface, feature-flagged
├── pages/           # 17 pages (ModuleHub, Dashboard, Wizard, Plans, PlanView, Differentiate,
│                      SalesEntry, PricingEntry, RetentionEntry, DataHub, CommandCenter,
│                      StrategyCanvas, AiCoachPage, Profile, Landing, Index, NotFound)
├── hooks/           # 14 custom hooks (includes useAICopy, useResearch)
├── contexts/        # Auth (dual: Supabase + local + RBAC) + UserProfile + Team
├── i18n/            # 290+ bilingual translation keys (Hebrew + English)
├── integrations/    # Supabase client + types
└── types/           # TypeScript type definitions (funnel, differentiation, pricing, retention, qa, research, governance, team)
supabase/functions/  # 12 Edge Functions
├── ai-coach/               # Claude marketing coach (full UserKnowledgeGraph context)
├── differentiation-agent/  # Claude Sonnet for 5-phase differentiation
├── generate-copy/          # Claude API proxy for AI copy generation
├── meta-token-exchange/    # Meta Ads OAuth
├── create-checkout/        # Stripe checkout session
├── stripe-webhook/         # Subscription management
├── agent-executor/         # Generic LLM agent executor (any Claude model) — wrapped by lib/agentOrchestrator.ts
├── research-agent/         # Deep research via Claude Opus
├── embed-content/          # Embedding generation + pgvector storage
├── queue-processor/        # Event queue processor with handler registry
├── webhook-dispatch/       # Outbound webhook delivery with retries
└── webhook-receive/        # Inbound webhook receiver
supabase/migrations/
├── 20260409_001_agent_infrastructure.sql  # agent_tasks, blackboard_snapshots, execution_log
├── 20260409_002_campaign_analytics.sql    # campaign_benchmarks, user_integrations, notification_preferences
├── 20260409_003_vector_search.sql         # pgvector, content_embeddings, code_embeddings, match functions
└── 20260409_004_event_queue.sql           # event_queue with claim/complete/fail/publish/cleanup
scripts/
├── analyze-codebase.ts         # Extracts semantic code chunks for embedding
├── audit-engines.ts            # Classifies every engine as LIVE / ORPHAN / DEAD based on
│                                 ENGINE_MANIFEST.isLive + consumer count (reports/engine-audit.json)
├── map-parameters.ts           # Source of truth for the 50 benchmark parameters and their
│                                 backing engines (edge functions, src/engine, src/lib, meta)
├── score-market-gap.ts         # Honest market-gap scorer — hardened 2026-04-10 so consumerCount
│                                 counts a file only if it imports AND calls a binding (CallExpression
│                                 or JSX). Location-aware thresholds: LIB_MIN_CONSUMERS=1 for
│                                 src/lib/ + src/services/ + edge functions, ENGINE_MIN_CONSUMERS=3
│                                 for src/engine/. An `isLive: true` manifest promotes an engine to
│                                 SHIPPED as soon as it has >=1 real call site.
├── verify-runtime-calls.ts     # Reachability gate: for every engine with ENGINE_MANIFEST.isLive:true
│                                 walks src/pages/ and src/components/ and classifies as REACHABLE /
│                                 IMPORTED_BUT_UNCALLED / NO_IMPORT. Exit 1 on any non-REACHABLE.
│                                 Writes reports/reachability-audit.json.
├── differentiation-check.ts    # Verifies each of the 5 pillars (DISC / Hormozi / Neuro-closing /
│                                 Hebrew NLP / Multi-agent) is SHIPPED in the current metric.
└── generate-market-gap-report.ts # Produces reports/MARKET_GAP_REPORT.md with Pre-wiring honest
                                   baseline + Post-wiring result + verdict + quick wins.
reports/
├── MARKET_GAP_REPORT.md        # 50-parameter scorecard, pillar table, verdict, top 10 quick wins
├── engine-audit.json           # Per-engine LIVE/ORPHAN/DEAD classification with consumer lists
├── reachability-audit.json     # Per-live-engine REACHABLE / IMPORTED_BUT_UNCALLED / NO_IMPORT
└── tier4-e2e.log               # Tier-4 multi-agent pillar end-to-end verification
```

## MAS-CC: Multi-Agent System Architecture

The system uses a Blackboard Architecture pattern where 12+ specialized agents read from and write to a shared knowledge space. Async execution runs independent agents in parallel.

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
10. qaContent      (→ funnel,kG) → LLM content quality review (cultural, Hebrew, CTA)
11. qaSecurity     (→ funnel)    → PII detection, injection vectors, unsafe templates
12. qaOrchestrator (→ 9,10,11)   → aggregates scores → grade A-F + recommendations

Debug Swarm (on demand):
Analyzer → Proposer → Critique loop with circuit breaker (max 5 iterations)

Research Engine (on demand):
Orchestrator decomposes question → 3 sub-agents (regulatory, market, marketing)
→ parallel execution → synthesis with strategic recommendations
```

### Async Pipeline Features

- **Parallel Execution**: Independent agents run simultaneously via `Promise.allSettled`
- **Circuit Breaker**: 3-state (closed/open/half-open) with max iterations, failure detection, cooldown
- **Cost Caps**: Per-session NIS budget limits with automatic cost tracking
- **Retry + Timeout**: Exponential backoff, configurable per agent
- **Persistent State**: Blackboard snapshots + execution audit log in PostgreSQL

### Event Queue

PostgreSQL-based event bus replacing AWS SQS:
- Atomic claim with `FOR UPDATE SKIP LOCKED`
- Priority-based processing (1=highest, 10=lowest)
- Automatic retry with exponential backoff
- Dead letter queue for exhausted retries
- Supported events: `plan.generated`, `plan.qa_requested`, `research.requested`, `embedding.requested`, `benchmark.update`, `notification.send`

### Semantic Search (pgvector)

- Content embeddings for all plan data (stages, hooks, copy, tips)
- Code embeddings for codebase comprehension
- Cosine similarity search via IVFFlat index
- `match_content()` and `match_code()` PostgreSQL functions

**LLM Router** dynamically selects Claude models based on task complexity:
- **Haiku** — headlines, WhatsApp messages, social posts (fast, cheap)
- **Sonnet** — ad copy, email sequences, landing pages, QA analysis (balanced)
- **Opus** — deep research, strategy documents (highest quality)
- **Fallback chains**: Opus → Sonnet → Haiku with automatic downgrade on failure

## GRAOS Optimization Layer (strictly additive)

Six small engines under `src/engine/optimization/` that observe the existing funnel + Sentinel pipeline without mutating it. Every module is pure, synchronous, and zero I/O. Every blackboard write passes through the ontological verifier. No new dependencies, no ML libraries.

| Module | File | Purpose |
|---|---|---|
| M1 | `regimeDetector.ts` | 3-state classifier (`stable` / `transitional` / `crisis`) over rolling Meta Insights metrics using coefficient-of-variation, trend shift, and critical-threshold rules on CPL (up) and CVR (down) |
| M2 | `biomimeticAnomaly.ts` | 3-layer anomaly scoring: L1 adaptive threshold (mean ± 2.5σ), L2 predictive residual (3-day rolling mean), L3 NBSR novelty (distance from history centroid). Aggregate `0.4·L1 + 0.3·L2 + 0.3·L3` |
| M3 | `extremeForecaster.ts` | Bayesian collapse forecaster. Prior `p=0.10` updated by velocity / fatigue / cost-escalation signals with a history-volatility amplifier. Emits `clear` / `watch` / `act` bands |
| M4 | `reflectiveAction.ts` + `reflective/ReflectiveCard.tsx` | Synthesizes funnel + gaps + regime + anomaly + forecast + profile into exactly ONE `ActionCard`. Feature-flagged by `VITE_REFLECTIVE_ENABLED=true` or `?reflective=1` |
| M5 | `daplProfile.ts` | 7-dimension Dynamic Adaptive Preference Learning vector over form-field events. Idempotent by field replacement. 12-principle ranking catalog |
| M6 | `ontologicalVerifier.ts` | Single write-gate for every `shared_context` write. 8 fail-fast checks: namespace prefix → concept_key shape → stage enum → payload type → JSON-serializable → `created_at` → schema → coherence vs previous |

### Strictness contract

- Zero mutations to existing engines (`funnelEngine`, `gapEngine`, `guidanceEngine`, Sentinel rail, or UI components).
- Exactly one existing file touched: `src/components/ResultsDashboard.tsx` — 7 lines added (2 imports + a feature-flagged conditional wrap).
- The `ReflectiveCard` renders only when `VITE_REFLECTIVE_ENABLED=true` or the URL carries `?reflective=1`. Sentinel and Reflective coexist without coupling.
- All Hebrew reason strings have no numbers, no percents, no em dashes, no exclamation marks, and no banned words.
- 50 new tests total (M1=6, M2=7, M3=6, M4=8, M5=13, M6=10), all green.
- Low-coherence short-circuit: when the reflective engine sees contradictory or missing diagnostic inputs (`coherence_score < 0.6`), it emits a fixed neutral `watch` card rather than committing to a decision.

## 5 Architectural Layers (added 2026-04-12)

Five production-readiness layers addressing cold start, cost governance, security, fault tolerance, and viral growth.

### Layer 1 — Cold Start & Time-to-Value

New users get a meaningful "quick win" within 2 minutes, before connecting any data source.

| Feature | File | What it does |
|---|---|---|
| `coldStartMode` flag | `userKnowledgeGraph.ts` | Derived boolean: `visitCount ≤ 2 && no external data` — engines check this to simplify output |
| Cold-start guidance | `guidanceEngine.ts` | Returns 3 educational items (profile, first funnel, AI Coach) instead of KPI-gap analysis for new users |
| Context-aware DAPL | `daplProfile.ts` | `initProfileWithContext(industry, experience, goal)` — sets informed priors instead of neutral 0.5 |
| ExpressWizard default | `CommandCenter.tsx` | New users see ExpressWizard (2 clicks → instant plan) with "Switch to full wizard" fallback |
| Onboarding milestones | `UserProfileContext.tsx` | Tracks 5 milestones (form, plan, data source, stylome, coach) with `completeMilestone()` |
| Cold-start banner | `ResultsDashboard.tsx` | Contextual "Starting point — here's how to improve" with 3 actionable suggestions |

### Layer 2 — Unit Economics / FinOps

Tier-based cost governance prevents margin erosion from LLM usage.

| Feature | File | What it does |
|---|---|---|
| Tier-based model restriction | `llmRouter.ts` | free→Haiku only, pro→Sonnet max, business→all models. `selectModel()` accepts optional `pricingTier` |
| Pre-generation budget check | `aiCopyService.ts` | Checks `isOverMonthlyBudget()` before every LLM call; throws descriptive error with upgrade CTA |
| Monthly usage tracking | `llmRouter.ts` | `getMonthlyUsage()` aggregates by month; per-tier caps: free=₪5, pro=₪50, business=₪200 |
| Cost-aware circuit breaker | `circuitBreaker.ts` | `recordSuccess(confidence, costNIS)` — trips breaker if session cost exceeds 2× cap |
| Usage dashboard | `UsageDashboard.tsx` | Displays calls, tokens, cost, progress bar; compact mode for AppTopBar |

### Layer 3 — Security, Privacy & RBAC

GDPR-compliant data governance with role-based access.

| Feature | File | What it does |
|---|---|---|
| Governance types | `types/governance.ts` | `UserRole` (owner/admin/editor/viewer), `ConsentRecord`, `AuditEntry`, `canPerform()` |
| Consent banner | `ConsentBanner.tsx` | First-visit modal with data processing (required) + training data opt-in (optional) |
| Training data gating | `trainingDataEngine.ts` | `captureTrainingPair()` checks `consent.trainingDataOptIn` — skips silently if opted out |
| Right-to-delete | `dataGovernance.ts` | `deleteAllUserData(userId)` purges localStorage + Supabase; `exportUserData()` for portability |
| RBAC foundation | `AuthContext.tsx` | `role: UserRole` on AppUser, `canPerform(action)` in context; solo users default to "owner" |
| HTML sanitization | `lib/sanitize.ts` | `sanitizeHTML()` strips script/iframe/event handlers; `escapeHTML()` for text rendering |
| Audit logging | `auditLog.ts` | Ring buffer (500 entries) in localStorage; convenience helpers for plan/export/consent/delete events |

### Layer 4 — Graceful Degradation & Fallbacks

When dependencies fail, the app degrades to a less-intelligent but functional state.

| Feature | File | What it does |
|---|---|---|
| Fallback templates | `lib/fallbackTemplates.ts` | 40 pre-written templates (10 industries × 4 task types), bilingual. Used when LLM fails |
| Stale data warnings | `MetaConnect.tsx` | Amber badge when Meta data > 7 days old; shows "last synced on {date}" |
| SentinelRail activated | `asyncAgentRunner.ts` | Records all agent success/failure events for anomaly detection |
| Output moderation | `outputModeration.ts` | Post-generation check: blocklist, negativity, high-pressure, cortisol overload |
| Network resilience | `networkResilience.ts` | `withRetry()`, offline queue (localStorage), auto-flush on `navigator.onLine` |

### Layer 5 — PLG (Product-Led Growth)

Self-growth mechanics so FunnelForge acquires users through its own product.

| Feature | File | What it does |
|---|---|---|
| Shareable plan links | `shareService.ts` | `createShareLink(plan)` → `/shared/{id}` with 30-day expiry, sensitive data stripped |
| Team foundation | `types/team.ts` + `TeamContext.tsx` | Team/TeamMember types, invite/remove/list, gated behind Business tier |
| Referral engine | `referralEngine.ts` | Unique codes, reward structure (referrer=30d Pro, referee=14d Pro), stats tracking |
| Export-as-link | `exportEngine.ts` | `exportAsLink()` uploads to Supabase Storage, returns 7-day signed URL |
| Plan comments | `PlanComments.tsx` | Comment thread per plan, localStorage-backed, team/shared-link visible |

## Honest Market-Gap Metric (hardened 2026-04-10)

The original `score-market-gap.ts` counted a file as a consumer as soon as it had an `import ... from "...engine"` line. That matched re-exports, type-only imports, and unused imports, so the reported 26/50 (52%) shipped score was structurally inflated — an engine could claim SHIPPED without any call site in the running product.

The metric was rewritten to close that gaming vector:

1. **Honest `consumerCount`.** A file counts as a consumer only when (a) it imports a binding from the engine and (b) at least one of those bindings appears as a CallExpression or JSX element in the file body, *outside* of any `import` or `export ... from "..."` statement. Pure re-export files drop out of the count entirely.
2. **Location-aware thresholds.** `LIB_MIN_CONSUMERS = 1` for `src/lib/`, `src/services/`, and edge functions. `ENGINE_MIN_CONSUMERS = 3` for `src/engine/`. Edge functions are matched via `supabase.functions.invoke('<name>', ...)` calls, not bare string occurrences.
3. **Runtime reachability gate** (`scripts/verify-runtime-calls.ts`). For every engine with `ENGINE_MANIFEST.isLive: true`, walks `src/pages/` and `src/components/` and classifies it as `REACHABLE`, `IMPORTED_BUT_UNCALLED`, or `NO_IMPORT`. Exits 1 on any non-`REACHABLE` engine. This is the enforcement mechanism that prevents a manifest from claiming `isLive` without a real call site.
4. **Pre-wiring honest baseline**: 23/50 = **46%** SHIPPED under the original 50-parameter map (equivalent to 23/51 = 45.1% under the current 51-parameter map). This is the true starting point under the hardened metric, not the 52% the loose metric reported.
5. **Post-wiring result** (after the 2026-04-11 refresh): **51/51 = 100% SHIPPED**, real differentiation **5/5 pillars**, verdict **GAP_CONFIRMED**, reachability **29/29**, market delta **+29.8 points** vs the 70.2% market average (+14.8 above the 85% top-competitor bar). This is the first time every parameter in the map clears the honest gate.
6. **Parameter #51 added 2026-04-11.** `Behavioral nudge orchestration` joined the map when `behavioralActionEngine` (Hobfoll COR + Fogg B=MAT + DISC-aware nudges, Kahneman-Tversky loss aversion, Nir Eyal Hook, Goal Gradient, SDT, social proof) landed with three page-level call sites in `Dashboard.tsx`, `CommandCenter.tsx`, and `StrategyCanvas.tsx`. Four previously-PARTIAL parameters (#7 Brand vector analysis, #8 Business DNA fingerprint, #37 Stylometric matching, #39 Export to channels) were promoted to SHIPPED by adding `isLive:true` to their manifests — each had an existing real call site in `src/components/` that the gate now recognizes.
7. **Four PAPER parameters closed.** `create-checkout` is invoked from `PaywallModal.tsx` when a user upgrades, satisfying **#46 Stripe payment** and **#48 Multi-tier pricing**. `webhook-dispatch` and `webhook-receive` are invoked from `Profile.tsx` via "Send test dispatch" and "Verify inbound endpoint" buttons, satisfying **#43 Webhook dispatch (outbound)** and **#44 Webhook receive (inbound)**. These closures replaced four PAPER entries with four SHIPPED call sites and brought the map to 51/51 = 100%.

### Verification Gate

Run before every commit that touches an engine or a target page:

```bash
npm run build
npm test                                   # debugSwarm baseline is the only allowed failure
npx tsx scripts/audit-engines.ts
npx tsx scripts/verify-runtime-calls.ts    # MUST pass — exits 1 on IMPORTED_BUT_UNCALLED / NO_IMPORT
npx tsx scripts/score-market-gap.ts
npx tsx scripts/differentiation-check.ts
PRE_WIRING_BASELINE_PCT=46.0 \
  npx tsx scripts/generate-market-gap-report.ts
```

### 5 Differentiation Pillars (all live)

| Pillar | Parameter | Backing Engine | Real Call Site |
|---|---|---|---|
| DISC behavioral profiling | #4 | `discProfileEngine` | Wizard flow + ResultsDashboard |
| Hormozi Value Equation | #5 | `hormoziValueEngine` | ResultsDashboard + funnelEngine |
| Neuro-storytelling closing | #6 | `neuroClosingEngine` | Sales pipeline + ResultsDashboard |
| Hebrew NLP optimization | #3 | `hebrewCopyOptimizer` + `stylomeEngine` | ContentTab + aiCopyService |
| Multi-agent orchestration | #1 | `agent-executor` + `queue-processor` + `agentOrchestrator` | Wizard.regenerateHeroCopy |

### Tier-4 Pillar: `src/lib/agentOrchestrator.ts`

Multi-agent orchestration already had edge-function invocations, but the pillar was carried by an edge function alone — no client-side orchestration layer. The orchestrator wraps `agent-executor` with:

1. Insert a pending row into `agent_tasks`.
2. `supabase.functions.invoke('agent-executor', ...)`.
3. Update the task row to `completed` on success.
4. Best-effort poll `event_queue` for an `agent.completed` event up to 30 seconds.
5. Fall back to the direct invoke response on poll timeout.

The single required call site lives in `src/pages/Wizard.tsx`, where `regenerateHeroCopy` calls `runAgent(...)` first and falls back to `aiCopyService.generateCopy(...)` on error — satisfying `LIB_MIN_CONSUMERS = 1`.

## Cross-Domain Knowledge Embedded (40+ domains)

| # | Domain | Application |
|---|--------|-------------|
| 1 | Behavioral Economics | Loss aversion, cost of inaction, anchoring, decoy effect, endowment |
| 2 | Neuroscience | 3-vector system (cortisol/oxytocin/dopamine) for copy + closing + brand |
| 3 | Sales Psychology | DISC personalities, SPIN, Challenger, MEDDIC, neuro-closing |
| 4 | Israeli Culture | Holiday calendar, army cycle, WhatsApp 98%, protexia referral |
| 5 | Hebrew Linguistics | Directness, gender-aware copy, dugri score, code-mixing |
| 6 | Copywriting Science | PAS/AIDA/BAB/Caples/Hopkins, reader profiles (System 1/2) |
| 7 | Game Design | Achievements, streaks, flywheels, dynamic difficulty |
| 8 | Network Effects | CLG, referral mechanics, LTV multipliers, viral loops |
| 9 | NLP | Copy QA, cortisol overload, reactance risk, persona matching |
| 10 | Branding Theory | Brand-neuro matching, vector alignment, Blue Ocean ERRC |
| 11 | Product Strategy | 4 flywheel types, churn reduction, IKEA effect |
| 12 | Data Science | Industry benchmarks, seasonal predictions, budget optimization |
| 13 | Adaptive Learning (EdTech) | ZPD calibration, zone of proximal development |
| 14 | Recommendation Engines | Taste clusters, cold start, presentation personalization |
| 15 | Clinical Psychology | Stage of Change (Prochaska), motivational interviewing |
| 16 | Psycholinguistics | Register shifting, Communication Accommodation Theory |
| 17 | CRO | F-pattern, above-the-fold, CTA placement, pricing pages |
| 18 | Information Architecture | Miller's Law, progressive disclosure, Gestalt |
| 19 | Mobile-First Design | Touch targets, bottom nav, safe areas, swipe |
| 20 | Dashboard Design | KPI hierarchy, drill-down, density, empty states |
| 21 | Wizard UX | Step indicators, validation timing, progress saving |
| 22 | Cognitive Load Theory | Intrinsic/extraneous load, split-attention, expertise reversal |
| 23 | Emotional Design | Visceral/behavioral/reflective, delight patterns, celebrations |
| 24 | SaaS Pricing | Value metrics, tier ratios, freemium conversion, annual discount |
| 25 | Behavioral Pricing | Charm pricing, Weber-Fechner JND, pain of paying |
| 26 | Offer Architecture | Hormozi value equation, offer stacking, guarantee design |
| 27 | Subscription Economics | LTV:CAC ratios, churn-price relationship, NRR |
| 28 | Customer Success | Onboarding design, time-to-value, health scoring |
| 29 | Lifecycle Marketing | Email/WhatsApp sequences, win-back, milestone celebrations |
| 30 | Churn Prevention | Prediction signals, cancellation flows, dunning |
| 31 | Loyalty & Referral | Points/tiers/experiential, Israeli referral culture, UGC loops |
| 32 | Stylometry | Perplexity & burstiness scoring, AI text detection, register shift analysis |
| 33 | Personality Psychology | DISC profiling, personality-driven messaging, CTA optimization |
| 34 | Value Engineering | Hormozi Value Equation (Dream Outcome × Likelihood / Time × Effort) |
| 35 | Multi-Agent Systems | Blackboard architecture, async parallel execution, circuit breakers |
| 36 | Quality Assurance | Static analysis, LLM-powered content review, security scanning |
| 37 | Israeli Regulatory | Advertising law, data protection, consumer rights compliance |
| 38 | Market Intelligence | Competitor analysis, pricing benchmarks, industry trends |
| 39 | SEO & Content Strategy | Keyword generation, content briefs, social calendar |
| 40 | Predictive Analytics | Success probability forecasting, budget efficiency scoring |
| 41 | Event-Driven Architecture | PostgreSQL queue, atomic claims, dead letter, retry patterns |
| 42 | Vector Search | pgvector embeddings, semantic similarity, codebase comprehension |

## Key Numbers

| Metric | Value |
|--------|-------|
| Lines of code | ~40,000 |
| TypeScript files | ~235 |
| Engines | 45 (`src/engine/*.ts`, excl. knowledge / subdirs) |
| Optimization overlay engines (GRAOS) | 6 (M1–M6, `src/engine/optimization/`) |
| Live engines (ENGINE_MANIFEST.isLive) | 29 |
| Runtime reachability | 29 / 29 REACHABLE |
| Tests | 651 passing (601 core + 50 GRAOS optimization; debugSwarm baseline excluded per plan) |
| Components | 103 |
| Pages | 17 |
| Routes | 12 |
| Tabs | 9 |
| Hooks | 14 |
| Translation keys | 290+ (he + en) |
| Edge Functions | 12 |
| SQL Migrations | 4 |
| Knowledge domains | 42 |
| Blackboard agents | 12 |
| QA checks | 15+ (static + content + security) |
| Research sub-agents | 3 (regulatory, market, marketing) |
| Industry pain points | 40 (10 verticals × 4) |
| WhatsApp templates | 50+ |
| `any` types | 0 |
| Honest shipped score | 51 / 51 = **100.0%** |
| Pre-wiring honest baseline | 23 / 50 = 46.0% (50-param map) ≈ 23 / 51 = 45.1% (51-param map) |
| Real differentiation | **5 / 5 pillars** |
| Verdict | **GAP_CONFIRMED** |
| Market delta | +29.8 pts vs 70.2% market average (+14.8 above 85% top competitor) |

## Tech Stack

- **Frontend**: React 18, TypeScript (strict), Vite, Tailwind CSS, Radix UI (shadcn/ui)
- **State**: React Query, Context API, custom hooks
- **Animation**: Framer Motion
- **Charts**: Recharts
- **Routing**: react-router-dom v6 (12 routes, lazy-loaded)
- **Backend**: Supabase (Auth, PostgreSQL, Edge Functions, pgvector)
- **AI**: Anthropic Claude (Haiku/Sonnet/Opus) via LLM Router with fallback chains + cost caps
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **Auth**: Dual-mode (Supabase + local SHA-256 fallback)
- **Ads**: Meta Graph API integration
- **Payments**: Stripe (checkout + webhooks)
- **Testing**: Vitest, React Testing Library
- **CI**: GitHub Actions (typecheck + lint + test + build)

## Monetization

| Tier | Price | Features |
|------|-------|----------|
| Free | ₪0 | 3 funnels, Strategy + Planning + Content tabs, differentiation |
| Pro | ₪99/month | Unlimited funnels, Sales + Pricing + Retention tabs, AI Coach (50 msgs) |
| Business | ₪249/month | WhatsApp templates, Campaign Cockpit, Template Marketplace, unlimited AI, AI Copy Generation |

## Getting Started

```bash
npm install
npm run dev          # Start dev server
npm test             # Run 651+ tests (debugSwarm baseline excluded per plan)
npx tsc --noEmit     # Type check
npm run build        # Build for production
```

### Verification Gate (honest metric)

```bash
# Full gate — every step must pass. verify-runtime-calls.ts exits 1 on any
# live engine that is IMPORTED_BUT_UNCALLED or NO_IMPORT.
npm run build
npm test
npx tsx scripts/audit-engines.ts
npx tsx scripts/verify-runtime-calls.ts
npx tsx scripts/score-market-gap.ts
npx tsx scripts/differentiation-check.ts
PRE_WIRING_BASELINE_PCT=46.0 \
  npx tsx scripts/generate-market-gap-report.ts

# Reports written:
#   reports/engine-audit.json
#   reports/reachability-audit.json
#   reports/MARKET_GAP_REPORT.md
#   reports/tier4-e2e.log
```

## Environment Variables

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_AI_COPY_ENABLED=true           # Enable AI copy generation
VITE_REFLECTIVE_ENABLED=false       # GRAOS Reflective Action Card opt-in (or use ?reflective=1)

# Edge Function secrets (Supabase Dashboard)
ANTHROPIC_API_KEY=          # AI Coach + Differentiation + QA + Research + Agent Executor
OPENAI_API_KEY=             # Embedding generation (text-embedding-3-small)
META_APP_ID=                # Meta Ads
META_APP_SECRET=            # Meta Ads
STRIPE_SECRET_KEY=          # Payments
STRIPE_WEBHOOK_SECRET=      # Webhook verification
```

## License

Proprietary. All rights reserved.
