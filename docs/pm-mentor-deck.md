# FunnelForge - PM Mentor Walkthrough

> Prepared 2026-05-06. Source-grounded; every claim traces to a code path.
> Wedge mode = `all` (reverted today from `pricing-only`). All 5 modules visible.

---

## ICP - who exactly we are building for

- **Primary**: Israeli SMB owner, 1-50 employees, runs marketing without an agency.
  - Universe: ~180K Israeli businesses with digital presence (`docs/market-research.md:7`).
  - Willing-to-pay segment: ~35K.
  - Spend baseline: ₪2,400/mo on marketing with zero measurement (D&B 2023).
  - 70% have no documented strategy (CBS 2024).
- **Secondary**: Israeli marketing consultants (~12K registered) creating plans for clients. Drives the consultant-reseller channel.
- **Cultural sub-segments hard-coded in Pricing**: mainstream, chareidi, dati-leumi, arab, russian, tech-b2b. `src/components/IsraeliPricingPsychologyCard.tsx:23-30`.
- **Why we win them**: Hebrew-native, WhatsApp-first send paths, Israeli holiday calendar in pricing timing. Competitors (HubSpot $800+, Glassix WhatsApp-only, Wix ADI no funnel) fail on at least one of: language, end-to-end coverage, price.

---

## Monetization - what we charge and where the gate sits

| Tier | Monthly | Annual (35% off) | Hard limits |
|---|---|---|---|
| Free | ₪0 | - | 3 funnels, 0 AI Coach msgs, 0 WhatsApp templates, no PDF, **Differentiation Agent yes** |
| Pro | ₪129/mo | ₪84/mo (₪1,008/yr), 14-day trial | unlimited funnels, 75 AI msgs + ₪2.50/overage, 10 WhatsApp/mo, PDF |
| Business | ₪299/mo | ₪194/mo (₪2,328/yr) | unlimited AI + WhatsApp, Campaign Cockpit, branded reports, 3 seats, priority support |

Source: `src/lib/pricingTiers.ts:82-177`.

- **Two ways to unlock features**: (1) pay; (2) `canAccessByData` - earn the feature by feeding the system data. `src/hooks/useFeatureGate.ts:24-30`. Progressive disclosure incentive orthogonal to payment.
- **Unit economics target** (per `docs/financials.md`): blended ARPU ₪136, churn 2.5%/mo, LTV ₪5K, CAC ₪200, LTV:CAC = 25x, payback 1.6 months.
- **Discrepancy I will flag live**: financials.md still lists ₪99/₪249. Code is canonical at ₪129/₪299. We need to pick one before any pricing-page experiment.

---

## AARRR pirate matrix - which module owns which stage

| Stage | Owner module | Key event(s) | Code |
|---|---|---|---|
| **Acquisition** | Public landing + UTM | `aarrr.acquisition.landing_view`, `signup_completed`, `utm_captured` | `src/components/PublicLanding.tsx`, `src/hooks/useUtmTracking.ts` |
| **Activation** | Wizard (north star), Differentiate (ladder), CRM (first lead) | `aarrr.activation.first_plan_generated` (target 25/wk), `archetype_revealed`, `aha_moment`, `first_lead_logged`, `first_template_copied` | `src/pages/Wizard.tsx:155-160`, `src/lib/analytics.ts:19-25` |
| **Retention** | Retention module + weekly loop | `aarrr.retention.weekly_active`, `pulse_opened`, `loop_continued`, `streak_broken`, `cadence_hint_shown` | `src/lib/analytics.ts:241-264` |
| **Revenue** | PaywallModal + tier gates | `aarrr.revenue.paywall_viewed`, `checkout_started`, `conversion_completed`, `upgrade` | `src/components/PaywallModal.tsx:30-35`, `src/hooks/useFeatureGate.ts` |
| **Referral** | Retention.referralBlueprint + share links | `aarrr.referral.share_created`, `signup_from_share`, `reward_earned` | `src/components/RetentionGrowthTab.tsx:184-207`, `src/lib/analytics.ts:66-70` |

North Star: `weekly_activated_plans` = trailing-7-day count of `first_plan_generated`. Target 25. `src/lib/analytics.ts:19-25`.

---

## Mechanism map - how the modules feed each other

Single spine: **`buildUserKnowledgeGraph(formData)`** consumed by every module body. `src/engine/userKnowledgeGraph.ts`.

