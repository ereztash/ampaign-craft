# Market Gap Report

Generated: 2026-04-10T13:24:34.158Z
Repository: campaign-craft

## Paper vs Shipped

| # | Parameter | Backing Engines | Status | Consumer Count |
|---|---|---|---|---|
| 1 | Multi-agent orchestration | agent-executor, queue-processor | PAPER | 0 |
| 2 | LLM copy generation | generate-copy, aiCopyService | PARTIAL | 1 |
| 3 | Hebrew NLP optimization | hebrewCopyOptimizer, stylomeEngine | SHIPPED | 6 |
| 4 | DISC behavioral profiling | discProfileEngine | SHIPPED | 13 |
| 5 | Hormozi Value Equation | hormoziValueEngine | SHIPPED | 4 |
| 6 | Neuro-storytelling closing | neuroClosingEngine | SHIPPED | 5 |
| 7 | Brand vector analysis | brandVectorEngine | SHIPPED | 4 |
| 8 | Business DNA fingerprint | businessFingerprintEngine | SHIPPED | 3 |
| 9 | Differentiation engine | differentiationEngine, differentiationPhases | PARTIAL | 4 |
| 10 | Cross-domain benchmarking | crossDomainBenchmarkEngine | PARTIAL | 2 |
| 11 | Predictive content scoring | predictiveContentScoreEngine | PARTIAL | 1 |
| 12 | A/B testing with significance | abTestEngine | SHIPPED | 2 |
| 13 | Budget prediction | predictiveEngine | SHIPPED | 1 |
| 14 | Outcome prediction | predictiveEngine | SHIPPED | 1 |
| 15 | Trend forecasting | predictiveEngine | SHIPPED | 1 |
| 16 | Campaign analytics | campaignAnalyticsEngine | PARTIAL | 2 |
| 17 | Churn prediction | churnPredictionEngine | SHIPPED | 6 |
| 18 | Behavioral cohort analysis | behavioralCohortEngine | PARTIAL | 2 |
| 19 | Funnel analysis | funnelEngine | SHIPPED | 14 |
| 20 | Cost of inaction | costOfInactionEngine | SHIPPED | 4 |
| 21 | Bottleneck detection | bottleneckEngine | SHIPPED | 5 |
| 22 | Gap analysis | gapEngine | PARTIAL | 1 |
| 23 | Next-step recommendation | nextStepEngine | SHIPPED | 3 |
| 24 | Sales pipeline mapping | salesPipelineEngine | SHIPPED | 3 |
| 25 | Pricing intelligence | pricingIntelligenceEngine | PARTIAL | 1 |
| 26 | Retention flywheel | retentionFlywheelEngine | SHIPPED | 4 |
| 27 | Retention growth | retentionGrowthEngine | PARTIAL | 1 |
| 28 | CLG modeling | clgEngine | PARTIAL | 2 |
| 29 | Health score | healthScoreEngine | SHIPPED | 11 |
| 30 | Pulse monitoring | pulseEngine | SHIPPED | 5 |
| 31 | Copy QA | copyQAEngine | SHIPPED | 5 |
| 32 | Perplexity and burstiness check | perplexityBurstiness | SHIPPED | 7 |
| 33 | Emotional performance | emotionalPerformanceEngine | PARTIAL | 2 |
| 34 | Prompt optimization | promptOptimizerEngine | PAPER | 0 |
| 35 | SEO content optimization | seoContentEngine | PAPER | 0 |
| 36 | Guidance engine | guidanceEngine | PARTIAL | 1 |
| 37 | Stylometric matching | stylomeEngine | SHIPPED | 3 |
| 38 | Visual export | visualExportEngine | PAPER | 0 |
| 39 | Export to channels | exportEngine | SHIPPED | 3 |
| 40 | Training data flywheel | trainingDataEngine, trainingExportEngine | SHIPPED | 8 |
| 41 | User knowledge graph | userKnowledgeGraph | SHIPPED | 25 |
| 42 | Data import pipeline | dataImportEngine | PARTIAL | 2 |
| 43 | Webhook dispatch (outbound) | webhook-dispatch | PAPER | 0 |
| 44 | Webhook receive (inbound) | webhook-receive | PAPER | 0 |
| 45 | Integration engine | integrationEngine | PAPER | 0 |
| 46 | Stripe payment | create-checkout, stripe-webhook | PAPER | 0 |
| 47 | Auth and RBAC | Supabase Auth + RLS | SHIPPED | 99 |
| 48 | Multi-tier pricing | create-checkout | PAPER | 0 |
| 49 | Research orchestration | researchOrchestrator, research-agent | PARTIAL | 1 |
| 50 | AI coach conversational | ai-coach, aiCoachChat *(missing)* | PAPER | 0 |

## Score Summary

- Paper score: 50/50 (100.0%)
- Shipped score: 26/50 (52.0%)
- Partial credit score: 33.0/50 (66.0%)
- Delta vs market average (70.2%): -18.2 points
- Delta vs top competitor (85%): -33.0 points

## Differentiation Pillars

| Pillar | Shipped | Live Engines Count |
|---|---|---|
| DISC behavioral profiling | yes | 1 |
| Hormozi Value Equation | yes | 1 |
| Neuro-storytelling closing | yes | 1 |
| Hebrew NLP optimization | yes | 2 |
| Multi-agent orchestration | no | 0 |

Real differentiation: 4/5 (80%)

Prior claim: 96%

Gap between claim and reality: 16 points

## Verdict

**GAP_UNPROVEN**

Shipped score = 52.0%, real differentiation = 80%. Shipped score is below 60% or pillar coverage is at 2/5 or worse — the historical 96% differentiation claim is unproven by the live codebase.

## Top 10 Quick Wins to Raise Shipped Score

| # | Parameter | Current Status | Engine to Wire | Page to Consume It |
|---|---|---|---|---|
| 1 | Differentiation engine | PARTIAL | `differentiationEngine` | `src/pages/Differentiate.tsx` |
| 2 | Cross-domain benchmarking | PARTIAL | `crossDomainBenchmarkEngine` | `src/pages/Differentiate.tsx` |
| 3 | Campaign analytics | PARTIAL | `campaignAnalyticsEngine` | `src/pages/Dashboard.tsx` |
| 4 | Behavioral cohort analysis | PARTIAL | `behavioralCohortEngine` | `src/pages/Dashboard.tsx` |
| 5 | CLG modeling | PARTIAL | `clgEngine` | `src/pages/RetentionEntry.tsx` |
| 6 | Emotional performance | PARTIAL | `emotionalPerformanceEngine` | `src/pages/ContentLab.tsx` |
| 7 | Data import pipeline | PARTIAL | `dataImportEngine` | `src/pages/DataHub.tsx` |
| 8 | LLM copy generation | PARTIAL | `generate-copy` | `src/pages/Dashboard.tsx` |
| 9 | Predictive content scoring | PARTIAL | `predictiveContentScoreEngine` | `src/pages/ContentLab.tsx` |
| 10 | Gap analysis | PARTIAL | `gapEngine` | `src/pages/StrategyCanvas.tsx` |
