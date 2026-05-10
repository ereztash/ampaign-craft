# FunnelForge - PM Mentor Walkthrough

> Prepared 2026-05-06. Source-grounded; every claim traces to a code path.
> Wedge mode = `all` (reverted today from `pricing-only`). All 5 modules visible.

---

## Reality check before we go deep

- **Stage**: private beta. **No paying users yet.** All unit economics are modeled, not observed. `README.md:277`.
- **Target**: 50 paying users by end of Q2 2026 (we are mid-Q2 right now). `README.md:259`.
- **Founder**: solo. Erez is the only human committer. 98 commits authored by Claude Code, 52 by Erez, 5 dependabot. `git shortlog`.
- **Velocity**: hours, not days. Today (2026-05-06) the wedge default was flipped to pricing-only, hit a safeStorage runtime crash in prod, was patched, and reverted to "all" - 6 PRs merged in one day.
- **Runway**: ₪350K seed ask = 18-month runway to ₪1M ARR trigger. Currently un-funded; founder is bootstrapping. `docs/financials.md:67`.
- **Codebase scale (after today's README fix)**: 128 engines (top-level + subdirs), 185 components (incl. `ui/`), 36 pages, 29 edge functions (excl. `_shared`), 51 migrations. README + consistency SOT now aligned. `npm run consistency` exits clean.
- **Public-beta promised Q2 2026**: README still says "live demo pending public-beta release Q2 2026" while we *are* in Q2. Either we ship the beta in weeks, or that line moves.

---

## What "pricing-only" actually was - the timeline

Same-day events, May 6 2026 (today):

1. `6cd48c9` feat(pricing): wedge mode + Israeli psychology + experiment loop. Code merged.
2. `2841855` feat(wedge): hide+learn mode - pricing-only with phantom-interest telemetry.
3. `5cf15d2` chore(wedge): flip default to pricing-only. **Pricing-only goes live.**
4. `3c46298` fix(wedge): use correct safeStorage API (runtime crash on prod). **Production was broken.**
5. `4037d3a` fix(storage): legacy safeStorage misuses across the app.
6. `2e4aee5` chore(wedge): revert default to "all". **Pricing-only is reverted same day.**

Honest read: pricing-only ran for **hours** under a partial production outage. We have **no usable signal** from it. CLAUDE.md says "previous pricing-only run" - the run was too short and too broken to count. Treat the wedge experiment as not yet run.

---

## What's shipped that is NOT in the 5 modules

A parallel workstream on `claude/improve-app-utility-l9ps6` shipped 7 CRM/WhatsApp utility wedges (May 3 timeframe). Not in the wedge-mode flag system. Always-on:

| # | Wedge | What changed | File |
|---|---|---|---|
| 1 | WhatsApp defaultPhone | direct-send when phone valid; outcome captured | `WhatsAppSendButton.tsx` |
| 2 | StaleLeadDraft | re-engagement copy auto-generated from `leadCoachEngine` | `StaleLeadDraft.tsx` (new) |
| 3 | OutreachReplyPrompt | 48h reply prompt; engine learns from `priorOutcomes` | `OutreachReplyPrompt.tsx` (new) |
| 4 | AddLead split | 11 fields -> 3 fields; progressive disclosure to LeadDetail | `CrmPage.tsx:148` |
| 5 | TimeToValueBadge | one-time celebratory banner from `feedbackLoop` telemetry | `TimeToValueBadge.tsx` (new) |
| 6 | Intake pre-fill | mainGoal/budget/stuck-point inferred into Wizard | `profilePrefill.ts` (new) |
| 7 | ChannelROIStrip | gated on >=5 closed leads + >=2 sources | `ChannelROIStrip.tsx` (new) |

These touch the CRM, not the 5 modules. **Mentor implication**: the deck-level "5 modules" abstraction hides where most recent shipping happened.

---

## Cost structure - what we pay per user

3-tier LLM router. Costs from `src/services/llmRouter.ts:52-54`:

| Tier | Model | Per 1k tokens | Use case |
|---|---|---|---|
| Fast | claude-haiku-4-5 | $0.003 | classification, scoring, telemetry |
| Standard | claude-sonnet-4-6 | $0.015 | copy generation, agent calls |
| Deep | claude-opus-4-6 | $0.075 | differentiation synthesis, executive briefs |

Founder's claim (`README.md:214`): "$0.04/generation, 10 plans/month -> ~$0.40 in AI < 1% of ARPU." **Unverified.** Reconciliation against Anthropic billing pending paid-tier launch.

**Server-side cost telemetry gap**: `/admin/llm-cost` is **localStorage-only** ("not server-side telemetry" per `AdminLLMCost.tsx:97`). We literally cannot see real cost-per-user across users today.

Other infra: Supabase (Auth + Postgres + 30 Edge Functions + RLS), GA4, no paid acquisition. Seed allocates ₪60K to 12 months of cloud at 500 paying users.

---

## ICP - who exactly we are building for

- **Primary**: Israeli SMB owner, 1-50 employees, runs marketing without an agency.
  - Universe: ~180K Israeli businesses with digital presence (`docs/market-research.md:7`).
  - Willing-to-pay segment: ~35K.
  - Spend baseline: ₪2,400/mo on marketing with zero measurement (D&B 2023).
  - 70% have no documented strategy (CBS 2024).
- **Secondary**: Israeli marketing consultants (~12K registered) creating plans for clients - drives the consultant-reseller channel.
- **6 cultural sub-segments hard-coded in Pricing**: mainstream, chareidi, dati-leumi, arab, russian, tech-b2b. `src/components/IsraeliPricingPsychologyCard.tsx:23-30`.
- **Why we win**: Hebrew-native, WhatsApp-first send paths, Israeli holiday calendar in pricing timing.
- **Real competitor (per `README.md`)**: not HubSpot. **Powerlink/Fireberry** (Hebrew CRM + active AI investment), 12-24 months to close gap. Also: the ₪200/mo DIY stack (Mailchimp + Canva + Sheets) and ₪3K-8K/mo agencies.

---

## Monetization - what we charge and where the gate sits

| Tier | Monthly | Annual (35% off) | Hard limits |
|---|---|---|---|
| Free | ₪0 | - | 3 funnels, 0 AI Coach msgs, 0 WhatsApp templates, no PDF, **Differentiation Agent yes** |
| Pro | ₪129/mo | ₪84/mo (₪1,008/yr), 14-day trial | unlimited funnels, 75 AI msgs + ₪2.50/overage, 10 WhatsApp/mo, PDF |
| Business | ₪299/mo | ₪194/mo (₪2,328/yr) | unlimited AI + WhatsApp, Campaign Cockpit, branded reports, 3 seats, priority support |

Source: `src/lib/pricingTiers.ts:82-177`.

- **Two unlock paths**: pay, or `canAccessByData` - earn the feature by feeding the system data. `src/hooks/useFeatureGate.ts:24-30`. Progressive-disclosure incentive orthogonal to payment.
- **Modeled unit economics** (`docs/financials.md`, all unobserved): ARPU ₪136, churn 2.5%, LTV ₪5K, CAC ₪200, LTV:CAC = 25x, payback 1.6 months, gross margin ~78%.
- **Pricing alignment fixed today**: README + consistency SOT (`scripts/consistency/lib/sot-providers.ts`) now match `pricingTiers.ts` at ₪129/₪299/35%. `docs/financials.md` still shows the old ₪99/₪249/20% and is the next doc to align (lower urgency, internal financial planning doc).

---

## AARRR pirate matrix - which module owns which stage

| Stage | Owner module | Key event(s) | Code |
|---|---|---|---|
| **Acquisition** | Public landing + UTM | `aarrr.acquisition.landing_view`, `signup_completed`, `utm_captured` | `src/components/PublicLanding.tsx`, `src/hooks/useUtmTracking.ts` |
| **Activation** | Wizard (north star), Differentiate (ladder), CRM (first lead) | `aarrr.activation.first_plan_generated` (target 25/wk), `archetype_revealed`, `aha_moment`, `first_lead_logged`, `first_template_copied` | `src/pages/Wizard.tsx:155-160`, `src/lib/analytics.ts:19-25` |
| **Retention** | Retention module + weekly loop | `weekly_active`, `pulse_opened`, `loop_continued`, `streak_broken`, `cadence_hint_shown` | `src/lib/analytics.ts:241-264` |
| **Revenue** | PaywallModal + tier gates | `paywall_viewed`, `checkout_started`, `conversion_completed`, `upgrade` | `src/components/PaywallModal.tsx:30-35`, `src/hooks/useFeatureGate.ts` |
| **Referral** | Retention.referralBlueprint + share links | `share_created`, `signup_from_share`, `reward_earned` | `src/components/RetentionGrowthTab.tsx:184-207`, `src/lib/analytics.ts:66-70` |

North Star: `weekly_activated_plans` = trailing-7-day count of `first_plan_generated`. Target 25. `src/lib/analytics.ts:19-25`. **Today's actual: unknown** (private beta).

---

## Mechanism map - how the modules feed each other

Single spine: **`buildUserKnowledgeGraph(formData)`** consumed by every module body. `src/engine/userKnowledgeGraph.ts`.

Three storage keys carry state across modules:
- `funnelforge-plans` (Wizard output) -> read by Sales, Pricing, Retention as the gating dependency.
- `funnelforge-pricing-wizard-input` (`PRICING_WIZARD_STORAGE_KEY`) -> read by Retention. `src/engine/retentionPersonalizationContext.ts:38, 248`.
- `funnelforge-differentiation-result` (`DIFF_RESULT_STORAGE_KEY`) -> read by Sales for script personalisation, by Retention for context. Same file:39, 249.

Engine tiers:
- **10 Tier-S engines** run on every render via `useUserData` / direct calls (always-on).
- **29 Tier B/C engines** activate by 4 trigger types (DATA_THRESHOLD, TIME_IN_SYSTEM, HEALTH_ANOMALY, INTENT_SIGNAL). `src/engine/engineActivationRules.ts:50-167`.
- **Wedge gate** wraps each module route, blocks render if not in active mode, fires `wedge.locked_module_clicked` as phantom-interest. `src/components/WedgeGuard.tsx:20-32`.
- **ViewModel boundary** (`src/viewmodels/`) is the only thing components import; engines stay swappable.
- **InsightActionCard pattern** (per `README:43-55`): every recommendation is ANSWER -> WHY -> CONFIDENCE -> USE IT -> CHECK. HITL only on the irreversible last step.

---

## The honest moat (and what we admit it isn't)

Per `README.md` and verified in code:
- **Romaniuk DBA color system**: each archetype has a distinct palette. `calendarPaletteEngine.ts` reads `hebrew-calendar-2026.json` (12 events) and modulates `--cor-opportunity` and `--cor-success` HSL tokens at runtime. ~200 runtime data points per archetype variant.
- **6 self-correcting data loops**: pricing validation, archetype correction, framework ranking, churn calibration, benchmark replacement, prompt-patch TTL. Compounds with each paying customer.
- **Hebrew cultural embedding**: gendered copy, Israeli market calendar, RTL-first, WhatsApp-native sequences. Structural, not cosmetic.

**What is NOT a moat (be honest)**:
- The funnel scaffold in Wizard - any LLM app can build that.
- The hero copy generation - that is just an LLM call.
- The DISC profile inference - well-known framework.
- The "5 modules" framing - several modules are wallpaper until real data arrives.

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
- **ICP fit**: highest with tech-b2b and dati-leumi/mainstream. Lower with chareidi (less branding-led).
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

- **AARRR**: Activation ladder. Validation chain `differentiation.one_liner_generated -> copied -> edited -> use_case_selected -> external_use_committed -> followup_sent -> real_world_use_reported -> positive_signal_reported`. Negative: `not_mine_feedback`, `unclear_feedback`. `src/lib/analytics.ts:75-84`.
- **Monetization gate**: `differentiationAgent: true` on **all tiers** including Free. The agent itself is not a paid feature; PDF export of the result is.
- **Data so far**: validation harness referenced at `evals/differentiation/uncertainty-ledger.md`. No aggregate visible. **No data yet** is the honest answer.
- **Tier**: `differentiationEngine` is Tier S (always on per CLAUDE.md).

---

## 1D. Differentiate - open questions

1. Wizard takes ~10 min. Cut to phases 1+5 only for the `/oneliner` fake-door variant?
2. Score is heuristic without external validation. Ship the number, or only qualitative output until ground truth?
3. Transcript mode is ~3 min. Default to that, move the 5-phase behind "first-time users"?
- **Bet we cannot yet falsify**: founders will sit through 10 min for differentiation more readily than for a generic plan.

---

## 2A. Wizard / Marketing - JTBD & ICP fit

- **JTBD**: When I have a vague marketing idea, I want a complete funnel plan in under 2 minutes, so I can act today.
- **Persona slice**: solopreneur or 1-10 employee SMB, paying for ads with no plan. The 70% per CBS 2024.
- **ICP fit**: universal across all 6 cultural segments. The funnel is the entry point.
- **Done for the user**: a saved plan visible at `/strategy/:planId`, hero copy regenerated, SEO meta-description draft.

---

## 2B. Wizard / Marketing - what it does + connections

- `SmartOnboarding -> generateFunnel(formData) -> personalizeResult(rawResult, graph)`. `src/pages/Wizard.tsx:125-164`.
- Side calls (Tier-S consumers): `predictContentScore`, `generateSEOContent`, `calculateEPS`, `archetype.updateFromBlackboard`.
- Hero copy: `runAgent` (multi-agent) -> `aiCopyService.generate` fallback. `src/pages/Wizard.tsx:90-123`.
- **Out**: `funnelforge-plans` localStorage + Supabase `plans` table. **The gating dependency for Sales, Pricing, Retention.**
- **In**: pre-fill from Intake via `mergeIntakePrefill`. `src/pages/Wizard.tsx:39-53`. (Wedge 6 from the parallel CRM workstream.)
- **Real**: full generation, persistence, archetype reveal. **Scaffolded**: prompt-optimizer fire-and-forget; `predictContentScore` runs but UI surfacing partial.

---

## 2C. Wizard / Marketing - AARRR + telemetry + monetization

- **AARRR**: Activation, owns the **north star** (`first_plan_generated` target 25/wk). Also fires `archetype_revealed`, `aha_moment`. `src/pages/Wizard.tsx:155-160`.
- **TTFV**: `funnelforge_ttfv_start` set at onboarding-start, `ttfv_ms` emitted on `first_plan_generated`. `src/lib/analytics.ts:218-228`. Baseline median = 12 minutes (`docs/business-baseline.md:21-24`); marketing claim = 2 minutes. **6x gap between claim and observation.**
- **Monetization gate**: Free capped at 3 funnels (`maxFunnels: 3`). 4th funnel -> PaywallModal -> Pro upgrade. `src/lib/pricingTiers.ts:98`. **Primary upgrade trigger today.**
- **Tier**: `funnelEngine` + `userKnowledgeGraph` are Tier S.

---

## 2D. Wizard / Marketing - open questions

1. `aha_moment` fires automatically on plan generation. Does that overstate vs. reality (looking at a plan != aha)?
2. Wizard is the only module where `Analytics.ahaMoment` fires. Should "OPP computed" (Pricing) or "synthesis returned" (Differentiate) also count?
3. Hero copy uses `runAgent` then falls back. We do not log which path produced the copy. Add `copy.path={agent|fallback}` before any next iteration?
- **Bet**: 2-min plan creates retention. We have no week-2 cohort to prove or disprove.

---

## 3A. Sales - JTBD & ICP fit

- **JTBD**: When I have a generated plan and a prospect on the line, I want a script tuned to *this* prospect's personality, so I do not freeze.
- **Persona slice**: founder/sales rep mid-cycle with leads in CRM and a call this week. Strongest fit for the consultant-reseller secondary.
- **ICP fit**: tech-b2b and mainstream highest. Arab and russian segments under-served (no segment-specific scripts yet).
- **Done for the user**: copyable opening script, objection response, sendable WhatsApp/email - in under 30 seconds.

---

## 3B. Sales - what it does + connections

- Hard-gated on `funnelforge-plans`. Empty state pushes to `/wizard`. `src/pages/SalesEntry.tsx:27-42`.
- `SalesTab` composes: pipeline visualisation, KPI forecast (deals, AOV, win rate), objection scripts, neuro-closing (DISC-aware), QuoteBuilder. `src/components/SalesTab.tsx:46-52`.
- **In**: plan formData, `funnelforge-differentiation-result`, `funnelforge-stylome-voice`. Three-key fan-in.
- **Out**: `quotes` table on Supabase; `funnelforge-last-quote` localStorage. WhatsApp `wa.me` deep link, no native send.
- StaleLeadDraft (Wedge 2) generates re-engagement copy from `leadCoachEngine`; `captureRecommendationShown` records it. `src/components/StaleLeadDraft.tsx:44-83`.
- **Real**: scripts, DISC, quote save, WhatsApp link. **Scaffolded**: `salesPipelineEngine` is Tier B (gate at leadCount >=20 per `engineActivationRules.ts:53-58`); pipeline shown to a new user is heuristic.

---

## 3C. Sales - AARRR + telemetry + monetization

- **AARRR**: Activation (`first_template_copied`, `first_lead_logged`). Indirect revenue lever via Quote save.
- **Telemetry**: `aarrr.activation.first_template_copied` exists. `first_lead_logged`. **No `sales.*` namespace today.** WhatsApp send via `captureOutcome("navigated")` (Wedge 3); no `sales.whatsapp_sent` event.
- **Monetization gate**: WhatsApp templates quota - Free=0/mo, Pro=10/mo, Business=unlimited. `src/lib/pricingTiers.ts:103, 135, 167`. **Second upgrade trigger after `maxFunnels`.**
- **Tier**: `salesPipelineEngine` Tier B (>=20 leads). `discProfileEngine` Tier S.

---

## 3D. Sales - open questions

1. Pipeline view runs even though gate says >=20 leads. Honour the gate or keep heuristic preview?
2. No event for "WhatsApp tap" or "quote saved". Ship `sales.whatsapp_sent` + `sales.quote_saved` before next research round?
3. DISC inference runs on every load. Cache on the plan record once accepted?
- **Bet**: copyable DISC-tuned script outperforms generic LLM script. Untested.

---

## 4A. Pricing - JTBD & ICP fit

- **JTBD**: When I do not know what to charge, I want a defensible price plus a way to test it on real prospects, so I stop guessing.
- **Persona slice**: service or product founder mid-sale, often quoting differently to each lead. Highest-pain ICP.
- **ICP fit**: **all 6 cultural segments handled explicitly**. Only module where segment selection is a UI control. `IsraeliPricingPsychologyCard.tsx:23-30, 64-80`.
- **Done for the user**: a recommended optimal price (PSM midpoint adjusted for value/differentiators) plus a running experiment with logged outcomes.

---

## 4B. Pricing - what it does + connections

- 4-step wizard: Value (Hormozi DxT) -> Van Westendorp PSM -> Offer Architecture -> Revenue. `src/components/PricingWizard.tsx:200-647`.
- "We don't ask your price. We DERIVE it." `src/components/PricingWizard.tsx:9-11`.
- Israeli psychology layer: VAT framing, tashlumim split, hebrew-calendar timing, segment trust anchors. `analyzeIsraeliPricing`.
- **Experiment loop**: cohort n=5, log outcomes (`accepted_full`, `accepted_with_haggle`, `objected_price`, `objected_value`, `declined`, `ghosted`), analyse acceptance, propose next. `PricingExperimentLab.tsx:37-117`.
- **Out**: `PRICING_WIZARD_STORAGE_KEY` read by Retention. Persists derived `averagePrice` back to the plan. `src/pages/PricingEntry.tsx:32-46`.
- **Real**: full wizard, experiment loop, segment-aware psychology. **Genuinely differentiated**: cultural-segment + experiment-loop combination is not "ask ChatGPT".

---

## 4C. Pricing - AARRR + telemetry + monetization

- **AARRR**: Revenue narrative + Activation (TTFV).
- **Richest telemetry of any module**: `wedge.experiment_started`, `experiment_outcome_logged`, `experiment_completed`, `experiment_abandoned`, `next_experiment_started`. `src/lib/wedgeTelemetry.ts:84-177`.
- **Only module that fires `wedge.first_value_seen`** today. `src/components/PricingIntelligenceTab.tsx:55`.
- **Monetization gate**: PricingWizard itself is free. PDF export of the strategy is Pro+. AI-coach refinements consume `aiCoachMessages`.
- **Tier**: `pricingWizardEngine` Tier B with INTENT_SIGNAL trigger - active on keyword "price/מחיר" or visit to `/pricing`. `src/engine/engineActivationRules.ts:131-138`.

---

## 4D. Pricing - open questions

1. Cohort n=5 has wide CIs. Raise to 10 (slower, less abandonment) or keep 5?
2. Israeli-segment defaults to `mainstream`. Ask in wizard, or infer from `formData.audienceType`?
3. `wedge.experiment_*` events are pricing-specific. Generalise the schema for other wedges, or fork?
- **Bet**: founders log 5 real-prospect outcomes in a row. Drop-off after 1-2 may dominate.

---

## 5A. Retention - JTBD & ICP fit

- **JTBD**: When customers go quiet, I want a structured response (onboarding template, churn signal, save offer), so I am not improvising.
- **Persona slice**: SaaS or services owner with churn pain, not yet sophisticated enough to build a CRM workflow.
- **ICP fit**: highest with subscription/recurring (matches `salesModel === "subscription"` branch in PricingWizard).
- **Done for the user**: 30-day onboarding sequence with copyable templates, churn-signal map, referral WhatsApp template ready to send.

---

## 5B. Retention - what it does + connections

- Hard-gated on plan. `src/pages/RetentionEntry.tsx:71-80`.
- `generateRetentionStrategy` fan-in: plan formData + DISC profile + pricing wizard input + differentiation result, all merged via `buildRetentionContext`. `src/pages/RetentionEntry.tsx:32-39`. **Most-personalised module - reads three storage keys.**
- Surfaces: onboarding timeline (per day, per channel, per template), churn signals, referral blueprint with WhatsApp template, growth loop, loyalty tiers, retention triggers. `RetentionGrowthTab.tsx:62-280`.
- **Real**: full surface renders. **Honest caveat in code**: `confidence="needs_data"` and `"Based on industry average; not your actual data"`. `RetentionGrowthTab.tsx:74-78`. Until live customer data, output is industry-average wallpaper.

---

## 5C. Retention - AARRR + telemetry + monetization

- **AARRR**: Retention (`weekly_active`, `streak_broken`, `pulse_opened`, `loop_continued`, `cadence_hint_shown`) + Referral (`share_created`, `reward_earned`).
- **Telemetry gap**: no `retention.template_copied` event. Copy buttons on each onboarding step are silent. `RetentionGrowthTab.tsx:136-138`.
- **Monetization gate**: Campaign Cockpit (advanced retention tracking) is Business-only. `src/lib/pricingTiers.ts:169`. **Pro -> Business upgrade trigger.**
- **Tier**: `retentionFlywheelEngine` Tier B (TIME_IN_SYSTEM >=30 days). `churnPlaybookEngine` Tier B (intent: visit `/retention`).

---

## 5D. Retention - open questions

1. Module renders for users with 0 customers. Gate behind "has at least one logged customer"?
2. Churn Playbook tab and entry surface both show churn signals. Redundant?
3. Templates are silent on copy. Wire `retention.onboarding_step_copied` per step?
- **Bet**: surfacing churn signals before churn drives action. Untestable until users have churn data inside the tool.

---

## Cross-module: engines, ViewModel boundary, wedge mode

- **10 Tier-S engines** always on: userKnowledgeGraph, funnelEngine, differentiationEngine, discProfileEngine, healthScoreEngine, guidanceEngine, behavioralActionEngine, gapEngine, costOfInactionEngine, nextStepEngine. Cost dominated by `funnelEngine`.
- **29 Tier B/C** lazy-activated via 4 trigger types. Pricing wizard activates on keyword OR visit; salesPipeline at >=20 leads; retentionFlywheel at >=30 days; bottleneck on -10 health delta.
- **ViewModel boundary**: components import only `@/viewmodels`. ESLint enforced; debt allowlist cleared 2026-05-06. Lets us swap engine -> server call without touching UI.
- **Wedge mode**: default `all`, resolution localStorage -> `?wedge=` -> env -> default. Locked routes still fire `wedge.locked_module_clicked` (phantom interest). `src/lib/wedgeMode.ts:71-73`.
- **Draft definition**: HITL only on the irreversible last step.

---

## Risks and what I will fix this week (no hand-waving)

| # | Risk | Code symptom | Fix | Cost |
|---|---|---|---|---|
| 1 | TTFV measured for Pricing only | only `PricingIntelligenceTab.tsx:55` calls `trackFirstValueSeen` | add 4 calls: Differentiate, Wizard, Sales, Retention | ~4 LOC + 1 test |
| 2 | Plan completion = `STRUCTURALLY_UNMEASURABLE` | no `aarrr.activation.intake_completed` event; `business-baseline.md:33-36` | add event + fire in `Intake.tsx` submit | ~10 LOC |
| 3 | D7/D30 retention = 0% (no aggregator) | `Analytics.weeklyActive` fires but never rolls up; `business-baseline.md:28-31` | nightly Supabase RPC counting distinct user_ids in `event_queue` per day | ~30 LOC SQL + 1 cron |
| 4 | LLM cost is browser-side only | `AdminLLMCost.tsx:97` "not server-side telemetry" | mirror llmRouter usage to a Supabase `llm_usage` table; aggregate in admin | ~50 LOC + migration |
| 5 | Pricing inconsistency | ~~code ₪129/₪299; `financials.md` ₪99/₪249; `README.md` ₪99/₪249~~ **FIXED today**: README + SOT aligned to code. `docs/financials.md` remains old (lower urgency) | done in this PR |
| 6 | Hard dependency chain (3/5 modules need plan) | `SalesEntry.tsx:27-42`, `PricingEntry.tsx:109-123`, `RetentionEntry.tsx:71-80` | decision: gate engines too vs. heuristic preview (current) | product call |
| 7 | Data-gate may cannibalise revenue | `useFeatureGate.ts:25` `canAccessByData` bypasses payment | A/B test data-gate ON vs OFF; measure paywall_viewed -> upgrade | flag + 1 experiment |
| 8 | No `sales.*` or `retention.template_copied` events | silent Copy buttons in `SalesTab.tsx:300-307` and `RetentionGrowthTab.tsx:136-138` | add 2 typed events | ~6 LOC |
| 9 | README drift | claims 126/181/29; actual 128/185/29 (post-fix) | **FIXED today**: README aligned, `npm run consistency` clean | done in this PR |

Risks 1, 2, 3, 4, 8 are **all instrumentation**. Single PR closes the measurement gap before any next experiment.

---

## Decisions I need from this meeting (not "general feedback")

1. **Beta launch decision**: ship public beta in <30 days at the current 5-module surface (deck-as-presented), or strip to Pricing+Differentiate first (forced-cut option below). Either path, decide today.
2. **Acquisition**: I have no paid acquisition. The plan is content + WhatsApp + consultant channel. Help me pick **one** for the first 50 paying users - which has the highest conviction at solo-founder bandwidth?
3. **Pricing source-of-truth**: should the canonical price be ₪129/₪299 (code) or ₪99/₪249 (financials.md / README)? Decide now; instrumentation experiments depend on it.
4. **Retention as a gate**: do we ship Retention pre-launch or post-launch? Currently it admits to the user it has no data. Two valid answers; I want yours.
5. **3-week measurement plan**: smallest cohort that would actually convince *you* a wedge "won" or "lost". I will run that exact spec.

---

## What I would NOT change in the next 30 days

- The ViewModel boundary. Cleared the engine-import debt today; cost of regression is high.
- The 10 Tier-S engines list. Adding/removing here ripples through every module.
- The InsightActionCard 5-step pattern. It is product DNA; users will encounter it everywhere.
- The Hebrew-first stance. English support is bilingual but Hebrew is canonical (RTL-first, gendered copy, holiday calendar).
- The Romaniuk DBA palette + calendar engine. Compounding moat per `README.md:69-72`; cost to rebuild elsewhere = months.

Push back here only if you see a specific failure mode I am missing.

---

## What I would cut (forced ship-one-wedge)

If forced to ship a single wedge, **I would sunset Sales and Retention for v1** and ship Pricing + a stripped Differentiate.

- **Sales** is most template-heavy and least differentiated from "ask ChatGPT". Without `leadCount >= 20` real CRM data, `salesPipelineEngine` is heuristic. The DISC + objection + WhatsApp combo is a feature inside a populated CRM, not a wedge by itself.
- **Retention** openly tells the user `"based on industry average; not your actual data"` (`RetentionGrowthTab.tsx:75-78`). Sophisticated wallpaper until customer data flows in.
- **Pricing** is the only module with: real experiment loop (5 lifecycle events), genuine differentiation (6 cultural segments + Hebrew-calendar timing), derived (not asked) price, and Revenue-stage AARRR ownership.
- **Differentiate** works cold (no plan dependency), produces a shippable artifact (one-liner) outside the app, is on every tier including Free - acquisition-friendly.

Cutting Sales and Retention sharpens v1 to: **"derive your price, articulate your difference, in Hebrew, in one session."** Bring Sales and Retention back when there is data inside the system to make them non-trivial.
