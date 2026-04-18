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
import { getTrainingStats, getTrainingPairs, type EngineCategory } from "./trainingDataEngine";
import { logger } from "@/lib/logger";

const CACHE_KEY = "funnelforge-prompt-patches-v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const PATCH_EFFECTIVENESS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MIN_CONFIDENCE = 70;
const MAX_PATCHES_PER_ENGINE = 3;
// Patch expires if negatives for the engine didn't decrease by ≥10% after 7 days
const MIN_IMPROVEMENT_RATIO = 0.10;

/** Per-engine metadata captured when patches are applied. */
export interface PatchEngineMeta {
  /** Negative training pair count at time of patch application. */
  negativeCountBefore: number;
  /** ISO timestamp when this engine's patches were applied. */
  appliedAt: string;
}

export interface PatchCache {
  /** Patches grouped by engineId for fast lookup. */
  patchesByEngine: Record<string, PromptOptimization[]>;
  /** ISO timestamp — used for TTL check. */
  generatedAt: string;
  /** Total patches after threshold + cap filtering. */
  appliedCount: number;
  /** Total optimizations before filtering (for telemetry). */
  candidateCount: number;
  /** Per-engine metadata for effectiveness TTL (Loop 6). */
  metaByEngine?: Record<string, PatchEngineMeta>;
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
    if (isFresh(cached)) {
      // Even when cache is fresh, check effectiveness TTL (Loop 6)
      void checkAndExpirePatches();
      return cached!;
    }
  }

  try {
    const report = await getOptimizationReport();
    const candidateCount = report.optimizations.length;

    // Capture negative counts per engine BEFORE applying patches (for Loop 6 TTL)
    const stats = await getTrainingStats();
    const metaByEngine: Record<string, PatchEngineMeta> = {};

    // Filter by confidence + cap per engine
    const patchesByEngine: Record<string, PromptOptimization[]> = {};
    for (const opt of report.optimizations) {
      if (opt.confidence < MIN_CONFIDENCE) continue;
      const bucket = patchesByEngine[opt.engineId] ?? [];
      if (bucket.length >= MAX_PATCHES_PER_ENGINE) continue;
      bucket.push(opt);
      patchesByEngine[opt.engineId] = bucket;
    }

    // Record baseline negative counts for each patched engine
    const now = new Date().toISOString();
    for (const engineId of Object.keys(patchesByEngine)) {
      // stats.byEngine counts all pairs; we need negative count per engine
      // Use report patterns as a proxy: affectedPairs is negative count per engine
      const enginePatches = patchesByEngine[engineId];
      const negativeCount = enginePatches.reduce((max, p) => Math.max(max, p.affectedPairs), 0);
      metaByEngine[engineId] = { negativeCountBefore: negativeCount, appliedAt: now };
    }

    const appliedCount = Object.values(patchesByEngine).reduce((sum, arr) => sum + arr.length, 0);

    const cache: PatchCache = {
      patchesByEngine,
      generatedAt: new Date().toISOString(),
      appliedCount,
      candidateCount,
      metaByEngine,
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
 * Returns an empty array when no fresh patches or all patches are expired.
 * Called synchronously from aiCopyService.buildSystemPrompt — uses cached data only.
 */
export function getActivePromptPatches(engineId: string): PromptOptimization[] {
  const cache = safeStorage.getJSON<PatchCache | null>(CACHE_KEY, null);
  if (!isFresh(cache)) return [];

  const patches = cache!.patchesByEngine[engineId] ?? [];
  if (patches.length === 0) return [];

  // Check if this engine's patches have been marked as expired (Loop 6 TTL)
  const meta = cache!.metaByEngine?.[engineId];
  if (meta) {
    const ageMs = Date.now() - new Date(meta.appliedAt).getTime();
    if (ageMs >= PATCH_EFFECTIVENESS_TTL_MS && meta.negativeCountBefore < 0) {
      // negative count sentinel -1 = explicitly expired by checkAndExpirePatches
      return [];
    }
  }

  return patches;
}

/**
 * Check each patched engine's current negative count against the baseline.
 * If negatives haven't decreased by ≥10% after 7 days, expire those patches.
 * Call this from runOptimizationLoop or on app startup.
 * Returns number of engine patch sets expired.
 */
export async function checkAndExpirePatches(): Promise<number> {
  const cache = safeStorage.getJSON<PatchCache | null>(CACHE_KEY, null);
  if (!cache || !cache.metaByEngine) return 0;

  const now = Date.now();
  let expiredCount = 0;
  let mutated = false;

  for (const [engineId, meta] of Object.entries(cache.metaByEngine)) {
    const ageMs = now - new Date(meta.appliedAt).getTime();
    if (ageMs < PATCH_EFFECTIVENESS_TTL_MS) continue; // too early to judge
    if (meta.negativeCountBefore < 0) continue; // already expired

    try {
      const negativePairs = await getTrainingPairs({
        engineId: engineId as EngineCategory,
        quality: "negative",
        limit: 1000,
        since: meta.appliedAt,
      });

      const currentNegativeCount = negativePairs.length;
      const before = meta.negativeCountBefore;
      const improvement = before > 0 ? (before - currentNegativeCount) / before : 0;

      if (improvement < MIN_IMPROVEMENT_RATIO) {
        // Patch did not reduce negatives — expire it
        cache.metaByEngine![engineId] = { ...meta, negativeCountBefore: -1 };
        expiredCount++;
        mutated = true;
        logger.warn("promptOptimizerLoop", `Expired ineffective patch for engine "${engineId}" (improvement: ${(improvement * 100).toFixed(1)}%)`);
      }
    } catch {
      // Non-fatal — keep patch if we can't check
    }
  }

  if (mutated) {
    safeStorage.setJSON(CACHE_KEY, cache);
  }

  return expiredCount;
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
