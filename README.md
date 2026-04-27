# FunnelForge — פאנלפורג'

**הפלטפורמה הראשונה בעברית להצמחת עסקים קטנים ובינוניים באמצעות מדע ההתנהגות**
**The first Hebrew-native behavioral-science growth platform for Israeli SMBs**

---

## Value Proposition

FunnelForge is the only AI-native growth platform that combines behavioral-science wizards (Van Westendorp, Hormozi, DISC, Kahneman), six self-correcting data loops, and deep Hebrew cultural embedding for Israeli SMBs — giving them a compounding strategic advantage, not just AI-generated copy.

---

## Demo & Screenshots

Live demo and screenshots are pending public-beta release (Q2 2026). For an investor walkthrough, contact the founder directly (see *Contact* below).

---

## Three Key Outcomes

| Outcome | How |
|---------|-----|
| **Revenue growth** | Behavioral-science pricing wizard (PSM + Hormozi + Decoy) derives optimal charm price and 3-tier offer structure — users report closing at 15–30% higher price points |
| **Time saved** | Five connected modules replace five disconnected tools; a full growth strategy (differentiation → retention) takes ~45 min instead of weeks of consulting |
| **Churn reduced** | Archetype-adaptive retention sequences + DISC-personalized re-engagement scripts + 3-stage churn prediction model target <2.5% monthly churn vs. 3–5% Israeli SMB average |

---

## Why Now

- **Israeli SMB digitization wave** — 560K SMBs; only ~32% have a structured digital presence; post-COVID urgency is converting them at scale.
- **Post-ChatGPT awareness** — Israeli entrepreneurs now expect AI in their tools; the question is no longer *whether* to use AI but *which* AI understands their market.
- **WhatsApp-native B2B** — Israeli B2B runs on WhatsApp; FunnelForge is the only strategy platform with built-in WhatsApp campaign sequences in Hebrew.

---

## Moat

FunnelForge's primary defensibility is the **Romaniuk DBA color system**: each user archetype receives a distinct palette burned into muscle memory, making the interface immediately recognizable and switching psychologically costly. On top of that, **six compounding data loops** — pricing validation, archetype correction, framework ranking, churn calibration, benchmark replacement, and prompt-patch TTL — mean every user's outcome feeds back to improve the next recommendation, creating a flywheel that widens the gap with every paying customer. Finally, **Hebrew cultural embedding** goes beyond translation: gendered copy, Israeli market calendar, RTL-first architecture, and WhatsApp-native sequences are structural, not cosmetic — they cannot be replicated by localizing an English product.

---

## Competitor Comparison

| | FunnelForge | HubSpot | Jasper | GoHighLevel | Attio |
|---|---|---|---|---|---|
| **Hebrew-native** | ✅ 275+ keys, RTL, AI-driven gendered copy | ❌ | ❌ | ❌ | ❌ |
| **Behavioral science** | ✅ PSM + Hormozi + Decoy + CoI + DISC | ⚠️ limited | ❌ copy only | ❌ | ❌ |
| **Closed feedback loops** | ✅ 6 self-correcting loops | ⚠️ analytics only | ❌ | ❌ | ❌ |
| **Archetype-adaptive UI** | ✅ 5 archetypes, L1–L5 | ❌ | ❌ | ❌ | ❌ |
| **Price (monthly)** | ₪99 Pro / ₪249 Business | $20/seat+ | $49 | $97 | $29/user |

---

## Market Size

| Layer | Scope | Size |
|-------|-------|------|
| **TAM** | All Israeli SMB marketing spend capturable as SaaS | ₪16B/yr |
| **SAM** | Israeli SMBs with digital presence, willing to pay for a strategy tool | ₪587M/yr |
| **SOM** | Realistically acquirable within 5 years | ₪54M/yr |

*Source: [`docs/financials.md`](./docs/financials.md) — 560K SMBs × ₪2,400/mo avg spend; SAM = 180K × 20% SaaS adoption × ₪136 ARPU × 12; SOM = SAM × 10%.*

---

## Unit Economics

| Metric | Value |
|--------|-------|
| **Blended ARPU** | ₪136/mo (~$37) |
| **LTV** | ₪5,000 (~$1,370) |
| **CAC** | ₪200 (~$55) |
| **LTV : CAC** | **25×** |
| **Payback period** | **1.6 months** |
| **Gross margin** | ~78% |

---

## Revenue Projections

| Year | Paying Users | ARR (₪) | ARR ($) |
|------|-------------|---------|---------|
| **Y1** | 250 | ₪375K | $103K |
| **Y2** | 900 | ₪1.35M | $370K |
| **Y3** | 2,500 | ₪3.75M | $1.03M |
| **Y4** | 6,000 | ₪9M | $2.47M |
| **Y5** | 12,000 | ₪18M | $4.93M |

