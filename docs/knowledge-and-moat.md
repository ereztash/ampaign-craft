# Knowledge Domains & MOAT Data Flywheel

The 40+ embedded knowledge domains and the MOAT data flywheel architecture.

## Cross-Domain Knowledge Embedded (46 domains)

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
| 24 | SaaS Pricing | Value metrics, tier ratios, annual discount (20%), overage pricing, seats model |
| 25 | Behavioral Pricing | Charm pricing, Weber-Fechner JND, Van Westendorp PSM, pain of paying |
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
| 43 | Regulatory Focus Theory | Higgins 1997 — Prevention vs. Promotion focus drives archetype pipeline order |
| 44 | Adaptive UX Personalization | 5-archetype classifier, 8 heuristics (H1–H8), L1–L5 CSS resolution, Glass-Box traceability |
| 45 | Information Theory × Pricing | Shannon 3-tier entropy theorem (H=log₂3≈1.58 bits) applied in PricingWizardEngine tier architecture |
| 46 | Autopoietic Systems (J=∂I/∂Ω) | Φ_META_AGENT measures information gain gradient, semantic half-life, per-agent rejection rates |

---

## MOAT Data Flywheel

FunnelForge captures structured knowledge from every user interaction and aggregates it across the entire user base — anonymized, archetype-cohort-keyed. Each additional user makes the product measurably better for the next one.

### Flywheel Architecture

```
User interacts with recommendation
         │
         ▼
[1] captureRecommendationShown()     ← What was shown, to which archetype, with what context
         │
         ▼
[2] Variant-Pick UX                  ← Use / Alt / Skip — free preference label via UX buttons
         │
         ▼
[3] captureVariantPick(hoverMs)      ← Choice + position + hover time (micro-behavior signal)
         │
         ▼
[4] captureOutcome(7|30|90d)         ← navigated / plan_created / revenue_reported / dismissed
         │
         ▼
[5] cohort_benchmarks (nightly)      ← Anonymized pick-rates + conversion rates per archetype+action
         │
         ▼
[6] Next user in same archetype cohort sees pre-filtered recommendations
```

### 8 Data Primitives — Capture Status

| Primitive | Captured | Engine / Table | Signal Type |
|-----------|----------|----------------|------------|
| **Recommendation shown** | ✅ | `recommendation_events` | What each archetype sees |
| **Variant preference** | ✅ | `variant_pick_events` | primary / variation / skip |
| **Hover micro-behavior** | ✅ | `variant_pick_events.hover_ms` | Decision certainty signal |
| **Action→outcome loop** | ✅ | `outcome_reports` | 7 / 30 / 90-day conversion |
| **Engine output history** | ✅ | `engine_snapshots` | Time-series: health, bottlenecks, forecast |
| **Content snapshots** | ✅ | `content_snapshots` | Embedding-ready text per archetype |
| **Cross-user aggregation** | ✅ | `cohort_benchmarks` (mat. view) | Anonymized pick-rates by archetype+action |
| **Decision deltas (rejected)** | ✅ | `variant_pick_events.choice='skip'` | Explicit rejection = negative label |

### MOAT Growth Curve

| Stage | N paying users | Flywheel state | Defensibility |
|-------|---------------|----------------|---------------|
| Cold start | < 200 | Cohort benchmarks empty | None |
| Emerging | 200–1,000 | Pick-rate signals detectable per archetype | Low |
| Compounding | 1,000–5,000 | Cross-cohort lift measurable (O(N^0.3)) | Medium |
| Defensible | > 5,000 | Vertical ontology dense; 6–18 month rebuild gap | High |