Three storage keys carry state across modules:
- `funnelforge-plans` (Wizard output) -> read by Sales, Pricing, Retention as the gating dependency.
- `funnelforge-pricing-wizard-input` (`PRICING_WIZARD_STORAGE_KEY`) -> read by Retention to personalise saves. `src/engine/retentionPersonalizationContext.ts:38, 248`.
- `funnelforge-differentiation-result` (`DIFF_RESULT_STORAGE_KEY`) -> read by Sales for script personalisation, by Retention for context. Same file:39, 249.

Engine tiers:
- **10 Tier-S engines** run on every render via `useUserData` / direct calls (always-on).
- **29 Tier B/C engines** activate by 4 trigger types (DATA_THRESHOLD, TIME_IN_SYSTEM, HEALTH_ANOMALY, INTENT_SIGNAL). `src/engine/engineActivationRules.ts:50-167`.
- **Wedge gate** wraps each module route, blocks render if not in the active mode, fires `wedge.locked_module_clicked` as phantom-interest. `src/components/WedgeGuard.tsx:20-32`.
- **ViewModel boundary** (`src/viewmodels/`) is the only thing components import; engines stay swappable.

---

## Module-at-a-glance

| # | Module | Route | Hard dependency | AARRR primary | Tier-S engines used |
|---|---|---|---|---|---|
| 1 | Differentiate | `/differentiate` | none | Activation (ladder) | differentiationEngine |
| 2 | Wizard / Marketing | `/wizard` | Intake (optional) | **Activation (north star)** | funnelEngine, userKnowledgeGraph |
| 3 | Sales | `/sales` | Wizard plan | Activation (template copy) | discProfileEngine |
| 4 | Pricing | `/pricing` | Wizard plan | Revenue + Activation | (Tier B intent-gated) |
| 5 | Retention | `/retention` | Wizard plan | Retention + Referral | guidanceEngine, nextStepEngine |

---

## 1A. Differentiate - JTBD & ICP fit

- **JTBD**: When I prepare to launch or pitch, I want to articulate a defensible difference, so I can stop sounding like every competitor.
- **Persona slice**: founder / marketing lead in the 35K willing-to-pay segment, who has read positioning books but cannot pass "would a competitor say the same?".
- **ICP fit**: highest fit with tech-b2b and dati-leumi/mainstream segments. Lower fit with chareidi (less branding-led).
- **Done for the user**: a written claim, a numeric strength score (0-100), and a 7-narrative pack tailored to roles in a buying committee.
- Independent of Wizard. Only module callable cold (no plan required). `src/pages/Differentiate.tsx:46-58`.

---

## 1B. Differentiate - what it does + connections

- 5-phase wizard or `?mode=transcript` upload. Each phase calls Supabase Edge Function `differentiation-agent`. `src/components/DifferentiationWizard.tsx:60-115`.
- Synthesis returns `differentiationStrength` 0-100. Idle preview also runs synth from profile alone. `src/pages/Differentiate.tsx:101-110`.
- **Out**: writes to `funnelforge-differentiation-result` + Supabase `differentiation_results`. `src/hooks/useUserData.ts:59-86`.
- **In**: optional pre-fill from `profile.unifiedProfile` via `toDifferentiationPrefill`.
- **Downstream consumers**: Sales reads result for script personalisation (`SalesTab.tsx:39-41`), Retention reads it for context (`RetentionEntry.tsx:36`).
- **Real**: engine + 5 phases + persistence. **Scaffolded**: each AI call is a round-trip; failure path drops to local synth.

---

## 1C. Differentiate - AARRR + telemetry + monetization

- **AARRR**: Activation (a "ladder" event before first_plan_generated). Validation chain `differentiation.one_liner_generated -> copied -> edited -> use_case_selected -> external_use_committed -> followup_sent -> real_world_use_reported -> positive_signal_reported`. Negative: `not_mine_feedback`, `unclear_feedback`. `src/lib/analytics.ts:75-84`.
- **Monetization gate**: `differentiationAgent: true` on **all tiers** including Free. `src/lib/pricingTiers.ts:106, 138, 171`. The agent itself is not a paid feature; PDF export of the result is.
- **Data so far**: validation harness referenced at `evals/differentiation/uncertainty-ledger.md`. No aggregate visible in this checkout. State as "no data yet" to mentor.
- **Tier**: `differentiationEngine` is Tier S (always on per CLAUDE.md).

---

