// ═══════════════════════════════════════════════
// useArchetypePipeline — Friction-mapped pipeline state hook
// Reads the archetype's personalityProfile.pipeline and resolves
// completion status for each step against localStorage.
//
// Completion keys (existing localStorage):
//   /data        → funnelforge-data-sources
//   /differentiate → funnelforge-differentiation-result
//   /wizard      → funnelforge-plans (array length > 0)
//   /ai          → funnelforge-coach-messages
//   Others       → visit-based steps; always available as next
// ═══════════════════════════════════════════════

import { useMemo } from "react";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { getArchetypeUIConfig } from "@/lib/archetypeUIConfig";
import type { PipelineStep } from "@/types/archetype";

export interface ResolvedPipelineStep extends PipelineStep {
  completed: boolean;
}

export interface UseArchetypePipelineResult {
  /** Full step list with completion state resolved from localStorage */
  steps: ResolvedPipelineStep[];
  /** Index of the first incomplete step (or last step if all done) */
  currentStepIndex: number;
  /** Number of completed steps */
  completedCount: number;
  /** The next recommended step (first incomplete), or null */
  nextStep: ResolvedPipelineStep | null;
  /** 0–100 progress percentage */
  progressPercent: number;
  /** True when confidenceTier !== "none" */
  isActive: boolean;
}

function resolveCompletion(completionKey: string | undefined): boolean {
  if (!completionKey) return false;
  try {
    const raw = localStorage.getItem(completionKey);
    if (raw === null) return false;
    // Arrays (e.g. funnelforge-plans) must have length > 0
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.length > 0;
    } catch {
      // Not JSON — treat raw truthy string as completed
    }
    return !!raw;
  } catch {
    return false;
  }
}

export function useArchetypePipeline(): UseArchetypePipelineResult {
  const { effectiveArchetypeId, confidenceTier } = useArchetype();
  const isActive = confidenceTier !== "none";

  const steps = useMemo<ResolvedPipelineStep[]>(() => {
    const config = getArchetypeUIConfig(effectiveArchetypeId);
    return config.personalityProfile.pipeline.map((step) => ({
      ...step,
      completed: resolveCompletion(step.completionKey),
    }));
    // effectiveArchetypeId drives which pipeline to load;
    // localStorage is read fresh on each render (no reactive dependency needed —
    // component remounts on navigation, triggering re-evaluation).
  }, [effectiveArchetypeId]);

  const completedCount = steps.filter((s) => s.completed).length;
  const firstIncomplete = steps.findIndex((s) => !s.completed);
  const currentStepIndex = firstIncomplete === -1 ? steps.length - 1 : firstIncomplete;
  const nextStep = steps[currentStepIndex] ?? null;
  const progressPercent = steps.length > 0
    ? Math.round((completedCount / steps.length) * 100)
    : 0;

  return {
    steps,
    currentStepIndex,
    completedCount,
    nextStep,
    progressPercent,
    isActive,
  };
}