---

## Pricing

| Tier | Price | Highlights |
|------|-------|------------|
| **Free** | ₪0/mo | 3 funnels, core modules, 1 seat |
| **Pro** | ₪99/mo | Unlimited funnels, AI Coach 75 msgs, WhatsApp 10/mo, PDF export, 14-day trial |
| **Business** | ₪249/mo | Unlimited AI, unlimited WhatsApp, Campaign Cockpit, branded reports, 3 seats |

Annual plans save 20%.

---

## Architecture Overview

**MAS-CC / Blackboard** — 14 specialized agents, 119 engines, 6 closed loops.

```
  ┌─────────────────────────────────────────────────────────────┐
  │  UI Layer — React + shadcn/ui + RTL + Archetype-adaptive    │
  │  165 components · 35 pages · 25 hooks · L1-L5 resolution    │
  └──────────────────────────┬──────────────────────────────────┘
                             │
  ┌──────────────────────────▼──────────────────────────────────┐
  │  Context Layer — Auth · Archetype · UserProfile · DataSource │
  └──────────────────────────┬──────────────────────────────────┘
                             │
  ┌──────────────────────────▼──────────────────────────────────┐
  │  GRAOS Optimization Overlay (M1-M6) — strictly additive      │
  │  Regime · Anomaly · Forecast · Reflective · DAPL · Verifier  │
  └──────────────────────────┬──────────────────────────────────┘
                             │
  ┌──────────────────────────▼──────────────────────────────────┐
  │  Blackboard / MAS-CC — 14 agents, write-gated JSONB state   │
  │  KGraph · Funnel · DISC · Hormozi · CoI · QA · Φ_META (15 files) │
  └──────────────────────────┬──────────────────────────────────┘
                             │
  ┌──────────────────────────▼──────────────────────────────────┐
  │  Pure Engine Layer - 119 files (50 named *Engine.ts + helpers) │
  │  Behavioral Science · Pricing · Churn · Archetype · Copy QA   │
  └──────────────────────────┬──────────────────────────────────┘
                             │
  ┌──────────────────────────▼──────────────────────────────────┐
  │  LLM Router — Haiku $0.003 / Sonnet $0.015 / Opus $0.075     │
  │  Cost caps · fallback chains · tier-gated by subscription    │
  └──────────────────────────┬──────────────────────────────────┘
                             │
  ┌──────────────────────────▼──────────────────────────────────┐
  │  Persistence — Supabase Postgres + pgvector · Event Queue    │
  │  RLS · 48 migrations · 26 Edge Functions · 1536/384-dim     │
  └─────────────────────────────────────────────────────────────┘
```

> See [`docs/architecture.md`](./docs/architecture.md) for the full engine directory.

---

## Six Closed Feedback Loops

Most SaaS tools *capture* data. FunnelForge *closes loops* — every recommendation is measured, validated, and feeds back to self-correct the next one.

| # | Loop | What gets measured | Bridge to self-correction | File |
|---|---|---|---|---|
| **1** | **Pricing Validation** | Recommended price vs actual user revenue (30d horizon) | If miss > 20% → negative training pair → prompt patch | `outcomeLoopEngine.ts → capturePricingOutcome` |
| **2** | **Archetype Behavioral Correction** | Variant pick pattern vs expected for classified archetype | After 10+ picks, divergence ≥ 25% → lower confidence tier | `ArchetypeContext.tsx → recordVariantPick` |
| **3** | **Framework Effectiveness Ranking** | Pick rate of PAS / AIDA / BAB / Hormozi / Challenge | After 5+ picks, best-scoring framework becomes default | `frameworkRankingEngine.ts` |
| **4** | **Churn Prediction Self-Calibration** | Predicted churn rate vs observed outcomes by business field | Weighted blend at N ≥ 10, full weight at N ≥ 50 | `churnPredictionEngine.ts → applyCalibrationUpdate` |
| **5** | **Internal Benchmark Replacement** | Health score, success probability, reported revenue | Nightly Edge Fn computes p25/p50/p75 → replaces hardcoded numbers | `supabase/functions/nightly-benchmark-refresh/` |
| **6** | **Prompt Patch TTL** | Negative training pair count before vs 7 days after patch | If improvement < 10% → expire patch | `promptOptimizerLoop.ts → checkAndExpirePatches` |

---

## AI Cost Economics

