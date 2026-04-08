# FunnelForge — Complete Business Growth System

Hebrew-first platform that combines 31 cross-domain knowledge areas into a 5-module growth cycle: Differentiation → Marketing → Sales → Pricing → Retention. All personalized, all copy-paste ready.

## The 5-Module Cycle

```
    ┌──── Differentiation ◄──────────┐
    │     B2B + B2C unified           │
    │     5-phase wizard + AI         │
    ▼                                  │
  Marketing                        Retention
  Funnel + Copy + Hooks            Onboarding + Churn + Referral
  + Israeli Calendar               + Growth Loops + Loyalty
    │                                  ▲
    ▼                                  │
  Sales ────────► Pricing ─────────────┘
  Pipeline + Scripts    Tier Structure + Offer Stack
  + Neuro-Closing       + Guarantee + Price Framing
```

## What It Does

**Module 1 — Differentiation** (`/differentiate`)
5-phase wizard with AI enrichment. Claim verification, hidden value discovery, competitor archetype mapping, buying committee/influence network narratives. B2B and B2C unified with market-mode detection.

**Module 2 — Marketing** (`/plans/:id/strategy`)
5-stage funnel with channel recommendations, budget allocation, KPIs. Personalized hooks (PAS/AIDA/BAB with your product), Israeli market calendar with seasonal budget multipliers.

**Module 3 — Sales** (`/plans/:id/sales`)
Pipeline stages, forecast, 4-layer personalized objection scripts (product + industry + differentiation + voice), neuro-closing frameworks, buyer personality (DISC).

**Module 4 — Pricing** (`/plans/:id/pricing`)
Recommended pricing model, 3-tier structure with decoy, Hormozi offer stack (value equation), guarantee design, price framing scripts for 5 contexts (landing/sales/proposal/WhatsApp/email), subscription economics (LTV:CAC).

**Module 5 — Retention** (`/plans/:id/retention`)
Onboarding sequences by business type (ecommerce/SaaS/services/creator), churn prediction signals with interventions, referral program blueprint with WhatsApp templates, growth loop identification, loyalty program design.

