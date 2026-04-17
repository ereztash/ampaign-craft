// Prompt Optimizer Loop — production orchestrator
//
// Ties together:
//   1. metaAgent output (flaggedAgents with rejectionRate > 15%)
//   2. promptOptimizerEngine.getOptimizationReport() (heuristic lexicon match)
//   3. safeStorage cache (cached patches applied on next generation)
//
// The loop is "self-healing" — it reads training_pairs with quality="negative",
// identifies patterns, and generates prompt additions that are applied
// automatically to the NEXT LLM call. No human in the loop, no re-training.
//
// Safe defaults:
//   - Only apply patches with confidence ≥ 70
//   - Max 3 patches per engine per cycle (prevent prompt bloat)
//   - Cache TTL = 24h (stale patches are cleared)

import { safeStorage } from "@/lib/safeStorage";
import { getOptimizationReport, type PromptOptimization } from "./promptOptimizerEngine";
import { logger } from "@/lib/logger";

const CACHE_KEY = "funnelforge-prompt-patches-v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const MIN_CONFIDENCE = 70;
const MAX_PATCHES_PER_ENGINE = 3;

export interface PatchCache {
  /** Patches grouped by engineId for fast lookup. */
  patchesByEngine: Record<string, PromptOptimization[]>;
  /** ISO timestamp — used for TTL check. */
  generatedAt: string;
  /** Total patches after threshold + cap filtering. */
  appliedCount: number;
  /** Total optimizations before filtering (for telemetry). */
  candidateCount: number;
}

/** Check if the cache is still valid (not stale). */
function isFresh(cache: PatchCache | null): boolean {
  if (!cache) return false;
  const age = Date.now() - new Date(cache.generatedAt).getTime();
  return age < CACHE_TTL_MS;
}

/**
 * Run the optimization loop end-to-end.
 * Idempotent: if a fresh cache exists, returns it without re-running.
 * Force=true bypasses the TTL check.
 */
export async function runOptimizationLoop(force = false): Promise<PatchCache> {
  if (!force) {
    const cached = safeStorage.getJSON<PatchCache | null>(CACHE_KEY, null);
    if (isFresh(cached)) return cached!;
  }

  try {
    const report = await getOptimizationReport();
    const candidateCount = report.optimizations.length;

    // Filter by confidence + cap per engine
    const patchesByEngine: Record<string, PromptOptimization[]> = {};
    for (const opt of report.optimizations) {
      if (opt.confidence < MIN_CONFIDENCE) continue;
      const bucket = patchesByEngine[opt.engineId] ?? [];
      if (bucket.length >= MAX_PATCHES_PER_ENGINE) continue;
      bucket.push(opt);
      patchesByEngine[opt.engineId] = bucket;
    }

    const appliedCount = Object.values(patchesByEngine).reduce((sum, arr) => sum + arr.length, 0);

    const cache: PatchCache = {
      patchesByEngine,
      generatedAt: new Date().toISOString(),
      appliedCount,
      candidateCount,
    };

    safeStorage.setJSON(CACHE_KEY, cache);
    return cache;
  } catch (e) {
    logger.warn("promptOptimizerLoop", e);
    return {
      patchesByEngine: {},
      generatedAt: new Date().toISOString(),
      appliedCount: 0,
      candidateCount: 0,
    };
  }
}

/**
 * Get active prompt patches for a specific engine.
 * Returns an empty array when no fresh patches exist for that engine.
 * Called synchronously from aiCopyService.buildSystemPrompt — uses cached data only.
 */
export function getActivePromptPatches(engineId: string): PromptOptimization[] {
  const cache = safeStorage.getJSON<PatchCache | null>(CACHE_KEY, null);
  if (!isFresh(cache)) return [];
  return cache!.patchesByEngine[engineId] ?? [];
}

/**
 * Format patches as a prompt section.
 * Empty string when no patches (safe — never pollutes prompt).
 */
export function buildPatchPromptSection(patches: PromptOptimization[], language: "he" | "en" = "he"): string {
  if (patches.length === 0) return "";

  const lines: string[] = [];
  const header = language === "he"
    ? "=== תיקוני prompt מבוססי feedback אמיתי ==="
    : "=== PROMPT PATCHES (from real user feedback) ===";
  lines.push(header);

  const intro = language === "he"
    ? "משוב משתמשים זיהה את הבעיות הבאות — תקן אותן אקטיבית:"
    : "User feedback identified these issues — actively address them:";
  lines.push(intro);

  for (const patch of patches) {
    lines.push(`  • [conf: ${patch.confidence}] ${patch.issue[language]}`);
    lines.push(`    → ${patch.suggestedPromptAddition}`);
  }

  return lines.join("\n");
}

/** Clear the patch cache — used in tests and when a model change invalidates prior feedback. */
export function clearPatchCache(): void {
  safeStorage.remove(CACHE_KEY);
}

/** Read the raw cache (for admin UI). Never triggers a refresh. */
export function getCachedReport(): PatchCache | null {
  return safeStorage.getJSON<PatchCache | null>(CACHE_KEY, null);
}
