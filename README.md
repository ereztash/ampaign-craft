# FunnelForge

Hebrew-first business growth platform. Five connected modules turn raw business data into copy-paste-ready strategy: differentiation → marketing → sales → pricing → retention — all personalized, all bilingual (he/en).

---

## The 5-Module Cycle

```
    ┌──── Differentiation ◄──────────────┐
    │     5-phase wizard + AI enrichment  │
    ▼                                     │
  Marketing                           Retention
  Funnel · Copy · Hooks · Hormozi     Onboarding · Churn · Referral
    │                                     ▲
    ▼                                     │
  Sales ──────────► Pricing ─────────────┘
  Pipeline · DISC    Wizard · Van Westendorp
  Neuro-Closing      Tier Structure · LTV
```

---

## Modules

### 1 — Differentiation `/differentiate`
5-phase wizard with AI enrichment. Claim verification, hidden value discovery, competitor archetype mapping, B2B/B2C unified with market-mode detection.

### 2 — Marketing `/plans/:id/strategy`
5-stage funnel with channel recommendations and budget allocation. Personalized hooks (PAS/AIDA/BAB), Israeli market calendar, Hormozi Value Equation scoring, AI copy generation.

### 3 — Sales `/plans/:id/sales`
Pipeline stages + forecast. 4-layer personalized objection scripts. DISC personality profiling generates per-type messaging, CTA styles, and neuro-closing objection handlers.

### 4 — Pricing `/plans/:id/pricing`
**Wizard** — 4-step behavioral-science flow that *derives* the optimal price:
1. Value Quantification (Hormozi Dream Outcome × Time to Value)
2. Van Westendorp PSM (too-cheap floor → geo-mean OPP)
3. Offer Architecture (Effort × Social Proof + differentiator premium)
4. Revenue Architecture (LTV model + customer count)

Outputs: charm price, acceptable range, psychological anchor, 3-tier structure (Ariely Decoy), Kahneman CoI frame, LTV:CAC budget.

### 5 — Retention `/plans/:id/retention`
Churn prediction, onboarding sequences, referral mechanics, NRR projections, growth-loop mapping. DISC-personalized re-engagement scripts.

---

## Archetype Layer

A behavioral classification system that adapts the UI and guidance to the user's working style.

**5 archetypes** — derived from Big Five / Regulatory Focus / VIA:

| Archetype | Tendency | Blind spot |
|-----------|----------|------------|
| Strategist | Analysis before action | Stalls at differentiation, never moves to pricing |
| Optimizer | KPI-first, systematic | Skips differentiation, optimises misaligned funnels |
| Pioneer | High energy, creative | Moves to retention before sales is solid |
| Connector | Relationship-driven | Under-indexes on pricing confidence |
| Closer | Execution speed | Misses strategic differentiation depth |

**How it works:**
1. Behavioral signals are collected from onboarding form answers and module usage
2. A scoring engine (8 heuristics × L1–L5 confidence resolution) classifies the user
3. On first confident classification, an **opt-in reveal screen** shows the archetype, its strengths, blind spots, and what changes if the user accepts
4. If accepted: navigation order, color palette, animation speed, and heading font adapt
5. **Blind-spot nudges** fire when dwell time on a module exceeds the archetype threshold without completion (rate-limited to once per 72h)

All personalisation is gated on explicit opt-in (`adaptationsEnabled`). Adaptations never hide features.

---

## Routes

| Path | Description |
|------|-------------|
| `/` | Module hub |
| `/dashboard` | Returning-user hub (pulse + progress + last plan) |
| `/wizard` | Quick-start funnel wizard (~2 min) |
| `/differentiate` | Differentiation wizard (~10 min, recommended) |
| `/sales` | Sales module |
| `/pricing` | Pricing module |
| `/retention` | Retention module |
| `/plans` | Saved plans |
| `/plans/:id/:tab` | Deep link to specific plan tab |
| `/profile` | User profile + personalisation settings |
| `/archetype` | Archetype reveal + opt-in screen |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18, TypeScript (strict), Vite, Tailwind CSS, shadcn/ui |
| Routing | react-router-dom v6, lazy-loaded |
| Animation | Framer Motion |
| Charts | Recharts |
| Backend | Supabase (Auth, PostgreSQL, Edge Functions, pgvector) |
| AI | Anthropic Claude (Haiku / Sonnet / Opus) via LLM Router |
| Embeddings | OpenAI text-embedding-3-small |
| Auth | Dual-mode: Supabase JWT or local SHA-256 fallback |
| Payments | Stripe |
| Ads | Meta Graph API |
| Testing | Vitest + React Testing Library |
| CI | GitHub Actions (typecheck · lint · test · build) |

---

## Architecture

**MAS-CC** — async Multi-Agent System with Blackboard orchestration.

- **Blackboard** — shared state written by 13 agents (8 core + 4 QA + Φ_META_AGENT)
- **LLM Router** — selects Haiku / Sonnet / Opus based on task complexity and cost caps
- **GRAOS** — 6 strictly-additive optimization overlays (M1–M6) that rewrite engine output without touching source engines
- **QA Pipeline** — 15+ static + content + security checks run after every generation
- **Research sub-agents** — regulatory, market, and marketing research on demand

---

## Authentication

Dual-mode — the app detects Supabase availability at startup and falls back to local auth transparently.

| Mode | Condition | Persistence |
|------|-----------|-------------|
| Supabase | `VITE_SUPABASE_URL` set + reachable | JWT |
| Local | No Supabase / offline | `localStorage` (SHA-256 hashed) |

**Roles:** `owner` · `admin` · `editor` · `viewer`

All Supabase users receive `owner` in demo/beta. Local admin seed: `erez` / `10031999`.

---

## Getting Started

```bash
npm install
npm run dev       # Dev server
npm test          # Run tests
npx tsc --noEmit  # Type check
npm run build     # Production build
```

---

## Environment Variables

```bash
# Frontend (.env)
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_AI_COPY_ENABLED=true
VITE_REFLECTIVE_ENABLED=false   # GRAOS Reflective overlay (or ?reflective=1)

# Edge Function secrets (Supabase Dashboard)
ANTHROPIC_API_KEY=      # AI Coach, Differentiation, QA, Research
OPENAI_API_KEY=         # Embeddings (text-embedding-3-small)
META_APP_ID=
META_APP_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## Documentation

Detailed reference docs live in [`/docs`](./docs/):

| File | Contents |
|------|----------|
| [`docs/architecture.md`](./docs/architecture.md) | Engine directory, MAS-CC agents, GRAOS overlay, Edge Functions, DB schema |
| [`docs/archetype-system.md`](./docs/archetype-system.md) | 5 archetypes, 8 heuristics, classification pipeline, blind-spot nudges, key files |
| [`docs/knowledge-and-moat.md`](./docs/knowledge-and-moat.md) | 46 embedded knowledge domains, MOAT data flywheel architecture |
| [`docs/market-research.md`](./docs/market-research.md) | Target market, competitive landscape, differentiation matrix, growth levers |
| [`docs/financials.md`](./docs/financials.md) | Pricing tiers, unit economics, revenue projections, valuation scenarios, seed round |
| [`docs/verification-and-metrics.md`](./docs/verification-and-metrics.md) | Honest market-gap metric, verification gate scripts, key project numbers |

---

## License

Proprietary. All rights reserved.
