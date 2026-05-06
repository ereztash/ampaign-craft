# FunnelForge - PM Mentor Walkthrough

> Prepared 2026-05-06. Source-grounded; every claim traces to code paths cited inline.
> Wedge mode = `all` (reverted today from `pricing-only`). All 5 modules visible.

---

## Module-at-a-glance

| # | Module | Route | Code-anchored promise | Hard dependency |
|---|---|---|---|---|
| 1 | Differentiate | `/differentiate` | 5-phase wizard + AI agent that produces a Toulmin-style differentiation strength score | none (independent) |
| 2 | Wizard / Marketing | `/wizard` | SmartOnboarding -> `generateFunnel` -> Strategy Canvas + AI hero copy | Intake (optional pre-fill) |
| 3 | Sales | `/sales` | DISC-driven pipeline, objection scripts, quote builder, WhatsApp send | requires Wizard plan |
| 4 | Pricing | `/pricing` | 4-step wizard (Hormozi + Van Westendorp PSM) -> price + experiment loop | requires Wizard plan |
| 5 | Retention | `/retention` | Churn playbook, onboarding timeline, referral, loyalty | requires Wizard plan |

Source: `src/App.tsx:160-167`, `src/lib/wedgeMode.ts:31-39`.

---

## 1A. Differentiate - Job-to-be-done

- **JTBD**: When I am preparing to launch or pitch, I want to articulate a defensible difference, so I can stop sounding like every competitor.
- **Persona**: founder or marketing lead who has read positioning books but cannot pass a "would a competitor say the same?" test.
- **Done for the user**: a written claim plus a numeric strength score, and a 7-narrative pack tailored to roles in a buying committee.
- Independent of Wizard - the only module callable cold (no plan required). `src/pages/Differentiate.tsx:46-58`.

---

## 1B. Differentiate - What it does today

- Two flows. (1) 5-phase form wizard, (2) "upload meeting transcript" mode via `?mode=transcript`. `src/pages/Differentiate.tsx:39-41, 198-208`.
- Each phase calls a Supabase Edge Function `differentiation-agent`. Phases: surface, contradiction, hidden, mapping, synthesis. `src/components/DifferentiationWizard.tsx:60-115`.
- Synthesis returns a `differentiationStrength` 0-100; on idle the page also runs a *preview* score from profile alone. `src/pages/Differentiate.tsx:101-110`.
- Engine: `generateDifferentiation` (`src/engine/differentiationEngine.ts:163`), questions per phase from `getQuestionsForPhase`, cross-domain insights from `crossDomainBenchmarkEngine`.
- **Real**: engine + 5 phases + persistence (Supabase `differentiation_results`). **Scaffolded**: the AI calls each round-trip the Edge Function; failure drops to local-only synthesis.
- **vs. ChatGPT**: contradiction test + role-tailored 7 narratives are codified, not freeform. The score itself is a heuristic, not validated.

---

## 1C. Differentiate - Metrics & evidence

- **North-star (proposed)**: % of users who reach `synthesis` and copy/share the resulting one-liner. Today's app-wide North Star is `weekly_activated_plans` (Wizard). `src/lib/analytics.ts:19-25`.
- **Telemetry**: a dedicated event chain exists - `differentiation.one_liner_generated -> copied -> edited -> use_case_selected -> external_use_committed -> followup_sent -> real_world_use_reported -> positive_signal_reported`. Negative: `not_mine_feedback`, `unclear_feedback`. `src/lib/analytics.ts:75-84`.
- **Data so far**: no aggregate I can read in this checkout. Validation harness referenced at `evals/differentiation/uncertainty-ledger.md` (per analytics.ts comments). Treat as "no data yet" for the meeting.
- **Activation tier**: `differentiationEngine` is Tier S (always on per CLAUDE.md). The Edge Function is on-demand.

---

## 1D. Differentiate - Open questions