## 1D. Differentiate - open questions

1. Wizard takes ~10 min. Cut to phases 1+5 only for the `/oneliner` fake-door variant?
2. Score is a heuristic without external validation. Ship the number, or only qualitative output until we have ground truth?
3. Transcript mode is ~3 min. Should that be the default and the 5-phase wizard moved behind "first-time users"?
- **Bet we cannot yet falsify**: founders will sit through 10 min for differentiation more readily than for a generic plan.

---

## 2A. Wizard / Marketing - JTBD & ICP fit

- **JTBD**: When I have a vague marketing idea, I want a complete funnel plan in under 2 minutes, so I can act today.
- **Persona slice**: solopreneur or 1-10 employee SMB, paying for ads with no plan. The exact 70% per CBS 2024.
- **ICP fit**: universal across all 6 segments. The funnel is the entry point for anyone arriving from organic content.
- **Done for the user**: a saved plan visible at `/strategy/:planId`, hero copy regenerated, SEO meta-description draft.

---

## 2B. Wizard / Marketing - what it does + connections

- `SmartOnboarding -> generateFunnel(formData) -> personalizeResult(rawResult, graph)`. `src/pages/Wizard.tsx:125-164`.
- Side calls (Tier-S consumers): `predictContentScore`, `generateSEOContent`, `calculateEPS`, `archetype.updateFromBlackboard`.
- Hero copy: `runAgent` (multi-agent) -> `aiCopyService.generate` fallback. `src/pages/Wizard.tsx:90-123`.
- **Out**: `funnelforge-plans` localStorage + Supabase `plans` table. **The gating dependency for Sales, Pricing, Retention.**
- **In**: pre-fill from Intake via `mergeIntakePrefill`. `src/pages/Wizard.tsx:39-53`.
- **Real**: full generation, persistence, archetype reveal. **Scaffolded**: prompt-optimizer report fire-and-forget; `predictContentScore` runs but UI surfacing partial.

---

## 2C. Wizard / Marketing - AARRR + telemetry + monetization

- **AARRR**: Activation, owns the **north star** (`first_plan_generated` target 25/wk). Also fires `archetype_revealed`, `aha_moment`. `src/pages/Wizard.tsx:155-160`.
- **TTFV**: `safeSessionStorage.setJSON("funnelforge_ttfv_start", Date.now())` at onboarding-start, emitted as `ttfv_ms` on `first_plan_generated`. `src/lib/analytics.ts:218-228`. Baseline median = 12 minutes (`docs/business-baseline.md:21-24`); aspirational target per landing page = 2 min.
- **Monetization gate**: Free tier capped at 3 funnels (`maxFunnels: 3`). 4th funnel attempt -> PaywallModal -> Pro upgrade. `src/lib/pricingTiers.ts:98`. **This is the primary upgrade trigger today.**
- **Tier**: `funnelEngine` + `userKnowledgeGraph` are Tier S.

---

## 2D. Wizard / Marketing - open questions

1. `aha_moment` fires automatically on plan generation. Does that overstate vs. reality (looking at a plan != aha)?
2. Wizard is the only module where `Analytics.ahaMoment` fires. Should "OPP computed" (Pricing) or "synthesis returned" (Differentiate) also count?
3. Hero copy uses `runAgent` then falls back. We do not log which path produced the copy. Add `copy.path={agent|fallback}` before any next iteration?
- **Bet**: 2-min plan creates retention. We have no week-2 cohort to prove or disprove.

---

## 3A. Sales - JTBD & ICP fit

- **JTBD**: When I have a generated plan and a prospect on the line, I want a script tuned to *this* prospect's personality, so I do not freeze on the call.
- **Persona slice**: founder/sales rep mid-cycle with leads in CRM and a call this week. Strongest fit for the consultant-reseller secondary persona.
- **ICP fit**: tech-b2b and mainstream highest. Arab and russian segments under-served (no segment-specific scripts yet).
- **Done for the user**: copyable opening script, objection response, sendable WhatsApp/email - in under 30 seconds.

---

## 3B. Sales - what it does + connections