**Cross-Module Intelligence**
UserKnowledgeGraph cross-references all user data (FormData + Differentiation + Stylome + Behavior) and feeds every module. AI Coach has full context from all 5 modules.

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
├── engine/          # 22 pure-logic engines
│   ├── funnelEngine.ts              # Core funnel generation + personalizeResult
│   ├── salesPipelineEngine.ts       # Sales pipeline + neuro-closing + DISC + personalized scripts
│   ├── pricingIntelligenceEngine.ts # Pricing model + tiers + offer stack + guarantee + framing
│   ├── retentionGrowthEngine.ts     # Onboarding + churn + referral + loyalty + growth loops
│   ├── differentiationEngine.ts     # Claim verification + hidden values + synthesis
│   ├── differentiationKnowledge.ts  # B2B + B2C knowledge (archetypes, values, metrics)
│   ├── differentiationPhases.ts     # 5-phase config with mode-aware questions
│   ├── userKnowledgeGraph.ts        # Central intelligence: cross-references all user data
│   ├── pricingKnowledge.ts          # Israeli benchmarks + behavioral pricing constants
│   ├── retentionKnowledge.ts        # Lifecycle templates + churn signals + referral
│   ├── healthScoreEngine.ts         # Marketing readiness score (0-100)
│   ├── pulseEngine.ts               # Weekly engagement pulse with loss framing
│   ├── costOfInactionEngine.ts      # Behavioral economics loss quantifier
│   ├── copyQAEngine.ts              # Copy quality audit (6 neuro-psychological checks)
│   ├── clgEngine.ts                 # Community-Led Growth strategy generator
│   ├── brandVectorEngine.ts         # Brand-neuro matching (cortisol/oxytocin/dopamine)
│   ├── retentionFlywheelEngine.ts   # 4-type retention loop designer
│   ├── stylomeEngine.ts             # Writing style fingerprint extractor
│   ├── guidanceEngine.ts            # Meta Ads KPI remediation
│   ├── gapEngine.ts                 # Performance gap analysis
│   ├── nextStepEngine.ts            # Personalized next-step recommendations
│   └── dataImportEngine.ts          # CSV/Excel data ingestion
├── lib/             # Data libraries & utilities
│   ├── israeliMarketCalendar.ts     # 12 Israeli events with budget multipliers
│   ├── hebrewCopyOptimizer.ts       # 8 Hebrew neurolinguistics rules + scoring
│   ├── textAdapter.ts               # Register shifting from Stylome voice profile
│   ├── industryBenchmarks.ts        # 9 industries × 5 KPIs in NIS
│   ├── differentiationFormRules.ts  # Phase validation + colors
│   ├── adaptiveTabRules.ts          # 8 tabs with priority + simplified mode
│   ├── adaptiveFormRules.ts         # Conditional steps + differentiation pre-fill
│   ├── toolRecommendations.ts       # Israeli SaaS ecosystem mapping
│   ├── roiCalculator.ts             # Industry-specific ROI estimation
│   ├── whatsappTemplates.ts         # Hebrew WhatsApp funnel templates
│   ├── pricingTiers.ts              # Free/Pro/Business tier definitions
│   ├── smartDefaults.ts             # Adaptive form defaults by business type
│   ├── minimalFormDefaults.ts       # Minimal-mode form defaults
│   └── ...                          # glossary, socialProofData, colorSemantics, utils
├── components/      # 94 React components
├── pages/           # 13 pages (ModuleHub, Dashboard, Wizard, Plans, PlanView, Differentiate, SalesEntry, PricingEntry, RetentionEntry, Profile, Landing, Index, NotFound)
├── hooks/           # 12 custom hooks
├── contexts/        # Auth (dual: Supabase + local) + UserProfile
├── i18n/            # 290+ bilingual translation keys (Hebrew + English)
├── integrations/    # Supabase client + types
└── types/           # TypeScript type definitions (funnel, differentiation, pricing, retention)
supabase/functions/  # 5 Edge Functions
├── ai-coach/        # Claude marketing coach (full UserKnowledgeGraph context)
├── differentiation-agent/  # Claude Sonnet for 5-phase differentiation
├── meta-token-exchange/    # Meta Ads OAuth
├── create-checkout/        # Stripe checkout session
└── stripe-webhook/         # Subscription management
```

## Cross-Domain Knowledge Embedded (31 domains)

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

## Key Numbers

| Metric | Value |
|--------|-------|
| Lines of code | ~30,000 |
| TypeScript files | ~198 |
| Engines | 22 |
| Tests | 333 (100% pass) |
| Components | 94 |
| Pages | 13 |
| Routes | 12 |
| Tabs | 8 |
| Hooks | 12 |
| Translation keys | 290+ (he + en) |
| Edge Functions | 5 |
| Knowledge domains | 31 |
| Industry pain points | 40 (10 verticals × 4) |
| WhatsApp templates | 50+ |
| `any` types | 0 |

## Tech Stack

- **Frontend**: React 18, TypeScript (strict), Vite, Tailwind CSS, Radix UI (shadcn/ui)
- **State**: React Query, Context API, custom hooks
- **Animation**: Framer Motion
- **Charts**: Recharts
- **Routing**: react-router-dom v6 (9 routes, lazy-loaded)
- **Backend**: Supabase (Auth, PostgreSQL, Edge Functions)
- **AI**: Anthropic Claude (Haiku for coach, Sonnet for differentiation)
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
| Business | ₪249/month | WhatsApp templates, Campaign Cockpit, Template Marketplace, unlimited AI |

## Getting Started

```bash
npm install
npm run dev          # Start dev server
npx vitest run       # Run 333 tests
npx tsc --noEmit     # Type check
npx vite build       # Build for production
```

## Environment Variables

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key

# Edge Function secrets (Supabase Dashboard)
ANTHROPIC_API_KEY=          # AI Coach + Differentiation Agent
META_APP_ID=                # Meta Ads
META_APP_SECRET=            # Meta Ads
STRIPE_SECRET_KEY=          # Payments
STRIPE_WEBHOOK_SECRET=      # Webhook verification
```

## License

Proprietary. All rights reserved.
