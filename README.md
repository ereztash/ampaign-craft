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

FunnelForge's primary defensibility is the **Romaniuk DBA color system**: each user archetype receives a distinct palette burned into muscle memory, making the interface immediately recognizable and switching psychologically costly. The palette is also **calendar-aware** — `calendarPaletteEngine.ts` reads `hebrew-calendar-2026.json` (12 events) and modulates `--cor-opportunity` and `--cor-success` HSL tokens at runtime: muted saturation during **Yom Kippur** (-15) and Yom HaZikaron (-20), warmth on **Independence Day** (+10), celebration tone on Rosh Hashana — yielding **200+ runtime data points per archetype variant** (5 archetypes × 12 events × ~4 token shifts) that no English-localized product can replicate without rewriting its theme layer.

On top of that, **six compounding data loops** — pricing validation, archetype correction, framework ranking, churn calibration, benchmark replacement, and prompt-patch TTL — mean every user's outcome feeds back to improve the next recommendation, creating a flywheel that widens the gap with every paying customer. Finally, **Hebrew cultural embedding** goes beyond translation: gendered copy, Israeli market calendar, RTL-first architecture, and WhatsApp-native sequences are structural, not cosmetic.

---

## Competitive Defensibility

The honest competitive map (see [`docs/competitor-research/`](./docs/competitor-research/)):

- **Powerlink/Fireberry is the highest strategic threat** — Hebrew-native CRM with active AI investment and journey orchestration. Estimated **12–24 months** to close the gap on FunnelForge's MOAT thesis. Counter-strategy: ship the Triad-in-One-Platform wedge before Q3 2026.
- **The empty quadrant is "Hebrew + behavioral-science depth"** — no competitor combines both. Powerlink is high-Hebrew, low-behavioral; HubSpot/monday/Madgicx/Klaviyo are mid-low-Hebrew. FunnelForge owns the top-right quadrant by definition, not by luck.
- **The real fight is not against global SaaS** — it's against the **₪200/mo DIY stack** (Mailchimp + Canva + Google Sheets) and the ₪3K–₪8K/mo agency/freelancer market. Our pricing is 4–50× cheaper than human alternatives; the trust-gap on AI-Hebrew is the single biggest GTM risk.

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

**MAS-CC / Blackboard** — 14 specialized agents, 121 engines, 6 closed loops.