- Hard-gated on `funnelforge-plans`. Empty state pushes to `/wizard`. `src/pages/SalesEntry.tsx:27-42`.
- `SalesTab` composes: pipeline visualisation, KPI forecast (deals, AOV, win rate), objection scripts, neuro-closing (DISC-aware), QuoteBuilder. `src/components/SalesTab.tsx:46-52`.
- **In**: plan formData, `funnelforge-differentiation-result`, `funnelforge-stylome-voice`. Three-key fan-in.
- **Out**: `quotes` table on Supabase; `funnelforge-last-quote` localStorage. WhatsApp `wa.me` deep link, no native send.
- StaleLeadDraft generates re-engagement copy from `leadCoachEngine` and tracks `captureRecommendationShown`. `src/components/StaleLeadDraft.tsx:44-83`.
- **Real**: scripts, DISC profile, quote save, WhatsApp link. **Scaffolded**: `salesPipelineEngine` is Tier B (gate at leadCount >=20 per `engineActivationRules.ts:53-58`); pipeline shown to a new user is heuristic.

---

## 3C. Sales - AARRR + telemetry + monetization

- **AARRR**: Activation (`first_template_copied`, `first_lead_logged`). Indirect revenue lever via Quote save.
- **Telemetry**: `aarrr.activation.first_template_copied` exists with `channel`. `aarrr.activation.first_lead_logged`. **No `sales.*` namespace today.** WhatsApp send is currently fire-and-forget; Wedge 3 added a 48h reply prompt and `captureOutcome("navigated")`. `docs/wedge-progress.md` Wedge 3.
- **Monetization gate**: WhatsApp templates are quota-limited. Free=0/mo, Pro=10/mo, Business=unlimited. `src/lib/pricingTiers.ts:103, 135, 167`. **This is the second upgrade trigger after `maxFunnels`.**
- **Tier**: `salesPipelineEngine` Tier B (>=20 leads). `discProfileEngine` Tier S - DISC inference runs every load.

---

## 3D. Sales - open questions

1. Pipeline view runs even though gate says >=20 leads. Honour the gate ("needs data") or keep heuristic preview?
2. We have no event for "WhatsApp tap" or "quote saved". Ship `sales.whatsapp_sent` + `sales.quote_saved` before the next research round?
3. DISC inference runs on every load. Cache on the plan record once accepted?
- **Bet**: copyable DISC-tuned script outperforms a generic LLM script. Untested.

---

## 4A. Pricing - JTBD & ICP fit

- **JTBD**: When I do not know what to charge, I want a defensible price plus a way to test it on real prospects, so I stop guessing.
- **Persona slice**: service or product founder mid-sale, often quoting differently to each lead. Highest pain point in the ICP.
- **ICP fit**: **all 6 cultural segments handled explicitly**, including chareidi (interest framing) and arab (relationship-first). Only module where segment selection is a UI control. `IsraeliPricingPsychologyCard.tsx:23-30, 64-80`.
- **Done for the user**: a recommended optimal price (PSM midpoint adjusted for value/differentiators) plus a running experiment with logged outcomes.

---

## 4B. Pricing - what it does + connections

- 4-step wizard: Value (Hormozi DxT) -> Van Westendorp PSM -> Offer Architecture -> Revenue. `src/components/PricingWizard.tsx:200-647`.
- "We don't ask your price. We DERIVE it." `src/components/PricingWizard.tsx:9-11`.
- Israeli psychology layer: VAT framing, tashlumim split, hebrew-calendar timing, segment trust anchors. `analyzeIsraeliPricing` in `israeliPricingPsychologyEngine.ts`.
- **Experiment loop**: cohort n=5, log outcomes (`accepted_full`, `accepted_with_haggle`, `objected_price`, `objected_value`, `declined`, `ghosted`), analyse acceptance, propose next. `PricingExperimentLab.tsx:37-117`.
- **Out**: `funnelforge-pricing-wizard-input` (`PRICING_WIZARD_STORAGE_KEY`) read downstream by Retention. Persists derived `averagePrice` back to the plan. `src/pages/PricingEntry.tsx:32-46`.
- **Real**: full wizard, experiment loop with persisted cohort, segment-aware psychology. **Honestly differentiated**: the cultural-segment + experiment-loop combination is not "ask ChatGPT".

---

## 4C. Pricing - AARRR + telemetry + monetization