1. The 5-phase wizard takes ~10 minutes. Is that too heavy for the "fake door / oneliner" landing variant we tested at `/oneliner`? Cut to phases 1+5 only?
2. We persist a `differentiationStrength` score but have not externally validated it. Do we ship a number, or only a qualitative output, until we have ground truth?
3. Transcript mode runs 12 principles in parallel in ~3 min. Should that become the default, with the 5-phase wizard moved behind "for first-time users"?
- **Bet we cannot yet falsify**: that founders will sit through a 10-minute structured wizard for differentiation more readily than they will for a generic plan.

---

## 2A. Wizard / Marketing - Job-to-be-done

- **JTBD**: When I have a vague marketing idea, I want a complete funnel plan in under 2 minutes, so I can act today instead of noodling for weeks.
- **Persona**: solopreneur or small-business owner who has paid for ads with no plan and wants structure, not theory.
- **Done for the user**: a saved plan visible at `/strategy/:planId`, with hero copy regenerated and an SEO meta-description draft.

---

## 2B. Wizard / Marketing - What it does today

- `SmartOnboarding` -> `generateFunnel(formData)` -> personalised by `buildUserKnowledgeGraph`. `src/pages/Wizard.tsx:125-164`.
- Side effects on completion: `predictContentScore`, `generateSEOContent`, `calculateEPS`, `archetype` update, AARRR `firstPlanGenerated` + `ahaMoment`, save to `funnelforge-plans` localStorage and DB.
- Hero-copy regenerator calls `runAgent` (multi-agent orchestrator, system prompt: "marketing copy expert ... Hebrew for Israeli audiences"), falls back to `aiCopyService.generate`. `src/pages/Wizard.tsx:90-123`.
- Pre-fills from Intake via `getIntakePrefill` and `mergeIntakePrefill`. `src/pages/Wizard.tsx:39-53`.
- **Real**: end-to-end plan generation, persistence, archetype reveal. **Scaffolded**: the prompt-optimizer report is fire-and-forget; `predictContentScore` runs but UI surfacing is partial.
- **vs. ChatGPT**: the funnel scaffold (stages, copy formulas, audience mapping) is structured; the copy itself is just an LLM call. Honest answer: the *scaffold* is the moat, not the copy.

---

## 2C. Wizard / Marketing - Metrics & evidence

- **North-star**: `aarrr.activation.first_plan_generated`. Target = 25 plans/week (`NORTH_STAR_METRIC` `src/lib/analytics.ts:19-25`).
- **Telemetry fired here**: `Analytics.firstPlanGenerated`, `Analytics.ahaMoment("first_plan_generated")`, `onPlanGenerated`, `trackFirstPlanGenerated`. `src/pages/Wizard.tsx:155-160`.
- **TTFV**: timestamp captured at onboarding-start (`safeSessionStorage.setJSON("funnelforge_ttfv_start", Date.now())`) and emitted as `ttfv_ms` on first_plan_generated. `src/lib/analytics.ts:218-228`.
- **Data so far**: `/admin/aarrr` aggregates from `event_queue`. No numbers checked into the repo; do not quote.
- **Activation tier**: `funnelEngine` + `userKnowledgeGraph` are Tier S. SEO and EPS are activated here as side calls.

---

## 2D. Wizard / Marketing - Open questions

1. We fire `aha_moment` automatically on plan generation. Does that overstate the metric vs. reality (user looking at a generated plan != aha)?
2. The Wizard is the only module where `Analytics.ahaMoment` fires. Should the Pricing wizard's "OPP computed" or Differentiate's "synthesis returned" also count as aha?
3. Hero copy uses `runAgent` (multi-agent), then falls back. We do not log which path produced the copy. Add a `copy.path={agent|fallback}` dimension before another iteration?
- **Bet**: that a 2-minute end-to-end plan creates retention. We have no week-2 cohort to confirm or deny.

---

## 3A. Sales - Job-to-be-done

- **JTBD**: When I have a generated plan and a prospect on the line, I want a script tuned to *this* prospect's personality, so I do not freeze on the call.
- **Persona**: founder or sales rep mid-cycle, with leads sitting in CRM and a scheduled call this week.
- **Done for the user**: a copyable opening script, an objection response, and a sendable WhatsApp/email - in under 30 seconds.

---

## 3B. Sales - What it does today

