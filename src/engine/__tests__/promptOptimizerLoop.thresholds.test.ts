// ═══════════════════════════════════════════════
// Threshold-locking tests — Loop 6: Prompt Patch TTL
//
// Behavioral thresholds locked here:
//   MIN_IMPROVEMENT_RATIO = 0.10  — patches with <10% improvement are expired
//   PATCH_EFFECTIVENESS_TTL_MS = 7 * 24 * 60 * 60 * 1000  — 7-day evaluation window
//
// See: README.md "If improvement < 10% → expire patch"
// See: README.md "Negative training pair count before vs 7 days after patch"
// ═══════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkAndExpirePatches, type PatchCache } from "../promptOptimizerLoop";
import type { PromptOptimization } from "../promptOptimizerEngine";

// ── Mocks (factory pattern — avoids vi.mock hoisting issue) ──────────────────

vi.mock("@/lib/safeStorage", () => {
  const store = new Map<string, unknown>();
  return {
    safeStorage: {
      getJSON: vi.fn(<T>(key: string, fallback: T): T =>
        store.has(key) ? (store.get(key) as T) : fallback,
      ),
      setJSON: vi.fn((key: string, value: unknown) => { store.set(key, value); }),
      remove: vi.fn((key: string) => { store.delete(key); }),
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
    total: 0, positive: 0, negative: 0, unrated: 0, byEngine: {}, latestCapture: null,
  })),
  getTrainingPairs: vi.fn(async () => []),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn() },
}));

// Import mocked references AFTER vi.mock declarations
import { safeStorage } from "@/lib/safeStorage";
import { getTrainingPairs } from "../trainingDataEngine";

const mockStorage = safeStorage as ReturnType<typeof vi.fn> & typeof safeStorage;
const mockGetPairs = getTrainingPairs as ReturnType<typeof vi.fn>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePatch(overrides: Partial<PromptOptimization> = {}): PromptOptimization {
  return {
    engineId: "campaign_analytics",
    issue: { he: "בעיה", en: "issue" },
    suggestedPromptAddition: "+ fix",
    confidence: 80,
    affectedPairs: 10,
    ...overrides,
  };
}

function makeOldDate(): string {
  // 8 days old — past PATCH_EFFECTIVENESS_TTL_MS = 7 * 24 * 60 * 60 * 1000
  return new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
}

function makeRecentDate(): string {
  // 6 days old — still within PATCH_EFFECTIVENESS_TTL_MS = 7 * 24 * 60 * 60 * 1000
  return new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
}

function makeFreshCache(partial: Partial<PatchCache>): PatchCache {
  return {
    patchesByEngine: {},
    generatedAt: new Date().toISOString(),
    appliedCount: 0,
    candidateCount: 0,
    ...partial,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── MIN_IMPROVEMENT_RATIO = 0.10 boundary ─────────────────────────────────────

describe("checkAndExpirePatches — MIN_IMPROVEMENT_RATIO = 0.10 boundary", () => {
  it("expires patch when improvement is 9% (< MIN_IMPROVEMENT_RATIO = 0.10)", async () => {
    // before=100, after=91 → (100-91)/100 = 0.09 < 0.10 → expires
    const cache = makeFreshCache({
      patchesByEngine: { campaign_analytics: [makePatch()] },
      metaByEngine: { campaign_analytics: { negativeCountBefore: 100, appliedAt: makeOldDate() } },
    });
    vi.mocked(safeStorage.getJSON).mockReturnValue(cache);
    mockGetPairs.mockResolvedValue(Array(91).fill({})); // 91 remaining = 9% improvement

    const expired = await checkAndExpirePatches();
    expect(expired).toBe(1);
  });

  it("does NOT expire patch when improvement is exactly 10% (= MIN_IMPROVEMENT_RATIO = 0.10)", async () => {
    // before=100, after=90 → (100-90)/100 = 0.10 — NOT < 0.10 → kept
    const cache = makeFreshCache({
      patchesByEngine: { campaign_analytics: [makePatch()] },
      metaByEngine: { campaign_analytics: { negativeCountBefore: 100, appliedAt: makeOldDate() } },
    });
    vi.mocked(safeStorage.getJSON).mockReturnValue(cache);
    mockGetPairs.mockResolvedValue(Array(90).fill({})); // 90 remaining = 10% improvement

    const expired = await checkAndExpirePatches();
    expect(expired).toBe(0);
  });

  it("does NOT expire patch when improvement exceeds 10%", async () => {
    // before=100, after=80 → 20% improvement > 0.10 → kept
    const cache = makeFreshCache({
      patchesByEngine: { campaign_analytics: [makePatch()] },
      metaByEngine: { campaign_analytics: { negativeCountBefore: 100, appliedAt: makeOldDate() } },
    });
    vi.mocked(safeStorage.getJSON).mockReturnValue(cache);
    mockGetPairs.mockResolvedValue(Array(80).fill({})); // 20% improvement

    const expired = await checkAndExpirePatches();
    expect(expired).toBe(0);
  });

  it("0% improvement (same count) expires patch", async () => {
    // before=50, after=50 → 0% improvement < 0.10 → expires
    const cache = makeFreshCache({
      patchesByEngine: { campaign_analytics: [makePatch()] },
      metaByEngine: { campaign_analytics: { negativeCountBefore: 50, appliedAt: makeOldDate() } },
    });
    vi.mocked(safeStorage.getJSON).mockReturnValue(cache);
    mockGetPairs.mockResolvedValue(Array(50).fill({})); // 0% improvement

    const expired = await checkAndExpirePatches();
    expect(expired).toBe(1);
  });
});

// ── PATCH_EFFECTIVENESS_TTL_MS = 7 * 24 * 60 * 60 * 1000 ─────────────────────

describe("checkAndExpirePatches — PATCH_EFFECTIVENESS_TTL_MS = 7 * 24 * 60 * 60 * 1000", () => {
  it("does NOT evaluate patches younger than PATCH_EFFECTIVENESS_TTL_MS = 7 * 24 * 60 * 60 * 1000 ms", async () => {
    // 6 days old — within 7-day window
    const cache = makeFreshCache({
      patchesByEngine: { campaign_analytics: [makePatch()] },
      metaByEngine: { campaign_analytics: { negativeCountBefore: 100, appliedAt: makeRecentDate() } },
    });
    vi.mocked(safeStorage.getJSON).mockReturnValue(cache);

    const expired = await checkAndExpirePatches();
    expect(mockGetPairs).not.toHaveBeenCalled();
    expect(expired).toBe(0);
  });

  it("evaluates patches older than PATCH_EFFECTIVENESS_TTL_MS = 7 * 24 * 60 * 60 * 1000 ms", async () => {
    // 8 days old — past 7-day window
    const cache = makeFreshCache({
      patchesByEngine: { campaign_analytics: [makePatch()] },
      metaByEngine: { campaign_analytics: { negativeCountBefore: 100, appliedAt: makeOldDate() } },
    });
    vi.mocked(safeStorage.getJSON).mockReturnValue(cache);
    mockGetPairs.mockResolvedValue(Array(100).fill({})); // 0% improvement → expires

    const expired = await checkAndExpirePatches();
    expect(mockGetPairs).toHaveBeenCalled();
    expect(expired).toBe(1);
  });
});