- **AARRR**: Revenue (drives upgrade narrative) + Activation (TTFV via `wedge.first_value_seen`).
- **Richest telemetry of any module**: `wedge.experiment_started`, `experiment_outcome_logged`, `experiment_completed` (`acceptance_rate`, `duration_ms`), `experiment_abandoned`, `next_experiment_started`. `src/lib/wedgeTelemetry.ts:84-177`.
- **Only module that fires `wedge.first_value_seen`** today. `src/components/PricingIntelligenceTab.tsx:55`.
- **Monetization gate**: PricingWizard itself is free. PDF export of the strategy is Pro+. AI-coach refinements consume `aiCoachMessages` quota.
- **Tier**: `pricingWizardEngine` is Tier B with INTENT_SIGNAL trigger - active on keyword "price/מחיר" or visit to `/pricing`. `src/engine/engineActivationRules.ts:131-138`.

---

## 4D. Pricing - open questions

1. Cohort n=5 has wide CIs. Raise to 10 (slower, less abandonment risk) or keep 5?
2. Israeli-segment defaults to `mainstream`. Ask explicitly during wizard, or infer from `formData.audienceType`?
3. `wedge.experiment_*` events are pricing-specific. If we run a non-pricing wedge later, generalise the schema or fork?
- **Bet**: founders will log 5 real-prospect outcomes in a row. Drop-off after 1-2 may dominate.

---

## 5A. Retention - JTBD & ICP fit

- **JTBD**: When customers go quiet, I want a structured response (onboarding template, churn signal, save offer), so I am not improvising re-engagement.
- **Persona slice**: SaaS or services owner with churn pain, not yet sophisticated enough to build a CRM workflow.
- **ICP fit**: highest fit with subscription/recurring businesses (matches `salesModel === "subscription"` branch in PricingWizard).
- **Done for the user**: 30-day onboarding sequence with copyable templates, churn-signal map, referral WhatsApp template ready to send.

---

## 5B. Retention - what it does + connections

- Hard-gated on plan. `src/pages/RetentionEntry.tsx:71-80`.
- `generateRetentionStrategy` fan-in: plan formData + DISC profile + pricing wizard input + differentiation result, all merged via `buildRetentionContext`. `src/pages/RetentionEntry.tsx:32-39`. **Most-personalised module - reads three storage keys.**
- Surfaces: onboarding timeline (per day, per channel, per template), churn signals (risk tier + intervention), referral blueprint with WhatsApp template, growth loop, loyalty tiers, retention triggers. `RetentionGrowthTab.tsx:62-280`.
- **Real**: full surface renders with copyable templates. **Honest caveat in code**: `confidence="needs_data"` and `"Based on industry average; not your actual data"`. `RetentionGrowthTab.tsx:74-78`. Until live customer data lands, output is industry-average wallpaper.

---

## 5C. Retention - AARRR + telemetry + monetization

- **AARRR**: Retention (`weekly_active`, `streak_broken`, `pulse_opened`, `loop_continued`, `cadence_hint_shown`) + Referral (`share_created`, `reward_earned`).
- **Telemetry gap**: no `retention.template_copied` event. The Copy button on each onboarding step is silent. `RetentionGrowthTab.tsx:136-138`.
- **Monetization gate**: Campaign Cockpit (advanced retention tracking) is Business-only. `campaignCockpit: true` on Business, false elsewhere. `src/lib/pricingTiers.ts:169`. **This is the upgrade trigger from Pro to Business.**
- **Tier**: `retentionFlywheelEngine` Tier B (TIME_IN_SYSTEM >=30 days). `churnPlaybookEngine` Tier B (intent: visit `/retention` or churn keywords). `engineActivationRules.ts:80-85, 158-167`.

---

## 5D. Retention - open questions

1. Module renders for users with 0 customers. Gate behind "has at least one logged customer" so output is not pure boilerplate?
2. Churn Playbook tab and the entry surface both show churn signals. Redundant?
3. Templates are copy-pasteable but silent. Wire `retention.onboarding_step_copied` per step?
- **Bet**: surfacing churn signals before churn drives action. Untestable until users have churn data inside the tool.

---

## Cross-module: engines, ViewModel boundary, wedge mode

- **10 Tier-S engines** (always on): userKnowledgeGraph, funnelEngine, differentiationEngine, discProfileEngine, healthScoreEngine, guidanceEngine, behavioralActionEngine, gapEngine, costOfInactionEngine, nextStepEngine. Cost dominated by `funnelEngine` (`funnelEngine.ts:1143`).
- **29 Tier B/C** lazy-activated via 4 trigger types. Pricing wizard activates on keyword OR visit; salesPipeline at >=20 leads; retentionFlywheel at >=30 days; bottleneck on -10 health delta.
- **ViewModel boundary**: components import only `@/viewmodels`. ESLint enforced; debt allowlist cleared 2026-05-06. Lets us swap engine -> server call without touching UI.
- **Wedge mode**: default `all`, resolution localStorage -> `?wedge=` -> env -> default. Locked routes still fire `wedge.locked_module_clicked` (phantom interest). `src/lib/wedgeMode.ts:71-73`.
- **Draft definition**: HITL only on the irreversible last step. Strategic draft = Toulmin reasoning. Operative draft derives from approved strategic.

