// ═══════════════════════════════════════════════
// Engine Registry — Manifest catalog of every engine
// Imports ENGINE_MANIFEST from each engine that exposes one,
// and registers a stub manifest for engines that don't.
// ═══════════════════════════════════════════════

import { ENGINE_MANIFEST as discProfileManifest } from "../discProfileEngine";
import { ENGINE_MANIFEST as funnelManifest } from "../funnelEngine";
import { ENGINE_MANIFEST as userKnowledgeGraphManifest } from "../userKnowledgeGraph";
import { ENGINE_MANIFEST as predictiveManifest } from "../predictiveEngine";
import { ENGINE_MANIFEST as abTestManifest } from "../abTestEngine";
import { ENGINE_MANIFEST as behavioralActionManifest } from "../behavioralActionEngine";
import { ENGINE_MANIFEST as brandVectorManifest } from "../brandVectorEngine";
import { ENGINE_MANIFEST as businessFingerprintManifest } from "../businessFingerprintEngine";
import { ENGINE_MANIFEST as stylomeManifest } from "../stylomeEngine";
import { ENGINE_MANIFEST as exportManifest } from "../exportEngine";

// ───────────────────────────────────────────────
// Manifest shape — narrow enough to compare both
// real ENGINE_MANIFEST exports and stub fallbacks.
// ───────────────────────────────────────────────

export type EngineStage = "discover" | "diagnose" | "design" | "deploy" | "unknown";

export interface EngineManifest {
  name: string;
  reads: readonly string[];
  writes: readonly string[];
  stage: EngineStage;
  isLive: boolean;
  parameters: readonly string[];
}

function stub(name: string): EngineManifest {
  return {
    name,
    reads: [],
    writes: [],
    stage: "unknown",
    isLive: false,
    parameters: [],
  };
}

// ───────────────────────────────────────────────
// Canonical engine list — derived from src/engine/*.ts
// Tested in src/engine/__tests__/registry.test.ts
// ───────────────────────────────────────────────

export const ALL_ENGINE_FILES: readonly string[] = [
  "abTestEngine",
  "archetypeClassifier",
  "behavioralActionEngine",
  "behavioralCohortEngine",
  "behavioralHeuristicEngine",
  "bottleneckEngine",
  "brandVectorEngine",
  "businessFingerprintEngine",
  "campaignAnalyticsEngine",
  "churnPlaybookEngine",
  "churnPredictionEngine",
  "clgEngine",
  "copyQAEngine",
  "costOfInactionEngine",
  "crossDomainBenchmarkEngine",
  "dataImportEngine",
  "differentiationEngine",
  "differentiationKnowledge",
  "differentiationPhases",
  "discProfileEngine",
  "emotionalPerformanceEngine",
  "executiveBriefEngine",
  "exportEngine",
  "frameworkRankingEngine",
  "funnelEngine",
  "gapEngine",
  "guidanceEngine",
  "healthScoreEngine",
  "hormoziValueEngine",
  "insightsEngine",
  "integrationEngine",
  "neuroClosingEngine",
  "nextStepEngine",
  "outcomeLoopEngine",
  "outputModeration",
  "perplexityBurstiness",
  "predictiveContentScoreEngine",
  "predictiveEngine",
  "pricingIntelligenceEngine",
  "pricingKnowledge",
  "pricingWizardEngine",
  "promptOptimizerEngine",
  "promptOptimizerLoop",
  "pulseEngine",
  "quoteAssemblyEngine",
  "referralEngine",
  "researchOrchestrator",
  "retentionFlywheelEngine",
  "retentionGrowthEngine",
  "retentionKnowledge",
  "retentionPersonalizationContext",
  "salesPipelineEngine",
  "seoContentEngine",
  "stylomeEngine",
  "trainingDataEngine",
  "userKnowledgeGraph",
  "uvpSynthesisEngine",
  "visualExportEngine",
  "weeklyLoopEngine",
] as const;

// ───────────────────────────────────────────────
// REGISTRY — name → manifest
// ───────────────────────────────────────────────

export const REGISTRY: Readonly<Record<string, EngineManifest>> = (() => {
  const live: EngineManifest[] = [
    discProfileManifest as unknown as EngineManifest,
    funnelManifest as unknown as EngineManifest,
    userKnowledgeGraphManifest as unknown as EngineManifest,
    predictiveManifest as unknown as EngineManifest,
    abTestManifest as unknown as EngineManifest,
    behavioralActionManifest as unknown as EngineManifest,
    brandVectorManifest as unknown as EngineManifest,
    businessFingerprintManifest as unknown as EngineManifest,
    stylomeManifest as unknown as EngineManifest,
    exportManifest as unknown as EngineManifest,
  ];

  const map: Record<string, EngineManifest> = {};

  // Seed every engine file with a stub.
  for (const fileName of ALL_ENGINE_FILES) {
    map[fileName] = stub(fileName);
  }

  // Overwrite with real manifests where present.
  for (const manifest of live) {
    map[manifest.name] = manifest;
  }

  return map;
})();

export function getManifest(name: string): EngineManifest | undefined {
  return REGISTRY[name];
}

export function listLiveEngines(): EngineManifest[] {
  return Object.values(REGISTRY).filter((m) => m.isLive);
}
