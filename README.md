# FunnelForge — AI-Powered Marketing & Sales Platform for Israeli SMBs

Hebrew-first marketing funnel builder that combines behavioral economics, neuroscience, and Israeli market intelligence to generate complete go-to-market strategies in minutes.

## What It Does

Enter your business details (industry, audience, budget, goal) and FunnelForge generates:

- **5-stage marketing funnel** with channel recommendations, budget allocation, and KPIs
- **Sales pipeline** with deal stages, forecasting, objection scripts, and neuro-closing techniques
- **Content playbook** with copy formulas (PAS/AIDA/BAB), neuro-storytelling (cortisol/oxytocin/dopamine vectors), and a Copy QA auditor
- **Israeli market intelligence** — seasonal calendar, Hebrew copy optimizer, local tool recommendations
- **AI Marketing Coach** powered by Claude — context-aware advice based on your specific funnel
- **Campaign Cockpit** — track actual vs. projected KPIs over time
- **Template Marketplace** — publish and use community funnel templates

## Architecture

```
src/
├── engine/          # 15 pure-logic engines (no UI dependencies)
│   ├── funnelEngine.ts           # Core funnel generation (1,345 lines)
│   ├── salesPipelineEngine.ts    # Sales pipeline + neuro-closing + DISC personalities
│   ├─��� healthScoreEngine.ts      # Marketing readiness score (0-100)
│   ├── pulseEngine.ts            # Weekly engagement pulse with loss framing
│   ├── costOfInactionEngine.ts   # Behavioral economics loss quantifier
│   ├── copyQAEngine.ts           # Copy quality audit (6 neuro-psychological checks)
│   ├── clgEngine.ts              # Community-Led Growth strategy generator
│   ├── brandVectorEngine.ts      # Brand-neuro matching (cortisol/oxytocin/dopamine)
│   ├── retentionFlywheelEngine.ts # 4-type retention loop designer
│   ├── stylomeEngine.ts          # Writing style fingerprint extractor
│   ├── guidanceEngine.ts         # Meta Ads KPI remediation
│   ├── gapEngine.ts              # Performance gap analysis
│   └── dataImportEngine.ts       # CSV/Excel data ingestion
├── lib/             # Data libraries & utilities
│   ├── israeliMarketCalendar.ts  # 12 Israeli events with budget multipliers
│   ├── hebrewCopyOptimizer.ts    # 8 Hebrew neurolinguistics rules + scoring
│   ├── industryBenchmarks.ts     # 9 industries × 5 KPIs in NIS
│   ├── toolRecommendations.ts    # Israeli SaaS ecosystem mapping
│   ├── roiCalculator.ts          # Industry-specific ROI estimation
│   ├── whatsappTemplates.ts      # 6 Hebrew WhatsApp funnel templates
│   ├── glossary.ts               # 25+ bilingual marketing terms
│   ├── socialProofData.ts        # Aggregated user metrics by industry
│   ├── pricingTiers.ts           # Free/Pro/Business tier definitions
│   ├── adaptiveTabRules.ts       # Experience-based tab configuration
│   ├── adaptiveFormRules.ts      # Conditional form step logic
│   └── colorSemantics.ts         # Neuro-semantic color system
├── components/      # 35+ React components
├── hooks/           # 11 custom hooks (auth, plans, tracking, achievements, feature gates)
├── contexts/        # Auth + UserProfile + Language providers
├── i18n/            # 250+ bilingual translation keys (Hebrew + English)
├── integrations/    # Supabase client + types
└── types/           # TypeScript type definitions
supabase/functions/  # 4 Edge Functions
├── ai-coach/        # Claude Haiku marketing coach
├── meta-token-exchange/  # Meta Ads OAuth
├── create-checkout/      # Stripe checkout session
└── stripe-webhook/       # Subscription management
```

## Cross-Domain Knowledge Embedded

FunnelForge fuses knowledge from 12 academic and professional domains:

| Domain | Application |
|--------|-------------|
| Behavioral Economics | Loss aversion, cost of inaction, endowment effect, anchoring |
| Neuroscience | 3-vector system (cortisol/oxytocin/dopamine) for copy + closing |
| Sales Psychology | DISC buyer personalities, Sandler method, MEDDIC, neuro-closing |
| Israeli Culture | Holiday calendar, army cycle, WhatsApp 98% penetration, trust signals |
| Hebrew Linguistics | Directness patterns, gender-aware copy, cultural triggers |
| Copywriting Science | PAS/AIDA/BAB/Caples formulas, reader profiles (System 1/2), power words |
| Game Design | Achievements, streaks, retention flywheels, gamification loops |
| Network Effects | Community-Led Growth (CLG), referral mechanics, LTV multipliers |
| NLP | Copy quality audit, cortisol overload detection, reactance risk scoring |
| Branding Theory | Brand-neuro matching, vector alignment, Blue Ocean ERRC |
| Product Strategy | 4 flywheel types, churn reduction modeling, IKEA effect |
| Data Science | Industry benchmarks, seasonal predictions, budget optimization |

## Key Numbers

| Metric | Value |
|--------|-------|
| Lines of code | ~21,000 |
| TypeScript files | ~160 |
| Engines | 15 |
| Tests | 266 (100% pass) |
| Components | 35+ |
| Hooks | 11 |
| Translation keys | 250+ (he + en) |
| Edge Functions | 4 |
| `any` types | 0 |
| `console.log` | 0 |
| Industry themes | 7 color palettes |

## Tech Stack

- **Frontend**: React 18, TypeScript (strict), Vite, Tailwind CSS, Radix UI (shadcn/ui)
- **State**: React Query, Context API, custom hooks
- **Animation**: Framer Motion
- **Charts**: Recharts
- **Backend**: Supabase (Auth, PostgreSQL, Edge Functions)
- **AI**: Anthropic Claude (Haiku) via Edge Function
- **Ads**: Meta Graph API integration
- **Payments**: Stripe (checkout + webhooks)
- **Testing**: Vitest, React Testing Library
- **CI**: GitHub Actions (typecheck + lint + test + build)

## Monetization

| Tier | Price | Features |
|------|-------|----------|
| Free | ₪0 | 3 funnels, basic tabs, health score, achievements |
| Pro | ₪99/month | Unlimited funnels, AI Coach (50 msgs), PDF export |
| Business | ₪249/month | WhatsApp templates, Campaign Cockpit, Template Marketplace |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npx vitest run

# Type check
npx tsc --noEmit

# Build for production
npx vite build
```

## Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key

# Edge Function secrets (set in Supabase Dashboard)
ANTHROPIC_API_KEY=          # AI Coach
META_APP_ID=                # Meta Ads
META_APP_SECRET=            # Meta Ads
STRIPE_SECRET_KEY=          # Payments
STRIPE_PRICE_PRO=           # Pro tier price ID
STRIPE_PRICE_BUSINESS=      # Business tier price ID
STRIPE_WEBHOOK_SECRET=      # Webhook verification
```

## License

Proprietary. All rights reserved.