---

## Risks and what I will fix this week (no hand-waving)

| # | Risk | Code symptom | Fix | Cost |
|---|---|---|---|---|
| 1 | TTFV measured for Pricing only | only `PricingIntelligenceTab.tsx:55` calls `trackFirstValueSeen` | add 4 calls: `Differentiate.tsx` (post-synthesis), `Wizard.tsx` (post-`first_plan_generated`), `SalesTab.tsx` (first script render), `RetentionGrowthTab.tsx` (first template render) | ~4 LOC + 1 test |
| 2 | Plan completion is `STRUCTURALLY_UNMEASURABLE` | no `aarrr.activation.intake_completed` event; `business-baseline.md:33-36` | add event + fire in `Intake.tsx` submit; aggregate in `/admin/aarrr` | ~10 LOC |
| 3 | D7/D30 retention = 0% (no aggregator) | `Analytics.weeklyActive` fires but never rolls up; `business-baseline.md:28-31` | nightly Supabase RPC counting distinct user_ids in `event_queue` per day -> retention table | ~30 LOC SQL + 1 cron |
| 4 | Pricing inconsistency | `pricingTiers.ts` (₪129/₪299) vs `docs/financials.md:11-14` (₪99/₪249) | choose canonical source; either edit financials.md or change tier prices; align landing page | doc fix or 6 LOC |
| 5 | Hard dependency chain (3/5 modules need plan) | `SalesEntry.tsx:27-42`, `PricingEntry.tsx:109-123`, `RetentionEntry.tsx:71-80` all empty-state to `/wizard` | decision needed: gate engines too (honest empty state) vs. show heuristic preview (current) | product call, not code |
| 6 | Data-gate may cannibalise revenue | `useFeatureGate.ts:25` lets `canAccessByData` bypass payment | A/B test data-gate ON vs. OFF over the next cohort; measure paywall_viewed -> upgrade ratio | flag + 1 experiment |
| 7 | No `sales.*` or `retention.template_copied` events | silent Copy buttons in `SalesTab.tsx:300-307` and `RetentionGrowthTab.tsx:136-138` | add 2 typed events; wire to existing `Analytics.firstTemplateCopied` so first-copy already lands in AARRR | ~6 LOC |

Risks 1, 2, 3, 7 are **all instrumentation**. Doing them in one PR closes the measurement gap before any next pricing experiment.

---

## Asks of the mentor

1. Help me decide: gate Sales/Retention behind real data thresholds (no plan -> no module), or keep heuristic previews to avoid empty-state friction? Bias toward which side?
2. Help me design a 3-week measurement plan that produces a defensible "next wedge" decision - including the smallest cohort that would actually convince *you*. Reference: Pricing-only ran days, not weeks; we cannot conclude.

---

## What I would cut (forced ship-one-wedge)

If forced to ship a single wedge, **I would sunset Sales and Retention for v1** and ship Pricing + a stripped Differentiate.

- **Sales** is the most template-heavy and least differentiated from "ask ChatGPT". Without `leadCount >= 20` real CRM data, `salesPipelineEngine` is heuristic. The DISC + objection + WhatsApp combo is a feature inside a populated CRM, not a wedge by itself.
- **Retention** openly tells the user `"based on industry average; not your actual data"` (`RetentionGrowthTab.tsx:75-78`). Until customer data flows in, the surface is sophisticated wallpaper.
- **Pricing** is the only module with: real experiment loop (5 lifecycle events), genuine differentiation (6 cultural segments + Hebrew-calendar timing), derived (not asked) price, and Revenue-stage AARRR ownership.
- **Differentiate** works cold (no plan dependency), produces an artifact (the one-liner) shippable outside the app, and is on every tier including Free - acquisition-friendly.

Cutting Sales and Retention sharpens the v1 promise: "derive your price, articulate your difference, in Hebrew, in one session." Bring Sales and Retention back when there is data inside the system to make them non-trivial.
