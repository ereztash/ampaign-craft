# Knowledge Domains & MOAT Data Flywheel

The embedded knowledge domains and the MOAT data flywheel architecture.

## Summary

**16 core operational domains** are actively wired into running engines, verified by the runtime-reachability gate (`verify-runtime-calls.ts`). An additional 30 domains provide theoretical grounding and inform future engine development.

The table below lists all 46; domains marked **[LIVE]** are exercised in production code paths.

## Cross-Domain Knowledge Embedded (46 domains — 16 core operational)

| # | Domain | Application |
|---|--------|-------------|
| 1 | **[LIVE]** Behavioral Economics | Loss aversion, cost of inaction, anchoring, decoy effect, endowment |
| 2 | **[LIVE]** Neuroscience | 3-vector system (cortisol/oxytocin/dopamine) for copy + closing + brand |
| 3 | **[LIVE]** Sales Psychology | DISC personalities, SPIN, Challenger, MEDDIC, neuro-closing |
| 4 | **[LIVE]** Israeli Culture | Holiday calendar, army cycle, WhatsApp 98%, protexia referral |
| 5 | **[LIVE]** Hebrew Linguistics | Directness, gender-aware copy, dugri score, code-mixing |
| 6 | **[LIVE]** Copywriting Science | PAS/AIDA/BAB/Caples/Hopkins, reader profiles (System 1/2) |
| 7 | Game Design | Achievements, streaks, flywheels, dynamic difficulty |
| 8 | Network Effects | CLG, referral mechanics, LTV multipliers, viral loops |
| 9 | NLP | Copy QA, cortisol overload, reactance risk, persona matching |
| 10 | Branding Theory | Brand-neuro matching, vector alignment, Blue Ocean ERRC |
| 11 | **[LIVE]** Product Strategy | 4 flywheel types, churn reduction, IKEA effect |
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
| 24 | **[LIVE]** SaaS Pricing | Value metrics, tier ratios, annual discount (35%), overage pricing, seats model |
| 25 | **[LIVE]** Behavioral Pricing | Charm pricing, Weber-Fechner JND, Van Westendorp PSM, pain of paying |
| 26 | **[LIVE]** Offer Architecture | Hormozi value equation, offer stacking, guarantee design |
| 27 | **[LIVE]** Subscription Economics | LTV:CAC ratios, churn-price relationship, NRR |
| 28 | **[LIVE]** Customer Success | Onboarding design, time-to-value, health scoring |
| 29 | Lifecycle Marketing | Email/WhatsApp sequences, win-back, milestone celebrations |
| 30 | **[LIVE]** Churn Prevention | Prediction signals, cancellation flows, dunning |
| 31 | Loyalty & Referral | Points/tiers/experiential, Israeli referral culture, UGC loops |
| 32 | **[LIVE]** Stylometry | Perplexity & burstiness scoring, AI text detection, register shift analysis |
| 33 | **[LIVE]** Personality Psychology | DISC profiling, personality-driven messaging, CTA optimization |
| 34 | **[LIVE]** Value Engineering | Hormozi Value Equation (Dream Outcome × Likelihood / Time × Effort) |
| 35 | **[LIVE]** Multi-Agent Systems | Blackboard architecture, async parallel execution, circuit breakers |
| 36 | **[LIVE]** Quality Assurance | Static analysis, LLM-powered content review, security scanning |
| 37 | Israeli Regulatory | Advertising law, data protection, consumer rights compliance |
| 38 | Market Intelligence | Competitor analysis, pricing benchmarks, industry trends |
| 39 | SEO & Content Strategy | Keyword generation, content briefs, social calendar |
| 40 | Predictive Analytics | Success probability forecasting, budget efficiency scoring |
| 41 | Event-Driven Architecture | PostgreSQL queue, atomic claims, dead letter, retry patterns |
| 42 | Vector Search | pgvector embeddings, semantic similarity, codebase comprehension |
| 43 | **[LIVE]** Regulatory Focus Theory | Higgins 1997 — Prevention vs. Promotion focus drives archetype pipeline order |
| 44 | **[LIVE]** Adaptive UX Personalization | 5-archetype classifier, 8 heuristics (H1–H8), L1–L5 CSS resolution, Glass-Box traceability |
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

---

## Brand-Asset Moat

Color becomes a moat through four compounding mechanisms. This section documents the architecture, locks the identity core, and defines the measurement loop that converts palette data into proprietary IP.

### 5 Moat Sources (ordered by leverage)

| Source | Mechanism | Time to compound |
|---|---|---|
| **1. Distinctive Brand Asset** (Romaniuk 2012) | Navy+green become recall triggers without a logo. Unaided color recall ≥30% at T+6m is the DBA test. | 5+ years of consistency |
| **2. Process Power** (Helmer) | Proprietary `(archetype × palette × stage) → conversion` lookup. Empirical IP no aesthetic-only competitor can reproduce. | 12–18 months of A/B data |
| **3. Counter-positioning** | Staying in navy+green forces HubSpot (purple), Salesforce (light-blue), Mailchimp (yellow) to concede or abandon their global identity. | Immediate; grows with market share |
| **4. Cornered cultural resource** | Hebrew + RTL + Israeli SMB conventions (blue=trust, green=growth, red=discount, white=government) in tokens. International competitors structurally can't match. | Permanent structural barrier |
| **5. Regulatory & locale embedding** | Israeli privacy law, RTL-as-core, locale semantic colors baked in token names. Not a translation overlay — a structural design. | Permanent; deepens with regulatory changes |

