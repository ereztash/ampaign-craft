import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildPatchPromptSection,
  clearPatchCache,
  getCachedReport,
  getActivePromptPatches,
  runOptimizationLoop,
  checkAndExpirePatches,
  type PatchCache,
  type PatchEngineMeta,
} from "../promptOptimizerLoop";
import type { PromptOptimization } from "../promptOptimizerEngine";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/safeStorage", () => {
  const store = new Map<string, unknown>();
  return {
    safeStorage: {
      getJSON: vi.fn(<T>(key: string, fallback: T): T => {
        return store.has(key) ? (store.get(key) as T) : fallback;
      }),
      setJSON: vi.fn((key: string, value: unknown) => { store.set(key, value); }),
      remove:  vi.fn((key: string) => { store.delete(key); }),
      _store: store,
    },
  };
});

vi.mock("../promptOptimizerEngine", () => ({
  getOptimizationReport: vi.fn(async () => ({
    optimizations: [] as PromptOptimization[],
    generatedAt: new Date().toISOString(),
    totalNegatives: 0,
    enginesAnalysed: 0,
  })),
}));

vi.mock("../trainingDataEngine", () => ({
  getTrainingStats: vi.fn(async () => ({
    total: 0,
    positive: 0,
    negative: 0,
    unrated: 0,
    byEngine: {},
    latestCapture: null,
  })),
  getTrainingPairs: vi.fn(async () => []),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn() },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePatch(overrides: Partial<PromptOptimization> = {}): PromptOptimization {
  return {
    engineId: "funnel",
    issue: { he: "בעיה לדוגמה", en: "Sample issue" },
    suggestedPromptAddition: "Do X instead of Y",
    confidence: 80,
    affectedPairs: 5,
    ...overrides,
  };
}

function makeFreshCache(overrides: Partial<PatchCache> = {}): PatchCache {
  return {
    patchesByEngine: {},
    generatedAt: new Date().toISOString(),
    appliedCount: 0,
    candidateCount: 0,
    ...overrides,
  };
}

// ── Import mocked modules to manipulate their return values ──────────────────
import { safeStorage } from "@/lib/safeStorage";
import { getOptimizationReport } from "../promptOptimizerEngine";
import { getTrainingPairs } from "../trainingDataEngine";

// Cast to Vitest mock helpers
const mockStorage = safeStorage as unknown as {
  getJSON: ReturnType<typeof vi.fn>;
  setJSON: ReturnType<typeof vi.fn>;
  remove:  ReturnType<typeof vi.fn>;
  _store:  Map<string, unknown>;
};
const mockGetReport   = getOptimizationReport as ReturnType<typeof vi.fn>;
const mockGetPairs    = getTrainingPairs as ReturnType<typeof vi.fn>;

// ═══════════════════════════════════════════════
// buildPatchPromptSection
// ═══════════════════════════════════════════════

describe("buildPatchPromptSection", () => {
  it("returns empty string for empty patches array", () => {
    expect(buildPatchPromptSection([])).toBe("");
  });

  it("returns empty string for empty patches with explicit language", () => {
    expect(buildPatchPromptSection([], "en")).toBe("");
  });

  it("includes Hebrew header by default", () => {
    const result = buildPatchPromptSection([makePatch()]);
    expect(result).toContain("=== תיקוני prompt");
  });

  it("includes English header when lang='en'", () => {
    const result = buildPatchPromptSection([makePatch()], "en");
    expect(result).toContain("=== PROMPT PATCHES");
  });

  it("includes confidence in output", () => {
    const result = buildPatchPromptSection([makePatch({ confidence: 92 })]);
    expect(result).toContain("conf: 92");
  });

  it("includes the suggested prompt addition", () => {
    const result = buildPatchPromptSection([makePatch({ suggestedPromptAddition: "Always add disclaimer" })]);
    expect(result).toContain("Always add disclaimer");
  });

  it("includes the issue text (he) for Hebrew mode", () => {
    const result = buildPatchPromptSection([makePatch({ issue: { he: "בעיה קריטית", en: "critical issue" } })]);
    expect(result).toContain("בעיה קריטית");
  });

  it("includes the issue text (en) for English mode", () => {
    const result = buildPatchPromptSection([makePatch({ issue: { he: "בעיה", en: "critical issue" } })], "en");
    expect(result).toContain("critical issue");
  });

  it("renders multiple patches in sequence", () => {
    const patches = [
      makePatch({ confidence: 75, suggestedPromptAddition: "First fix" }),
      makePatch({ confidence: 85, suggestedPromptAddition: "Second fix" }),
    ];
    const result = buildPatchPromptSection(patches);
    expect(result).toContain("First fix");
    expect(result).toContain("Second fix");
  });

  it("result contains newlines separating patches", () => {
    const patches = [makePatch(), makePatch()];
    const result = buildPatchPromptSection(patches);
    expect(result.split("\n").length).toBeGreaterThan(3);
  });
});

// ═══════════════════════════════════════════════
// clearPatchCache + getCachedReport
// ═══════════════════════════════════════════════

describe("clearPatchCache / getCachedReport", () => {
  beforeEach(() => {
    mockStorage._store.clear();
    vi.clearAllMocks();
  });

  it("getCachedReport returns null when no cache stored", () => {
    mockStorage.getJSON.mockReturnValue(null);
    expect(getCachedReport()).toBeNull();
  });

  it("getCachedReport returns stored cache", () => {
    const cache = makeFreshCache({ appliedCount: 3 });
    mockStorage.getJSON.mockReturnValue(cache);
    const result = getCachedReport();
    expect(result?.appliedCount).toBe(3);
  });

  it("clearPatchCache calls safeStorage.remove", () => {
    clearPatchCache();
    expect(mockStorage.remove).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════
// getActivePromptPatches
// ═══════════════════════════════════════════════

describe("getActivePromptPatches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when no cache", () => {
    mockStorage.getJSON.mockReturnValue(null);
    expect(getActivePromptPatches("funnel")).toEqual([]);
  });

  it("returns empty array when cache is stale (generatedAt > 24h ago)", () => {
    const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const staleCache = makeFreshCache({ generatedAt: staleDate });
    mockStorage.getJSON.mockReturnValue(staleCache);
    expect(getActivePromptPatches("funnel")).toEqual([]);
  });

  it("returns patches for the matching engine when cache is fresh", () => {
    const patch = makePatch({ engineId: "funnel" });
    const cache = makeFreshCache({ patchesByEngine: { funnel: [patch] } });
    mockStorage.getJSON.mockReturnValue(cache);
    const result = getActivePromptPatches("funnel");
    expect(result).toHaveLength(1);
    expect(result[0].engineId).toBe("funnel");
  });

  it("returns empty array for unknown engineId even with fresh cache", () => {
    const patch = makePatch({ engineId: "funnel" });
    const cache = makeFreshCache({ patchesByEngine: { funnel: [patch] } });
    mockStorage.getJSON.mockReturnValue(cache);
    expect(getActivePromptPatches("copy")).toEqual([]);
  });

  it("does not return patches whose engine meta has sentinel -1 (expired) after 7 days", () => {
    const sevenDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const patch = makePatch({ engineId: "funnel" });
    const meta: PatchEngineMeta = { negativeCountBefore: -1, appliedAt: sevenDaysAgo };
    const cache = makeFreshCache({
      patchesByEngine: { funnel: [patch] },
      metaByEngine: { funnel: meta },
    });
    mockStorage.getJSON.mockReturnValue(cache);
    expect(getActivePromptPatches("funnel")).toEqual([]);
  });
});

// ═══════════════════════════════════════════════
// runOptimizationLoop
// ═══════════════════════════════════════════════

describe("runOptimizationLoop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a PatchCache object", async () => {
    mockStorage.getJSON.mockReturnValue(null);
    mockGetReport.mockResolvedValue({ optimizations: [], generatedAt: new Date().toISOString(), totalNegatives: 0, enginesAnalysed: 0 });
    const result = await runOptimizationLoop(true);
    expect(result).toHaveProperty("patchesByEngine");
    expect(result).toHaveProperty("generatedAt");
    expect(result).toHaveProperty("appliedCount");
    expect(result).toHaveProperty("candidateCount");
  });

  it("returns fresh cached result without re-running when not forced", async () => {
    const freshCache = makeFreshCache({ appliedCount: 7 });
    mockStorage.getJSON.mockReturnValue(freshCache);
    const result = await runOptimizationLoop(false);
    expect(result.appliedCount).toBe(7);
    // getOptimizationReport should NOT have been called again
    expect(mockGetReport).not.toHaveBeenCalled();
  });

  it("filters out patches below MIN_CONFIDENCE (70)", async () => {
    const lowConfPatch = makePatch({ confidence: 50, engineId: "copy" });
    mockStorage.getJSON.mockReturnValue(null);
    mockGetReport.mockResolvedValue({
      optimizations: [lowConfPatch],
      generatedAt: new Date().toISOString(),
      totalNegatives: 1,
      enginesAnalysed: 1,
    });
    const result = await runOptimizationLoop(true);
    expect(result.appliedCount).toBe(0);
    expect(result.patchesByEngine["copy"]).toBeUndefined();
  });

  it("accepts patches at exactly MIN_CONFIDENCE (70)", async () => {
    const borderPatch = makePatch({ confidence: 70, engineId: "copy" });
    mockStorage.getJSON.mockReturnValue(null);
    mockGetReport.mockResolvedValue({
      optimizations: [borderPatch],
      generatedAt: new Date().toISOString(),
      totalNegatives: 1,
      enginesAnalysed: 1,
    });
    const result = await runOptimizationLoop(true);
    expect(result.appliedCount).toBe(1);
  });

  it("caps at MAX_PATCHES_PER_ENGINE (3) per engine", async () => {
    const patches = Array.from({ length: 5 }, (_, i) =>
      makePatch({ confidence: 80 + i, engineId: "funnel" }),
    );
    mockStorage.getJSON.mockReturnValue(null);
    mockGetReport.mockResolvedValue({
      optimizations: patches,
      generatedAt: new Date().toISOString(),
      totalNegatives: 5,
      enginesAnalysed: 1,
    });
    const result = await runOptimizationLoop(true);
    expect(result.patchesByEngine["funnel"]).toHaveLength(3);
    expect(result.appliedCount).toBe(3);
  });

  it("returns empty cache on error", async () => {
    mockStorage.getJSON.mockReturnValue(null);
    mockGetReport.mockRejectedValue(new Error("Network error"));
    const result = await runOptimizationLoop(true);
    expect(result.patchesByEngine).toEqual({});
    expect(result.appliedCount).toBe(0);
  });

  it("records candidateCount matching total optimizations before filtering", async () => {
    const patches = [
      makePatch({ confidence: 30, engineId: "funnel" }), // filtered out
      makePatch({ confidence: 80, engineId: "copy" }),   // kept
    ];
    mockStorage.getJSON.mockReturnValue(null);
    mockGetReport.mockResolvedValue({
      optimizations: patches,
      generatedAt: new Date().toISOString(),
      totalNegatives: 2,
      enginesAnalysed: 2,
    });
    const result = await runOptimizationLoop(true);
    expect(result.candidateCount).toBe(2);
    expect(result.appliedCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════
// checkAndExpirePatches
// ═══════════════════════════════════════════════

describe("checkAndExpirePatches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 0 when no cache exists", async () => {
    mockStorage.getJSON.mockReturnValue(null);
    expect(await checkAndExpirePatches()).toBe(0);
  });

  it("returns 0 when metaByEngine is missing from cache", async () => {
    const cache = makeFreshCache(); // no metaByEngine
    mockStorage.getJSON.mockReturnValue(cache);
    expect(await checkAndExpirePatches()).toBe(0);
  });

  it("returns 0 when patch is less than 7 days old (too early to judge)", async () => {
    const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const cache = makeFreshCache({
      metaByEngine: { funnel: { negativeCountBefore: 10, appliedAt: recentDate } },
    });
    mockStorage.getJSON.mockReturnValue(cache);
    mockGetPairs.mockResolvedValue([]);
    expect(await checkAndExpirePatches()).toBe(0);
  });

  it("expires patches older than 7 days with no improvement", async () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const patch = makePatch({ engineId: "funnel" });
    const cache = makeFreshCache({
      patchesByEngine: { funnel: [patch] },
      metaByEngine: { funnel: { negativeCountBefore: 10, appliedAt: oldDate } },
    });
    mockStorage.getJSON.mockReturnValue(cache);
    // Return 10 negatives (no improvement)
    mockGetPairs.mockResolvedValue(Array(10).fill({}));
    const expired = await checkAndExpirePatches();
    expect(expired).toBe(1);
  });

  it("does NOT expire already-expired entries (sentinel -1)", async () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const cache = makeFreshCache({
      metaByEngine: { funnel: { negativeCountBefore: -1, appliedAt: oldDate } },
    });
    mockStorage.getJSON.mockReturnValue(cache);
    expect(await checkAndExpirePatches()).toBe(0);
    expect(mockGetPairs).not.toHaveBeenCalled();
  });
});