- Hard-gated: requires a saved plan. If none, redirects to `/wizard`. `src/pages/SalesEntry.tsx:27-42`.
- `SalesTab` produces: pipeline visualisation, forecast KPIs (deals, AOV, win rate), objection scripts (`pipeline.objectionScripts`), neuro-closing strategies (DISC-aware), quote builder. `src/components/SalesTab.tsx:46-52, 218-244`.
- Engines composed: `generateSalesPipeline`, `inferDISCProfile`, `generateClosingStrategy`, `detectBuyerPersonality`. `src/components/SalesTab.tsx:46-51`.
- One-click WhatsApp via `WhatsAppSendButton`, email via `EmailComposer`. Quote builder writes to Supabase `quotes` table.
- StaleLeadDraft generates re-engagement copy from `leadCoachEngine` + a tracked "captureRecommendationShown" record. `src/components/StaleLeadDraft.tsx:44-83`.
- **Real**: scripts, DISC profile, quote save, WhatsApp send. **Scaffolded**: `salesPipelineEngine` is Tier B (gated by leadCount >= 20 - see `engineActivationRules.ts:54-58`). The pipeline shown to a new user is heuristic, not data-driven.
- **vs. ChatGPT**: DISC inference + the WhatsApp send + the quote save are real product. The scripts themselves are templated.

---

## 3C. Sales - Metrics & evidence

- **North-star (proposed)**: scripts copied per session (`aarrr.activation.first_template_copied`) and quotes saved per active user.
- **Telemetry**: `aarrr.activation.first_template_copied` exists (`channel`). `aarrr.activation.first_lead_logged`. No `sales.*` namespace today; sales-specific events would need to be added.
- **Data so far**: no module-specific telemetry beyond shared activation events. "No data yet" for sales-specific funnel.
- **Activation tier**: `salesPipelineEngine` is Tier B - active only at >=20 leads. Most users see a heuristic pipeline. `src/engine/engineActivationRules.ts:53-58`.

---

## 3D. Sales - Open questions

1. The pipeline view runs `salesPipelineEngine` regardless of leadCount, even though the activation rule says >=20. Do we honour the gate (and show "needs data") or keep the heuristic preview?
2. We have no event for "WhatsApp send tapped" or "quote saved as PDF". Should we add `sales.whatsapp_sent` and `sales.quote_saved` before the next user-research round?
3. DISC inference runs on every load. Is the cost worth it, or should it be cached on the plan record once the user accepts it?
- **Bet**: that a copyable script tuned by DISC outperforms a generic LLM script. We have not A/B-tested this.

---

## 4A. Pricing - Job-to-be-done

- **JTBD**: When I do not know what to charge, I want a defensible price plus a way to test it on real prospects, so I stop guessing.
- **Persona**: service or product founder mid-sale, often quoting differently to each lead.
- **Done for the user**: a recommended optimal price (PSM midpoint adjusted for value/differentiators), and a running experiment with logged outcomes.

---

## 4B. Pricing - What it does today

- 4-step wizard: Value (Hormozi DxT) -> Van Westendorp PSM (too-cheap, stretch) -> Offer Architecture (effort, social proof, differentiators) -> Revenue (model, retention, goal). `src/components/PricingWizard.tsx:200-647`.
- "We don't ask your price. We DERIVE it." `src/components/PricingWizard.tsx:9-11, 207-211`.
- Engine: `computePricingWizardRecommendation`. `src/engine/pricingWizardEngine.ts:361`.
- **Israeli pricing psychology**: 6 cultural segments (mainstream, chareidi, dati-leumi, arab, russian, tech_b2b) with VAT framing, tashlumim split, hebrew-calendar timing, segment-specific trust anchors. `src/components/IsraeliPricingPsychologyCard.tsx:23-30, analyzeIsraeliPricing`.
- **Experiment loop**: create cohort (default n=5), log outcomes (`accepted_full`, `accepted_with_haggle`, `objected_price`, `objected_value`, `declined`, `ghosted`), analyse acceptance rate, propose next price. `src/components/PricingExperimentLab.tsx:37-117`.
- **Real**: full wizard, experiment loop with persisted cohort, Israeli-segment psychology. **Differentiated**: the cultural-segment + experiment-loop combination is not "ask ChatGPT".

