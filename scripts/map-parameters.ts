#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════
// Parameter Map — Source of truth for the 50 benchmark
// parameters and the engines that back each one.
//
// Used by score-market-gap.ts and differentiation-check.ts.
// ═══════════════════════════════════════════════

export type ParameterCategory =
  | "CATEGORY_A_CORE_GENERATION"
  | "CATEGORY_B_ANALYTICS"
  | "CATEGORY_C_STRATEGY"
  | "CATEGORY_D_CONTENT_QA"
  | "CATEGORY_E_INFRASTRUCTURE";

export interface ParameterEntry {
  index: number;
  category: ParameterCategory;
  name: string;
  backingEngines: string[];
}

export const PARAMETERS: ParameterEntry[] = [
  // ── CATEGORY A: CORE GENERATION ──
  { index: 1,  category: "CATEGORY_A_CORE_GENERATION", name: "Multi-agent orchestration",       backingEngines: ["agent-executor", "queue-processor", "agentOrchestrator"] },
  { index: 2,  category: "CATEGORY_A_CORE_GENERATION", name: "LLM copy generation",             backingEngines: ["generate-copy", "aiCopyService"] },
  { index: 3,  category: "CATEGORY_A_CORE_GENERATION", name: "Hebrew NLP optimization",         backingEngines: ["hebrewCopyOptimizer", "stylomeEngine"] },
  { index: 4,  category: "CATEGORY_A_CORE_GENERATION", name: "DISC behavioral profiling",       backingEngines: ["discProfileEngine"] },
  { index: 5,  category: "CATEGORY_A_CORE_GENERATION", name: "Hormozi Value Equation",          backingEngines: ["hormoziValueEngine"] },
  { index: 6,  category: "CATEGORY_A_CORE_GENERATION", name: "Neuro-storytelling closing",      backingEngines: ["neuroClosingEngine"] },
  { index: 7,  category: "CATEGORY_A_CORE_GENERATION", name: "Brand vector analysis",           backingEngines: ["brandVectorEngine"] },
  { index: 8,  category: "CATEGORY_A_CORE_GENERATION", name: "Business DNA fingerprint",        backingEngines: ["businessFingerprintEngine"] },
  { index: 9,  category: "CATEGORY_A_CORE_GENERATION", name: "Differentiation engine",          backingEngines: ["differentiationEngine", "differentiationPhases"] },
  { index: 10, category: "CATEGORY_A_CORE_GENERATION", name: "Cross-domain benchmarking",       backingEngines: ["crossDomainBenchmarkEngine"] },

  // ── CATEGORY B: ANALYTICS ──
  { index: 11, category: "CATEGORY_B_ANALYTICS",       name: "Predictive content scoring",      backingEngines: ["predictiveContentScoreEngine"] },
  { index: 12, category: "CATEGORY_B_ANALYTICS",       name: "A/B testing with significance",   backingEngines: ["abTestEngine"] },
  { index: 13, category: "CATEGORY_B_ANALYTICS",       name: "Budget prediction",               backingEngines: ["predictiveEngine"] },
  { index: 14, category: "CATEGORY_B_ANALYTICS",       name: "Outcome prediction",              backingEngines: ["predictiveEngine"] },
  { index: 15, category: "CATEGORY_B_ANALYTICS",       name: "Trend forecasting",               backingEngines: ["predictiveEngine"] },
  { index: 16, category: "CATEGORY_B_ANALYTICS",       name: "Campaign analytics",              backingEngines: ["campaignAnalyticsEngine"] },
  { index: 17, category: "CATEGORY_B_ANALYTICS",       name: "Churn prediction",                backingEngines: ["churnPredictionEngine"] },
  { index: 18, category: "CATEGORY_B_ANALYTICS",       name: "Behavioral cohort analysis",      backingEngines: ["behavioralCohortEngine"] },
  { index: 19, category: "CATEGORY_B_ANALYTICS",       name: "Funnel analysis",                 backingEngines: ["funnelEngine"] },
  { index: 20, category: "CATEGORY_B_ANALYTICS",       name: "Cost of inaction",                backingEngines: ["costOfInactionEngine"] },

  // ── CATEGORY C: STRATEGY ──
  { index: 21, category: "CATEGORY_C_STRATEGY",        name: "Bottleneck detection",            backingEngines: ["bottleneckEngine"] },
  { index: 22, category: "CATEGORY_C_STRATEGY",        name: "Gap analysis",                    backingEngines: ["gapEngine"] },
  { index: 23, category: "CATEGORY_C_STRATEGY",        name: "Next-step recommendation",        backingEngines: ["nextStepEngine"] },
  { index: 24, category: "CATEGORY_C_STRATEGY",        name: "Sales pipeline mapping",          backingEngines: ["salesPipelineEngine"] },
  { index: 25, category: "CATEGORY_C_STRATEGY",        name: "Pricing intelligence",            backingEngines: ["pricingIntelligenceEngine"] },
  { index: 26, category: "CATEGORY_C_STRATEGY",        name: "Retention flywheel",              backingEngines: ["retentionFlywheelEngine"] },
  { index: 27, category: "CATEGORY_C_STRATEGY",        name: "Retention growth",                backingEngines: ["retentionGrowthEngine"] },
  { index: 28, category: "CATEGORY_C_STRATEGY",        name: "CLG modeling",                    backingEngines: ["clgEngine"] },
  { index: 29, category: "CATEGORY_C_STRATEGY",        name: "Health score",                    backingEngines: ["healthScoreEngine"] },
  { index: 30, category: "CATEGORY_C_STRATEGY",        name: "Pulse monitoring",                backingEngines: ["pulseEngine"] },

  // ── CATEGORY D: CONTENT QA ──
  { index: 31, category: "CATEGORY_D_CONTENT_QA",      name: "Copy QA",                         backingEngines: ["copyQAEngine"] },
  { index: 32, category: "CATEGORY_D_CONTENT_QA",      name: "Perplexity and burstiness check", backingEngines: ["perplexityBurstiness"] },
  { index: 33, category: "CATEGORY_D_CONTENT_QA",      name: "Emotional performance",           backingEngines: ["emotionalPerformanceEngine"] },
  { index: 34, category: "CATEGORY_D_CONTENT_QA",      name: "Prompt optimization",             backingEngines: ["promptOptimizerEngine"] },
  { index: 35, category: "CATEGORY_D_CONTENT_QA",      name: "SEO content optimization",        backingEngines: ["seoContentEngine"] },
  { index: 36, category: "CATEGORY_D_CONTENT_QA",      name: "Guidance engine",                 backingEngines: ["guidanceEngine"] },
  { index: 37, category: "CATEGORY_D_CONTENT_QA",      name: "Stylometric matching",            backingEngines: ["stylomeEngine"] },
  { index: 38, category: "CATEGORY_D_CONTENT_QA",      name: "Visual export",                   backingEngines: ["visualExportEngine"] },
  { index: 39, category: "CATEGORY_D_CONTENT_QA",      name: "Export to channels",              backingEngines: ["exportEngine"] },
  { index: 40, category: "CATEGORY_D_CONTENT_QA",      name: "Training data flywheel",          backingEngines: ["trainingDataEngine", "trainingExportEngine"] },

  // ── CATEGORY E: INFRASTRUCTURE ──
  { index: 41, category: "CATEGORY_E_INFRASTRUCTURE",  name: "User knowledge graph",            backingEngines: ["userKnowledgeGraph"] },
  { index: 42, category: "CATEGORY_E_INFRASTRUCTURE",  name: "Data import pipeline",            backingEngines: ["dataImportEngine"] },
  { index: 43, category: "CATEGORY_E_INFRASTRUCTURE",  name: "Webhook dispatch (outbound)",     backingEngines: ["webhook-dispatch"] },
  { index: 44, category: "CATEGORY_E_INFRASTRUCTURE",  name: "Webhook receive (inbound)",       backingEngines: ["webhook-receive"] },
  { index: 45, category: "CATEGORY_E_INFRASTRUCTURE",  name: "Integration engine",              backingEngines: ["integrationEngine"] },
  { index: 46, category: "CATEGORY_E_INFRASTRUCTURE",  name: "Stripe payment",                  backingEngines: ["create-checkout", "stripe-webhook"] },
  { index: 47, category: "CATEGORY_E_INFRASTRUCTURE",  name: "Auth and RBAC",                   backingEngines: ["Supabase Auth + RLS"] },
  { index: 48, category: "CATEGORY_E_INFRASTRUCTURE",  name: "Multi-tier pricing",              backingEngines: ["create-checkout"] },
  { index: 49, category: "CATEGORY_E_INFRASTRUCTURE",  name: "Research orchestration",          backingEngines: ["researchOrchestrator", "research-agent"] },
  { index: 50, category: "CATEGORY_E_INFRASTRUCTURE",  name: "AI coach conversational",         backingEngines: ["ai-coach", "aiCoachChat"] },

  // ── CATEGORY C addition (2026-04-11): Behavioral nudge orchestration ──
  // behavioralActionEngine declares this parameter in its own ENGINE_MANIFEST.
  // Added as #51 to keep the 50-parameter SSoT aligned with engine self-description.
  { index: 51, category: "CATEGORY_C_STRATEGY",        name: "Behavioral nudge orchestration",  backingEngines: ["behavioralActionEngine"] },
];

export const TOTAL_PARAMETERS = PARAMETERS.length;
