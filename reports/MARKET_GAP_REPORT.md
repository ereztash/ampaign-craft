# Market Gap Report

Generated: 2026-04-10T20:17:19.317Z
Repository: campaign-craft

## Honest Metric Baseline

Pre-wiring honest baseline: **46.0%** — captured under the hardened metric (honest consumerCount, LIB/ENGINE thresholds) before any Phase 1+ wiring.
Post-wiring result: **84.0%** (42/50).

The metric was hardened on 2026-04-10 to count a file as a consumer only when it both imports a binding and actually calls it (CallExpression or JSX). Pure re-exports are excluded. Two location-aware thresholds apply: 1 consumer for `src/lib/` + `src/services/` + edge functions, 3 consumers for `src/engine/`. An engine with `isLive: true` in its manifest requires at least one real call site in `src/pages/` or `src/components/` — enforced by `scripts/verify-runtime-calls.ts` as a gate.

## Paper vs Shipped

| # | Parameter | Backing Engines | Status | Consumer Count |
|---|---|---|---|---|
| 1 | Multi-agent orchestration | agent-executor, queue-processor, agentOrchestrator | SHIPPED | 5 |
| 2 | LLM copy generation | generate-copy, aiCopyService | SHIPPED | 3 |
| 3 | Hebrew NLP optimization | hebrewCopyOptimizer, stylomeEngine | SHIPPED | 5 |
| 4 | DISC behavioral profiling | discProfileEngine | SHIPPED | 7 |
| 5 | Hormozi Value Equation | hormoziValueEngine | SHIPPED | 4 |
| 6 | Neuro-storytelling closing | neuroClosingEngine | SHIPPED | 3 |
| 7 | Brand vector analysis | brandVectorEngine | PARTIAL | 2 |
| 8 | Business DNA fingerprint | businessFingerprintEngine | PARTIAL | 1 |
| 9 | Differentiation engine | differentiationEngine, differentiationPhases | SHIPPED | 6 |
| 10 | Cross-domain benchmarking | crossDomainBenchmarkEngine | SHIPPED | 2 |
| 11 | Predictive content scoring | predictiveContentScoreEngine | SHIPPED | 2 |
| 12 | A/B testing with significance | abTestEngine | SHIPPED | 2 |
| 13 | Budget prediction | predictiveEngine | SHIPPED | 1 |
| 14 | Outcome prediction | predictiveEngine | SHIPPED | 1 |
| 15 | Trend forecasting | predictiveEngine | SHIPPED | 1 |
| 16 | Campaign analytics | campaignAnalyticsEngine | SHIPPED | 3 |
| 17 | Churn prediction | churnPredictionEngine | SHIPPED | 4 |
| 18 | Behavioral cohort analysis | behavioralCohortEngine | SHIPPED | 2 |
| 19 | Funnel analysis | funnelEngine | SHIPPED | 13 |
| 20 | Cost of inaction | costOfInactionEngine | SHIPPED | 3 |
| 21 | Bottleneck detection | bottleneckEngine | SHIPPED | 3 |
| 22 | Gap analysis | gapEngine | SHIPPED | 3 |
| 23 | Next-step recommendation | nextStepEngine | SHIPPED | 3 |
| 24 | Sales pipeline mapping | salesPipelineEngine | SHIPPED | 3 |
| 25 | Pricing intelligence | pricingIntelligenceEngine | SHIPPED | 2 |
| 26 | Retention flywheel | retentionFlywheelEngine | SHIPPED | 3 |
| 27 | Retention growth | retentionGrowthEngine | SHIPPED | 2 |
| 28 | CLG modeling | clgEngine | SHIPPED | 3 |
| 29 | Health score | healthScoreEngine | SHIPPED | 10 |
| 30 | Pulse monitoring | pulseEngine | SHIPPED | 4 |
| 31 | Copy QA | copyQAEngine | SHIPPED | 3 |
| 32 | Perplexity and burstiness check | perplexityBurstiness | SHIPPED | 7 |
| 33 | Emotional performance | emotionalPerformanceEngine | SHIPPED | 3 |
| 34 | Prompt optimization | promptOptimizerEngine | SHIPPED | 1 |
| 35 | SEO content optimization | seoContentEngine | SHIPPED | 1 |
| 36 | Guidance engine | guidanceEngine | SHIPPED | 2 |
| 37 | Stylometric matching | stylomeEngine | PARTIAL | 2 |
| 38 | Visual export | visualExportEngine | SHIPPED | 1 |
| 39 | Export to channels | exportEngine | PARTIAL | 1 |
| 40 | Training data flywheel | trainingDataEngine, trainingExportEngine | SHIPPED | 8 |
| 41 | User knowledge graph | userKnowledgeGraph | SHIPPED | 21 |
| 42 | Data import pipeline | dataImportEngine | SHIPPED | 3 |
| 43 | Webhook dispatch (outbound) | webhook-dispatch | PAPER | 0 |
| 44 | Webhook receive (inbound) | webhook-receive | PAPER | 0 |
| 45 | Integration engine | integrationEngine | SHIPPED | 1 |
| 46 | Stripe payment | create-checkout, stripe-webhook | PAPER | 0 |
| 47 | Auth and RBAC | Supabase Auth + RLS | SHIPPED | 99 |
| 48 | Multi-tier pricing | create-checkout | PAPER | 0 |
| 49 | Research orchestration | researchOrchestrator, research-agent | SHIPPED | 2 |
| 50 | AI coach conversational | ai-coach, aiCoachChat *(missing)* | SHIPPED | 1 |

## Score Summary

- Paper score: 50/50 (100.0%)
- Shipped score: 42/50 (84.0%)
- Partial credit score: 44.0/50 (88.0%)
- Delta vs market average (70.2%): +13.8 points
- Delta vs top competitor (85%): -1.0 points

## Differentiation Pillars

| Pillar | Shipped | Live Engines Count |
|---|---|---|
| DISC behavioral profiling | yes | 1 |
| Hormozi Value Equation | yes | 1 |
| Neuro-storytelling closing | yes | 1 |
| Hebrew NLP optimization | yes | 1 |
| Multi-agent orchestration | yes | 1 |

Real differentiation: 5/5 (100%)

Prior claim: 96%

Gap between claim and reality: -4 points

## Verdict

**GAP_CONFIRMED**

Shipped score = 84.0%, real differentiation = 100%. Both shipped score and pillar coverage clear the GAP_CONFIRMED bar.

## Top 10 Quick Wins to Raise Shipped Score

| # | Parameter | Current Status | Engine to Wire | Page to Consume It |
|---|---|---|---|---|
| 1 | Brand vector analysis | PARTIAL | `brandVectorEngine` | `src/pages/Differentiate.tsx` |
| 2 | Stylometric matching | PARTIAL | `stylomeEngine` | `src/pages/ContentLab.tsx` |
| 3 | Business DNA fingerprint | PARTIAL | `businessFingerprintEngine` | `src/pages/Differentiate.tsx` |
| 4 | Export to channels | PARTIAL | `exportEngine` | `src/pages/ResultsDashboard.tsx` |
| 5 | Webhook dispatch (outbound) | PAPER | `webhook-dispatch` | `src/pages/Dashboard.tsx` |
| 6 | Webhook receive (inbound) | PAPER | `webhook-receive` | `src/pages/Dashboard.tsx` |
| 7 | Stripe payment | PAPER | `create-checkout` | `src/pages/Dashboard.tsx` |
| 8 | Multi-tier pricing | PAPER | `create-checkout` | `src/pages/Dashboard.tsx` |