---

## 4C. Pricing - Metrics & evidence

- **North-star (module)**: experiment completion rate (cohorts that reach n=5 logged outcomes vs. abandoned).
- **Telemetry (richest of any module)**: `wedge.experiment_started`, `wedge.experiment_outcome_logged`, `wedge.experiment_completed` (with `acceptance_rate`, `duration_ms`), `wedge.experiment_abandoned`, `wedge.next_experiment_started`, plus `wedge.first_value_seen` (only Pricing fires TTFV today). `src/lib/wedgeTelemetry.ts:84-177`, `src/components/PricingIntelligenceTab.tsx:55`.
- **Data so far**: pricing-only wedge ran briefly and was reverted today. We have a partial cohort but not a statistically meaningful one - acknowledge openly.
- **Activation tier**: `pricingWizardEngine` is Tier B (INTENT_SIGNAL trigger - keyword "price/מחיר" or visit `/pricing`). `src/engine/engineActivationRules.ts:131-138`.

---

## 4D. Pricing - Open questions

1. Default cohort size is 5. With 5 outcomes the acceptance-rate confidence interval is enormous. Do we raise to 10 (longer time-to-result) or keep 5 (faster but noisier)?
2. The Israeli-segment card defaults to `mainstream`. Should we ask explicitly during the wizard, or infer from `formData.audienceType` and stop asking?
3. PricingExperimentLab is the only place that uses `wedge.experiment_*` events. If we run a non-pricing wedge later, do we generalise the schema or fork it?
- **Bet**: that founders will log real-prospect outcomes for 5 calls in a row. Open question if drop-off after 1-2 outcomes will dominate.

---

## 5A. Retention - Job-to-be-done

- **JTBD**: When customers go quiet, I want a structured response (onboarding template, churn signal, save-offer), so I am not improvising re-engagement.
- **Persona**: SaaS or services owner with churn pain, not yet sophisticated enough to build a CRM workflow.
- **Done for the user**: a 30-day onboarding sequence with copyable templates, a churn-signal map, and a referral WhatsApp template ready to send.

---

## 5B. Retention - What it does today

- Hard-gated on plan. `src/pages/RetentionEntry.tsx:71-80`.
- `generateRetentionStrategy` reads three storage keys to personalise: pricing wizard input, differentiation result, plan formData. `src/pages/RetentionEntry.tsx:32-39`, `retentionPersonalizationContext.ts`.
- Tabs: Retention (default) and Churn Playbook. Retention surface produces: onboarding timeline (per day, per channel, per template), churn signals (risk tier + intervention), referral blueprint with WhatsApp template, growth loop, loyalty tiers, retention triggers. `src/components/RetentionGrowthTab.tsx:62-280`.
- `assessChurnRisk` produces a risk score 0-100 and tier (`healthy/watch/at-risk/critical`). `src/components/ChurnPredictionCard.tsx:17-22, 37`.
- **Real**: full surface renders with copyable templates and links to playbook. **Honest caveat**: the `InsightActionCard` for retention explicitly says `confidence="needs_data"` and `"Based on industry average; not your actual data"` (`RetentionGrowthTab.tsx:74-78`). The module is openly heuristic until live data lands.

---

## 5C. Retention - Metrics & evidence

- **North-star (proposed)**: % of users who copy at least one onboarding template within 7 days of plan generation.
- **Telemetry**: `aarrr.retention.weekly_active`, `streak_broken`, `reactivated`, `pulse_opened`, `loop_continued`, `loop_new_move`, `cadence_hint_shown`. No `retention.template_copied` event yet.
- **Data so far**: no module-specific data; "no data yet" is the honest answer.
- **Activation tier**: `retentionFlywheelEngine` is Tier B (TIME_IN_SYSTEM >=30 days). `churnPlaybookEngine` is Tier B (intent: visit `/retention` or keywords). `src/engine/engineActivationRules.ts:80-85, 158-167`.

---

## 5D. Retention - Open questions

