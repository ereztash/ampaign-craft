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
UserKnowledgeGraph cross-references all user data (FormData + Differentiation + Stylome + DISC Profile + Behavior) and feeds every module. Blackboard Architecture orchestrates 12+ specialized agents via topological dependency resolution with async parallel execution. AI Coach has full context from all 5 modules. LLM Router dynamically selects Claude models (Haiku/Sonnet/Opus) based on task complexity with fallback chains and cost caps.

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
├── engine/          # 33 pure-logic engines
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
│   ├── blackboard/                  # Agent orchestration (MAS-CC Blackboard Architecture)
│   │   ├── blackboardStore.ts       # Shared knowledge space with reactive updates
│   │   ├── agentRunner.ts           # Sync: topological sort + dependency-aware execution
│   │   ├── asyncAgentRunner.ts      # Async: parallel execution + timeout + retry + cost caps
│   │   ├── circuitBreaker.ts        # 3-state breaker (closed/open/half-open) for loop control
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
│   └── research/                    # Cross-domain research engine
│       ├── researchOrchestrator.ts  # Decomposes questions → dispatches sub-agents → synthesizes
│       └── subAgents/               # 3 domain specialists
│           ├── regulatoryAgent.ts   # Israeli advertising law, data protection, compliance
│           ├── marketAgent.ts       # Competitor analysis, pricing benchmarks, trends
│           └── marketingAgent.ts    # Channel effectiveness, content strategy, Israeli market
├── services/        # External integrations
│   ├── aiCopyService.ts             # Context-aware LLM copy generation with P&B post-processing
│   ├── llmRouter.ts                 # Model selection (Haiku/Sonnet/Opus) + fallbacks + cost caps
│   ├── blackboardPersistence.ts     # Save/load board state + task queue + audit log
│   ├── semanticSearch.ts            # pgvector-powered content similarity search
│   └── eventQueue.ts               # PostgreSQL event bus (publish/query/convenience helpers)
├── lib/             # Data libraries & utilities
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
│   └── ...                          # glossary, socialProofData, colorSemantics, utils
├── components/      # 99 React components
├── pages/           # 13 pages (ModuleHub, Dashboard, Wizard, Plans, PlanView, Differentiate, SalesEntry, PricingEntry, RetentionEntry, Profile, Landing, Index, NotFound)
├── hooks/           # 14 custom hooks (includes useAICopy, useResearch)
├── contexts/        # Auth (dual: Supabase + local) + UserProfile
├── i18n/            # 290+ bilingual translation keys (Hebrew + English)
├── integrations/    # Supabase client + types
└── types/           # TypeScript type definitions (funnel, differentiation, pricing, retention, qa, research)
supabase/functions/  # 10 Edge Functions
├── ai-coach/               # Claude marketing coach (full UserKnowledgeGraph context)
├── differentiation-agent/  # Claude Sonnet for 5-phase differentiation
├── generate-copy/          # Claude API proxy for AI copy generation
├── meta-token-exchange/    # Meta Ads OAuth
├── create-checkout/        # Stripe checkout session
├── stripe-webhook/         # Subscription management
├── agent-executor/         # Generic LLM agent executor (any Claude model)
├── research-agent/         # Deep research via Claude Opus
├── embed-content/          # Embedding generation + pgvector storage
└── queue-processor/        # Event queue processor with handler registry
supabase/migrations/
├── 20260409_001_agent_infrastructure.sql  # agent_tasks, blackboard_snapshots, execution_log
├── 20260409_002_campaign_analytics.sql    # campaign_benchmarks, user_integrations, notification_preferences
├── 20260409_003_vector_search.sql         # pgvector, content_embeddings, code_embeddings, match functions
└── 20260409_004_event_queue.sql           # event_queue with claim/complete/fail/publish/cleanup
scripts/
└── analyze-codebase.ts     # Extracts semantic code chunks for embedding
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
| Lines of code | ~38,000 |
| TypeScript files | ~230 |
| Engines | 33 |
| Tests | 565 (100% pass) |
| Components | 99 |
| Pages | 13 |
| Routes | 12 |
| Tabs | 9 |
| Hooks | 14 |
| Translation keys | 290+ (he + en) |
| Edge Functions | 10 |
| SQL Migrations | 4 |
| Knowledge domains | 42 |
| Blackboard agents | 12 |
| QA checks | 15+ (static + content + security) |
| Research sub-agents | 3 (regulatory, market, marketing) |
| Industry pain points | 40 (10 verticals × 4) |
| WhatsApp templates | 50+ |
| `any` types | 0 |

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
npx vitest run       # Run 565 tests
npx tsc --noEmit     # Type check
npx vite build       # Build for production
```

## Environment Variables

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_AI_COPY_ENABLED=true           # Enable AI copy generation

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