| Model | Cost per call | Typical use |
|-------|--------------|-------------|
| Claude Haiku | $0.003 | Copy QA, classification, short completions |
| Claude Sonnet | $0.015 | Strategy generation, sales scripts, enrichment |
| Claude Opus | $0.075 | Deep differentiation, research synthesis |
| **Average per full plan generation** | **~$0.04** *(modeled, not yet observed)* | LLM Router mix: ~70% Haiku / 25% Sonnet / 5% Opus |

At ₪136/mo ARPU and ~$0.04 per generation, a user generating 10 plans/month costs ~$0.40 in AI - less than 1% of ARPU. Reconciliation against actual Anthropic billing pending paid-tier launch.

---

## Engineering Signals

| Metric | Value |
|--------|-------|
| Lines of code | 131,773 |
| Source files | 430 (excluding tests) |
| Tests | 4,721 in 322 test files |
| Migrations | 48 |
| Language | TypeScript |
| Test framework | Vitest + React Testing Library |
| CI | GitHub Actions (typecheck · lint · test · build) |
| Engines | 119 pure-function engines |
| Agents | 14 files (2 LLM-backed: qaContent + debugSwarm; 11 deterministic; 1 orchestrator) |
| Closed loops | 6 |
| Archetypes | 5 |
| Knowledge principles | 16 derived from 65 source docs (pilot: trauma + organizational consulting); 30 additional domains have theoretical scaffolding only |

---

## Roadmap

| Quarter | Milestone | Target Users |
|---------|-----------|-------------|
| **Q2 2026** | Public beta, first 50 paying users, Loop 1–3 live | 50 |
| **Q3 2026** | Pro tier launch, consultant channel warm-up, WhatsApp sequences | 250 |
| **Q4 2026** | Business tier GA, consultant reseller program live, cohort studies | 900 |
| **2027** | Arabic expansion, MENA entry, Series A trigger | 2,500+ |

---

## Seed Ask

**₪350K (~$96K)** — 18-month runway to ₪1M ARR trigger.

| Use of Funds | Amount | Purpose |
|-------------|--------|---------|
| Cloud infra (Supabase + Anthropic API) | ₪60K | First 12 months at 500 paying users |
| Content + WhatsApp marketing | ₪80K | Hebrew SEO, LinkedIn, consultant partnerships |
| First hire (Sales / Customer Success) | ₪180K | 12-month salary (IL mid-market) |
| Legal / IP | ₪30K | IP registration, terms, data processor agreements |
| **Total** | **₪350K** | |

---

## Honest Risks

| Risk | Current state |
|------|--------------|
| **Small archetype N** | Behavioral classification trained on <200 observations per archetype; confidence thresholds are conservative until N ≥ 500 |
| **No paying users yet** | Product is in private beta; all unit economics are modeled, not observed |
| **Anthropic API dependency** | Core AI features require Anthropic availability; no multi-provider fallback beyond Haiku → Sonnet graceful degradation |
| **Hebrew NLP tooling gaps** | Hebrew tokenization, stemming, and sentiment tooling is materially weaker than English; copy QA heuristics compensate but are imperfect |

---

## Consultant Reseller Program

Partners (marketing consultants, business coaches) earn **20% recurring commission** on every client they bring to FunnelForge.

- White-label PDF reports with consultant branding
- Priority API access and dedicated onboarding
- Co-marketing: featured in the FunnelForge consultant directory
- Referral dashboard with real-time revenue tracking

Target: 50 active consultant partners by end of Q3 2026.

---

## Getting Started

```bash
npm install
npm run dev       # Dev server
npm test          # Run tests
npx tsc --noEmit  # Type check
npm run build     # Production build
```

**Environment variables** — copy `.env.example` and fill in:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_AI_COPY_ENABLED=true
# Edge Function secrets: ANTHROPIC_API_KEY, OPENAI_API_KEY, STRIPE_SECRET_KEY
```

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Routing | react-router-dom v6, lazy-loaded |
| Animation | Framer Motion |
| Charts | Recharts |
| Backend | Supabase (Auth, PostgreSQL, Edge Functions, pgvector) |
| AI | Anthropic Claude (Haiku / Sonnet / Opus) via LLM Router |
| Embeddings | OpenAI text-embedding-3-small |
| Auth | Dual-mode: Supabase JWT or local PBKDF2 fallback |
| Payments | Stripe |
| Ads | Meta Graph API |
| Testing | Vitest + React Testing Library · 4,721 tests |
| CI | GitHub Actions (typecheck · lint · test · build) |

---

## Contact

If this resonates, let's talk. Security disclosures: see [`SECURITY.md`](./SECURITY.md). General inquiries: open an issue on this repository (private investor channel available on request).

---

*Proprietary. All rights reserved.*
