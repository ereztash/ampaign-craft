// ═══════════════════════════════════════════════
// Research Orchestrator — shim
//
// Re-exports the real orchestrator that lives under
// src/engine/research/researchOrchestrator.ts so that
// consumers can do:
//
//     import { runResearch } from "@/engine/researchOrchestrator";
//
// and the engine audit can pick it up as a direct src/engine/*.ts
// module (consistent with the other named engines).
// ═══════════════════════════════════════════════

import { runResearch as runResearchImpl } from "./research/researchOrchestrator";
import type {
  ResearchQuery,
  ResearchSession,
} from "@/types/research";
import type { ResearchProgressCallback } from "./research/researchOrchestrator";
import {
  writeContext,
  conceptKey,
  type BlackboardWriteContext,
} from "./blackboard/contract";

export const ENGINE_MANIFEST = {
  name: "researchOrchestrator",
  reads: ["USER-research-*"],
  writes: ["USER-research-*"],
  stage: "diagnose",
  isLive: true,
  parameters: ["Research orchestration"],
} as const;

/**
 * Run a research session and optionally persist a compact summary
 * to the blackboard for downstream consumers.
 */
export async function runResearch(
  query: ResearchQuery,
  onProgress?: ResearchProgressCallback,
  blackboardCtx?: BlackboardWriteContext,
): Promise<ResearchSession> {
  const session = await runResearchImpl(query, onProgress);

  if (blackboardCtx) {
    void writeContext({
      userId: blackboardCtx.userId,
      planId: blackboardCtx.planId,
      key: conceptKey("USER", "research", query.id),
      stage: "diagnose",
      payload: {
        queryId: query.id,
        subQueryCount: session.subQueries.length,
        findingCount: session.findings.length,
        status: session.status,
      },
      writtenBy: ENGINE_MANIFEST.name,
    }).catch(() => {});
  }

  return session;
}

export type { ResearchProgressCallback } from "./research/researchOrchestrator";