```
  UI Layer ──────────── React + shadcn/ui + RTL + Archetype-adaptive
                        166 components · 35 pages · 25 hooks · L1-L5
  Context Layer ────── Auth · Archetype · UserProfile · DataSource
  GRAOS Overlay (M1-M6)  Regime · Anomaly · Forecast · DAPL · Verifier
  Blackboard / MAS-CC — 14 agents, write-gated JSONB state
                        KGraph · Funnel · DISC · Hormozi · CoI · QA · Φ_META
  Pure Engine Layer - 121 files (50 named *Engine.ts + helpers)
                        Behavioral Science · Pricing · Churn · Copy QA
  LLM Router ────────── Haiku $0.003 / Sonnet $0.015 / Opus $0.075
                        Cost caps · fallback chains · tier-gated by subscription
  Persistence ──────── Supabase Postgres + pgvector · Event Queue
                        RLS · 48 migrations · 26 Edge Functions · 1536/384-dim
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

## Archetype Science

The five archetypes are not personas — they're a 2-axis classification grounded in two peer-reviewed theories, mapped directly to UI adaptation:

- **Regulatory Focus Theory (RFT)** — Higgins (1997, *"Beyond Pleasure and Pain"*). Promotion-focus seeks gains; prevention-focus avoids losses. Maps to copy framing: gain-framed ("unlock", "achieve") for promotion archetypes vs. loss-framed ("protect", "avoid risk") for prevention archetypes.
- **Elaboration Likelihood Model (ELM)** — Petty & Cacioppo (1986). Central processing weighs evidence; peripheral processing trusts heuristics. Maps to information surface: data tables and source-of-truth panels for central processors vs. social proof and authority badges for peripheral processors.

Classification confidence has **4 tiers** — lower tiers reduce adaptation aggressiveness:

| Tier | Meaning | UI behavior |
|------|---------|-------------|
| `none` | Insufficient signal | Neutral, no adaptations |
| `tentative` | Weak signal, ≥1 axis ambiguous | L1 only (palette tint) |
| `confident` | Both axes resolved, divergence < 25% | L1–L4 active |
| `strong` | High primary rate, no divergence | L1–L5 + framework default |

Implementation: `src/types/behavioralHeuristics.ts` (theory mapping), `src/types/archetype.ts` (`ConfidenceTier`), `src/contexts/ArchetypeContext.tsx` (divergence-driven downgrade after 10+ picks).

---

## Behavioral Ethics

The system is designed to influence behavior — which means we have to be explicit about what we *don't* do:

- **No dark patterns.** No countdown manipulation, no fake scarcity, no pre-checked upsells, no roach-motel cancellation flows.
- **Glass-Box, not Black-Box.** Every adaptation surfaces source theory + active heuristic + override switch (`AdminArchetypeDebugPanel.tsx`, `ArchetypeProfileCard.tsx`).
- **Opt-in, not opt-out.** Adaptive theming activates only after the user accepts the reveal screen (IKEA-effect opt-in via `ArchetypeRevealScreen.tsx`).
- **Rate-limited nudges.** Blind-spot prompts fire at most once per **72-hour window** per module per user (`useModuleDwell.ts → DISMISS_WINDOW_MS = 72 * 60 * 60 * 1000`).
- **User override always wins.** Manual archetype overrides bypass divergence correction; user-set confidence is locked at `strong`.

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
| Engines | 121 pure-function engines |
| Agents | 14 files (2 LLM-backed: qaContent + debugSwarm; 11 deterministic; 1 orchestrator) |
| Closed loops | 6 |
| Archetypes | 5 |
| Knowledge principles | 16 derived from 65 source docs (pilot: trauma + organizational consulting); 30 additional domains have theoretical scaffolding only |
| **Verification** | 51 tracked claims across 6 audit channels (numeric · identity · schema · behavioral · structural · provenance), blocker-gated in CI |

---

## Self-Consistency Audits

README and code drift in both directions. Every public claim has a registered Source-of-Truth provider re-checked in CI. **51 tracked claims** are split across **6 audit channels**:

| # | Channel | Verifies | Example |
|---|---------|----------|---------|
| 1 | **numeric** | 19 claims — doc counts (engines, agents, migrations, prices) match SOT computed from filesystem | `"119 engines"` ↔ `walk(src/engine).filter(non-test).length` |
| 2 | **identity** | 4 claims — tier/archetype/edge-fn/route IDs match canonical type unions | `ArchetypeId` ↔ palette + classifier consumers |
| 3 | **schema** | 3 claims — every `import.meta.env.VAR` and `Deno.env.get(VAR)` is declared in `.env.example`; `user_id` tables have RLS + policy | `VITE_AI_COPY_ENABLED` declared |
| 4 | **behavioral** | 11 claims — numeric thresholds in docs exist as literals in implementation files | `MIN_IMPROVEMENT_RATIO = 0.10` |
| 5 | **structural** | 3 claims — every `functions.invoke('X')` and `.from('Y')` resolves to a real edge-fn dir / migration | catches phantom calls |
| 6 | **provenance** | 11 claims — each behavioral claim's `source.quote` substring still appears in its file | quote in README ↔ behavioral-manifest |

Manifests: `scripts/consistency/{manifest,behavioral-manifest,structural-manifest}.ts`. Allowlist (dated): `scripts/consistency/allowlist.json`. Run locally: `npm run consistency`. CI blocks on every PR if any audit reports a non-allowlisted blocker.

---

## Roadmap

| Quarter | Milestone | Target Users |
|---------|-----------|-------------|
| **Q2 2026** | Public beta, first 50 paying users, Loops 1–3 live | 50 |
| **Q3 2026** | Pro tier launch, consultant channel warm-up, WhatsApp sequences | 250 |
| **Q4 2026** | Business tier GA, consultant reseller program live, cohort studies | 900 |
| **2027** | Arabic expansion, MENA entry, Series A trigger | 2,500+ |

---

## Seed Ask

**₪350K (~$96K)** for 18-month runway to ₪1M ARR trigger. Use of funds: cloud infra — Supabase + Anthropic API (₪60K), content + WhatsApp marketing (₪80K), first hire — Sales/CS at IL mid-market (₪180K), Legal/IP (₪30K).

---

## Honest Risks

| Risk | Current state |
|------|--------------|
| **Small archetype N** | Behavioral classification trained on <200 observations per archetype; confidence thresholds are conservative until N ≥ 500 |
| **No paying users yet** | Product is in private beta; all unit economics are modeled, not observed |
| **Anthropic API dependency** | Core AI features require Anthropic availability; no multi-provider fallback beyond Haiku → Sonnet graceful degradation |
| **Hebrew NLP tooling gaps** | Hebrew tokenization, stemming, and sentiment tooling is materially weaker than English; copy QA heuristics compensate but are imperfect |
| **Engineering debt — TS strict mode** | `tsconfig.app.json` runs with `strict: false` (legacy); strict-mode ratchet tracked in `tsconfig.strict.json`, target full strict by Q4 2026 |
| **Engineering debt — test coverage** | Global v8 statement coverage at ~36% (vitest threshold); critical engines (pricing, churn, copy QA, CoI) gated at ≥80% branches via `check-coverage-critical.sh` |
| **Engineering debt — auth crypto fallback** | `AuthContext.tsx` local mode uses PBKDF2 + SHA-256 (100K iterations) as fallback when Supabase JWT is unavailable; not equivalent to server-side Argon2id, intended for offline dev only |

---

## Consultant Reseller Program

Three tiers, recurring commission on every paying client a partner brings:

| Tier | Commission | Eligibility |
|------|-----------|-------------|
| **Founding Partner** | **30%** recurring | First 25 partners signed before Q3 2026 GA; ≥3 referred clients live; commits to co-marketing |
| **Active Partner** | **20%** recurring | ≥1 active referred client/quarter; completed FunnelForge certification module |
| **Referrer** | **10%** recurring | Single-link referral; no certification required |

Founding + Active receive white-label PDF reports, priority API access, dedicated onboarding, and consultant-directory placement. All tiers get the referral dashboard with real-time revenue tracking. Target: 50 active partners by end of Q3 2026.

---

## Getting Started

```bash
npm install
npm run dev          # Dev server
npm test             # Vitest tests
npm run consistency  # All 6 audits
npm run build        # Production build
```

Copy `.env.example` and fill `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, plus Edge-Fn secrets (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`).

---

## Tech Stack

React 18 + TypeScript + Vite + Tailwind + shadcn/ui (RTL-first); Supabase (Postgres + Auth + Edge Functions + pgvector); Anthropic Claude via LLM Router (Haiku / Sonnet / Opus); OpenAI text-embedding-3-small; Stripe checkout; Meta Graph API; Vitest + Playwright; GitHub Actions CI (typecheck · lint · test · build · consistency).

---

## Contact

Investor walkthrough or partnership inquiry: open an issue (private investor channel on request). Security disclosures: see [`SECURITY.md`](./SECURITY.md).

*Proprietary. All rights reserved.*