### 3 Locked Brand Anchors

Defined in `src/styles/brand-locked-tokens.css`. These are the identity core — **do not modify without following the amendment process below**.

| Token | HSL (light) | HSL (dark) | Behavioral role |
|---|---|---|---|
| `--brand-navy-anchor-hsl` | `216 68% 26%` | `213 65% 65%` | Trust anchor (Kahneman System 1 — blue = safe/competent in <90ms) |
| `--brand-growth-anchor-hsl` | `152 58% 40%` | `152 52% 52%` | Reward signal (Fogg BM — green = permission to act; dopamine-linked) |
| `--brand-canvas-anchor-hsl` | `210 22% 98%` | `222 24% 7%` | Cognitive rest (Neutral with navy tint — Albers harmony principle) |

### Amendment Process

1. Open a PR with **`[brand-amendment]`** in the description.
2. Attach a link to a design review approved by a product lead.
3. The `brand-lock-warn` CI job will post a warning comment — this is expected.
4. Two senior reviewers must approve before merge.
5. After merge, schedule a T+6m Romaniuk recall survey to verify DBA recovery.

### Palette Dimension — Flywheel Extension

The MOAT Flywheel (above) now carries a **palette dimension**:

```
captureRecommendationShown()
  context_snapshot = { ..., palette_variant_id, archetype_id }
         │
         ▼
palette_cohort_benchmarks (nightly refresh at 05:00 UTC)
  keyed by (archetype_id, palette_variant_id, action_id, horizon_days)
         │
         ▼
/admin/palette-cohorts shows conversion_rate_pct + rows_to_promotion ETA
         │
         ▼
Promotion gate: n≥200 + |Δ|≥5pp + p<0.05 + APCA Lc≥60 + CB-safe
         │
         ▼
Winning variant locked into archetype default in index.css
```

**Key invariant**: only `--accent` and `--cor-*` tokens vary across palette variants. The three locked anchors (`--brand-navy`, `--brand-growth`, `--brand-canvas`) are never touched by A/B tests.

### Color Architecture — 3 Layers

| Layer | File | Purpose |
|---|---|---|
| **1. Base anchors** | `src/styles/brand-locked-tokens.css` | LOCKED identity core. H+C in OKLCH; HSL fallback. |
| **2. Tonal generator** | `src/lib/tonalScale.ts` | Derives 50–900 steps from anchors via OKLCH L-axis. |
| **3. Semantic roles** | `src/styles/semantic-tokens.css` | Components consume roles (e.g., `--action-primary`), not raw values. Dark mode = mapping inversion only. |

### Theoretical Grounding

- **Tufte** (Data-Ink ratio): every colored pixel must carry signal. `funnel-gradient` restricted to ≤8 hero placements (allowlisted in eslint).
- **Brewer** (color scale ontology): sequential / diverging / categorical scales documented for future chart work. Charts (recharts) are out of moat scope — see "Future palette work" below.
- **Albers** (Interaction of Color): no raw hex in components. All values relative to surface via CSS var resolution.
- **Material Design 3 / HCT + OKLCH**: tonal generator uses OKLCH L-axis traversal for perceptually uniform steps.
- **WCAG / APCA**: APCA Lc ≥60 as guidance; WCAG 2.1 AA (4.5:1) as legal floor. Never overridden.

### Israeli Market Color Conventions

Documented in `src/styles/cultural-tokens.css`. Key conventions:

| Token | Meaning | Reference |
|---|---|---|
| `--cultural-discount-red` | Sale/discount (Shufersal, HaShuk) | Distinct from `--destructive` |
| `--cultural-trust-blue` | Authority/institutional (Bank Hapoalim, El Al) | = `--brand-navy-anchor` |
| `--cultural-government-clean` | Legal/tax/official screens (white-grey neutral) | Government portal convention |
| `--cultural-growth-green` | Secular financial growth | = `--brand-growth-anchor` |

### Hebrew Calendar Palette Modulation

`src/engine/calendarPaletteEngine.ts` applies subtle modulations on holidays:
- **Yom Kippur week**: −15% saturation on `--cor-opportunity` and `--cor-success`
- **Sukkot**: +5% saturation (harvest warmth)
- **Purim**: +12% saturation (highest celebration)
- **Memorial Day**: −20% saturation (absolute respect protocol)

Only `--cor-*` tokens are affected. Locked anchors are immutable.

Annual refresh: update `src/data/hebrew-calendar-2026.json` each September.

### Success Metrics

| Metric | When | Target |
|---|---|---|
| Data flow check | T+30d | ≥5 (archetype × palette × stage) rows with n>30 |
| Romaniuk unaided recall | T+6m | ≥30% of active users name "deep navy + green" without logo |
| First palette promotion | ~T+3m (traffic-dependent) | First variant locked into archetype default |

### Future Palette Work

- Brewer categorical scales for `recharts` charts (utility work, not moat scope).
- OKLCH full migration: every component touched after Sprint 1 migrates to semantic tokens. Pure-legacy components: Hard End-Date T+180d from Sprint 1 completion.
- APCA adoption as primary floor pending WCAG 3 ratification.