1. The module renders for users with 0 customers. Should we gate it behind "has at least one logged customer" so output is not pure boilerplate?
2. We have a Churn Playbook tab but the entry surface already shows churn signals. Is one of these redundant?
3. Onboarding templates are copy-pasteable. Should we instrument `retention.onboarding_step_copied` per-step so we can rank which steps are useful?
- **Bet**: that surfacing churn signals before churn happens drives action. Untestable until users have churn data inside the tool.

---

## Cross-module: engines, ViewModel boundary, wedge mode

- **10 Tier-S engines** run on every cycle (per CLAUDE.md): userKnowledgeGraph, funnelEngine, differentiationEngine, discProfileEngine, healthScoreEngine, guidanceEngine, behavioralActionEngine, gapEngine, costOfInactionEngine, nextStepEngine. Cost is bounded; latency dominated by `funnelEngine` (heaviest, `funnelEngine.ts:1143`).
- **29 Tier B/C engines** lazy-activate via 4 trigger types: DATA_THRESHOLD (e.g. salesPipelineEngine at >=20 leads), TIME_IN_SYSTEM (retentionFlywheel at >=30 days), HEALTH_ANOMALY (bottleneck on -10 health delta), INTENT_SIGNAL (pricingWizard on keyword "price"). `src/engine/engineActivationRules.ts`.
- **ViewModel boundary** (`src/viewmodels/`): components import only from `@/viewmodels`, never `@/engine/*`. ESLint enforced globally; debt allowlist was cleared on 2026-05-06. Built so a backend swap (engine -> server call) does not touch UI files.
- **Wedge mode**: default `all` (`wedgeMode.ts:32`). Resolution order: localStorage -> `?wedge=` -> env -> default. Pricing-only ran briefly, today reverted. Hidden routes still render `LockedModuleScreen` and emit `wedge.locked_module_clicked` (phantom-interest).
- **Draft definition**: HITL only on the *irreversible* last step. Strategic draft = full Toulmin reasoning. Operative draft derives from the approved strategic one.

---

## Risks / Asks

**Top 3 risks**

- **Technical**: only Pricing fires `wedge.first_value_seen`. We cannot compare TTFV across modules. Adding it later is cheap, but every week without it is unmeasurable. `src/components/PricingIntelligenceTab.tsx:55`.
- **Product**: 3 of 5 modules (Sales, Pricing, Retention) hard-require a Wizard plan. If Wizard's value prop fails, the wedge collapses to Differentiate-only, and our "5 modules" pitch is overstated.
- **GTM**: Pricing-only wedge ran for days, not weeks. We reverted before the experiment had statistical power. We will be tempted to declare "pricing did not pull" without evidence.

**2 specific asks**

1. Help me decide: gate Sales/Retention behind real data thresholds (no plan -> no module), or keep heuristic previews to avoid empty-state friction? Bias toward which side?
2. Help me design a 3-week measurement plan that produces a defensible "next wedge" decision - including the smallest cohort that would actually convince *you*.

---

## What I would cut (forced ship-one-wedge)

If forced to ship a single wedge tomorrow, **I would sunset Sales and Retention** for v1 and ship Pricing + a stripped Differentiate.

- **Sales** is the most template-heavy and the least differentiated from "ask ChatGPT". Without real CRM data (`leadCount >= 20`), `salesPipelineEngine` is heuristic. The DISC + objection + WhatsApp combo is nice but not a wedge - it is a feature inside a fully populated CRM.
- **Retention** openly tells the user `"based on industry average; not your actual data"` (`RetentionGrowthTab.tsx:75-78`). Until we have real customer data flowing in, the surface is sophisticated wallpaper.
- **Pricing** is the only module with a real experiment loop (5 lifecycle events), genuine differentiation (Israeli cultural segments), and a derived (not asked) price. It survives the "would ChatGPT do this?" test.
- **Differentiate** is the only module that works cold (no plan dependency), and produces an artifact (the one-liner) the user can immediately ship outside our app.

Cutting Sales and Retention sharpens the v1 promise. Bring them back when there is data inside the system to make them non-trivial.
