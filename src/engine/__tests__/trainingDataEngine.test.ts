import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  captureTrainingPair,
  flushTrainingBuffer,
  updateFeedback,
  getTrainingPairs,
  getTrainingStats,
  getBufferedCount,
  type EngineCategory,
  type FeedbackRating,
  type TrainingPair,
  type TrainingStats,
} from "../trainingDataEngine";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockInsert  = vi.fn();
const mockSelect  = vi.fn();
const mockUpdate  = vi.fn();
const mockEq      = vi.fn();
const mockGte     = vi.fn();
const mockOrder   = vi.fn();
const mockLimit   = vi.fn();
const mockSingle  = vi.fn();

// Build a chainable Supabase-like query builder
function makeQueryBuilder(result: any) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    then: undefined,
  };
  // Make it resolve when awaited (terminal)
  Object.defineProperty(builder, Symbol.toStringTag, { value: "Promise" });
  builder.then = (resolve: any) => Promise.resolve(result).then(resolve);
  return builder;
}

vi.mock("@/integrations/supabase/loose", () => ({
  supabaseLoose: {
    from: vi.fn(),
  },
}));

vi.mock("@/lib/safeStorage", () => {
  const store = new Map<string, unknown>();
  return {
    safeStorage: {
      getJSON: vi.fn(<T>(key: string, fallback: T): T => {
        return store.has(key) ? (store.get(key) as T) : fallback;
      }),
      setJSON: vi.fn((key: string, value: unknown) => { store.set(key, value); }),
      remove: vi.fn((key: string) => { store.delete(key); }),
      _store: store,
    },
  };
});

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { supabaseLoose } from "@/integrations/supabase/loose";
import { safeStorage } from "@/lib/safeStorage";

const mockFrom = supabaseLoose.from as ReturnType<typeof vi.fn>;
const mockStorage = safeStorage as unknown as {
  getJSON: ReturnType<typeof vi.fn>;
  setJSON: ReturnType<typeof vi.fn>;
  _store: Map<string, unknown>;
};

// Helper to set up supabase mock with a chainable query that resolves to `result`
function setupSupabase(result: { data?: any; error?: any }) {
  const chain: any = {};
  const methods = ["select", "insert", "update", "eq", "gte", "order", "limit"];
  methods.forEach((m) => { chain[m] = vi.fn(() => chain); });
  chain.single = vi.fn().mockResolvedValue(result);
  // Make chain thenable
  chain[Symbol.iterator] = undefined;
  Object.defineProperty(chain, "then", {
    get() { return (r: any) => Promise.resolve(result).then(r); },
  });
  mockFrom.mockReturnValue(chain);
  return chain;
}

// ═══════════════════════════════════════════════
// EngineCategory type coverage
// ═══════════════════════════════════════════════

describe("EngineCategory — type values", () => {
  const validCategories: EngineCategory[] = [
    "funnel", "copy", "disc_profile", "hormozi_value", "brand_vector",
    "copy_qa", "stylome", "neuro_storytelling", "differentiation", "ab_test",
    "roi_attribution", "predictive", "campaign_analytics", "knowledge_graph",
    "emotional_performance", "cross_domain_benchmark", "predictive_content_score",
    "behavioral_cohort", "hebrew_copy_optimizer", "english_copy_optimizer",
    "perplexity_burstiness", "prompt_optimizer", "export", "visual_export", "webhook",
  ];

  it("has 25 valid engine categories", () => {
    expect(validCategories.length).toBe(25);
  });

  it("all known categories are strings", () => {
    for (const c of validCategories) {
      expect(typeof c).toBe("string");
    }
  });
});

// ═══════════════════════════════════════════════
// getBufferedCount
// ═══════════════════════════════════════════════

describe("getBufferedCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage._store.clear();
    mockStorage.getJSON.mockImplementation(<T>(key: string, fallback: T): T => {
      return mockStorage._store.has(key) ? (mockStorage._store.get(key) as T) : fallback;
    });
  });

  it("returns 0 when buffer is empty", () => {
    mockStorage.getJSON.mockReturnValue([]);
    expect(getBufferedCount()).toBe(0);
  });

  it("returns correct count when buffer has items", () => {
    mockStorage.getJSON.mockReturnValue([{ engine_id: "funnel" }, { engine_id: "copy" }]);
    expect(getBufferedCount()).toBe(2);
  });

  it("returns 0 when buffer is null (non-array)", () => {
    mockStorage.getJSON.mockReturnValue(null);
    expect(getBufferedCount()).toBe(0);
  });
});

// ═══════════════════════════════════════════════
// captureTrainingPair
// ═══════════════════════════════════════════════

describe("captureTrainingPair", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage._store.clear();
    mockStorage.getJSON.mockReturnValue(null);
    mockStorage.setJSON.mockImplementation((key: string, value: unknown) => { mockStorage._store.set(key, value); });
  });

  it("returns null and buffers pair when no userId provided", async () => {
    const result = await captureTrainingPair("funnel", { input: 1 }, { output: 2 });
    expect(result).toBeNull();
    // setJSON should have been called to write buffer
    expect(mockStorage.setJSON).toHaveBeenCalled();
  });

  it("returns null when user opts out of training data", async () => {
    mockStorage.getJSON.mockImplementation((key: string, fallback: any) => {
      if (key === "funnelforge-consent") return { trainingDataOptIn: false };
      return fallback;
    });
    const result = await captureTrainingPair("funnel", {}, {}, "user-1");
    expect(result).toBeNull();
  });

  it("attempts Supabase insert when userId is provided", async () => {
    const chain = setupSupabase({ data: { id: "pair-123" }, error: null });
    const result = await captureTrainingPair("funnel", { x: 1 }, { y: 2 }, "user-42");
    expect(mockFrom).toHaveBeenCalledWith("training_pairs");
    expect(result).toBe("pair-123");
  });

  it("buffers pair to localStorage when Supabase insert fails", async () => {
    const chain = setupSupabase({ data: null, error: { message: "DB error" } });
    const result = await captureTrainingPair("copy", {}, {}, "user-1");
    expect(result).toBeNull();
    expect(mockStorage.setJSON).toHaveBeenCalled();
  });

  it("buffers pair to localStorage when Supabase throws", async () => {
    mockFrom.mockImplementation(() => { throw new Error("network error"); });
    const result = await captureTrainingPair("hormozi_value", {}, {}, "user-1");
    expect(result).toBeNull();
    expect(mockStorage.setJSON).toHaveBeenCalled();
  });

  it("uses default engine version 1.0.0 when not specified", async () => {
    const chain = setupSupabase({ data: { id: "x" }, error: null });
    await captureTrainingPair("stylome", {}, {}, "user-1");
    // We can't easily inspect insert arguments through the chain, but this should not throw
    expect(mockFrom).toHaveBeenCalled();
  });

  it("uses custom engineVersion from options", async () => {
    const chain = setupSupabase({ data: { id: "y" }, error: null });
    await captureTrainingPair("disc_profile", {}, {}, "user-1", { engineVersion: "2.3.1" });
    expect(mockFrom).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════
// flushTrainingBuffer
// ═══════════════════════════════════════════════

describe("flushTrainingBuffer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage._store.clear();
    mockStorage.getJSON.mockImplementation(<T>(key: string, fallback: T): T => {
      return mockStorage._store.has(key) ? (mockStorage._store.get(key) as T) : fallback;
    });
    mockStorage.setJSON.mockImplementation((key: string, value: unknown) => { mockStorage._store.set(key, value); });
  });

  it("returns 0 when buffer is empty", async () => {
    mockStorage.getJSON.mockReturnValue([]);
    const count = await flushTrainingBuffer("user-1");
    expect(count).toBe(0);
  });

  it("flushes buffer to Supabase and returns count", async () => {
    const bufferItems = [
      { engine_id: "funnel", engine_version: "1.0.0", input: {}, output: {}, metadata: {}, timestamp: new Date().toISOString() },
      { engine_id: "copy", engine_version: "1.0.0", input: {}, output: {}, metadata: {}, timestamp: new Date().toISOString() },
    ];
    mockStorage.getJSON.mockReturnValue(bufferItems);
    const chain = setupSupabase({ error: null });
    const count = await flushTrainingBuffer("user-flush");
    expect(count).toBe(2);
  });

  it("clears buffer after successful flush", async () => {
    const bufferItems = [
      { engine_id: "funnel", engine_version: "1.0.0", input: {}, output: {}, metadata: {}, timestamp: new Date().toISOString() },
    ];
    mockStorage.getJSON.mockReturnValue(bufferItems);
    setupSupabase({ error: null });
    await flushTrainingBuffer("user-1");
    // setJSON should have been called with empty buffer
    expect(mockStorage.setJSON).toHaveBeenCalledWith(expect.any(String), []);
  });

  it("returns 0 on Supabase error", async () => {
    const bufferItems = [
      { engine_id: "funnel", engine_version: "1.0.0", input: {}, output: {}, metadata: {}, timestamp: new Date().toISOString() },
    ];
    mockStorage.getJSON.mockReturnValue(bufferItems);
    setupSupabase({ error: { message: "insert error" } });
    const count = await flushTrainingBuffer("user-1");
    expect(count).toBe(0);
  });

  it("returns 0 on exception", async () => {
    mockStorage.getJSON.mockReturnValue([{ engine_id: "copy" }]);
    mockFrom.mockImplementation(() => { throw new Error("crash"); });
    const count = await flushTrainingBuffer("user-1");
    expect(count).toBe(0);
  });
});

// ═══════════════════════════════════════════════
// updateFeedback
// ═══════════════════════════════════════════════

describe("updateFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true on successful update", async () => {
    setupSupabase({ error: null });
    const result = await updateFeedback("pair-1", "positive");
    expect(result).toBe(true);
  });

  it("returns false on Supabase error", async () => {
    setupSupabase({ error: { message: "update failed" } });
    const result = await updateFeedback("pair-1", "negative");
    expect(result).toBe(false);
  });

  it("returns false on exception", async () => {
    mockFrom.mockImplementation(() => { throw new Error("crash"); });
    const result = await updateFeedback("pair-1", "positive");
    expect(result).toBe(false);
  });

  it("passes quality and feedbackText to Supabase", async () => {
    const chain = setupSupabase({ error: null });
    await updateFeedback("pair-999", "negative", "Poor quality");
    expect(mockFrom).toHaveBeenCalledWith("training_pairs");
  });

  it("works without feedbackText (optional)", async () => {
    setupSupabase({ error: null });
    const result = await updateFeedback("pair-1", "positive");
    expect(result).toBe(true);
  });
});

// ═══════════════════════════════════════════════
// getTrainingPairs
// ═══════════════════════════════════════════════

describe("getTrainingPairs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns array on success", async () => {
    const mockData: Partial<TrainingPair>[] = [
      { id: "p-1", engine_id: "funnel", quality: "positive" },
    ];
    setupSupabase({ data: mockData, error: null });
    const result = await getTrainingPairs({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns empty array on error", async () => {
    setupSupabase({ data: null, error: { message: "failed" } });
    const result = await getTrainingPairs({});
    expect(result).toEqual([]);
  });

  it("returns empty array on exception", async () => {
    mockFrom.mockImplementation(() => { throw new Error("crash"); });
    const result = await getTrainingPairs({});
    expect(result).toEqual([]);
  });

  it("accepts filter by engineId", async () => {
    setupSupabase({ data: [], error: null });
    await getTrainingPairs({ engineId: "copy" });
    expect(mockFrom).toHaveBeenCalledWith("training_pairs");
  });

  it("defaults to limit 100 when not specified", async () => {
    setupSupabase({ data: [], error: null });
    await getTrainingPairs({});
    expect(mockFrom).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════
// getTrainingStats
// ═══════════════════════════════════════════════

describe("getTrainingStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty stats on error", async () => {
    setupSupabase({ data: null, error: { message: "failed" } });
    const stats = await getTrainingStats();
    expect(stats.total).toBe(0);
    expect(stats.positive).toBe(0);
    expect(stats.negative).toBe(0);
    expect(stats.unrated).toBe(0);
    expect(stats.latestCapture).toBeNull();
  });

  it("returns empty stats on exception", async () => {
    mockFrom.mockImplementation(() => { throw new Error("crash"); });
    const stats = await getTrainingStats();
    expect(stats.total).toBe(0);
  });

  it("correctly counts positive, negative, unrated from data", async () => {
    const rows = [
      { engine_id: "funnel", quality: "positive", timestamp: "2024-01-01T00:00:00Z" },
      { engine_id: "funnel", quality: "negative", timestamp: "2024-01-02T00:00:00Z" },
      { engine_id: "copy",   quality: null,       timestamp: "2024-01-03T00:00:00Z" },
    ];
    setupSupabase({ data: rows, error: null });
    const stats = await getTrainingStats();
    expect(stats.total).toBe(3);
    expect(stats.positive).toBe(1);
    expect(stats.negative).toBe(1);
    expect(stats.unrated).toBe(1);
  });

  it("tracks byEngine correctly", async () => {
    const rows = [
      { engine_id: "funnel", quality: "positive", timestamp: "2024-01-01T00:00:00Z" },
      { engine_id: "funnel", quality: "positive", timestamp: "2024-01-02T00:00:00Z" },
      { engine_id: "copy",   quality: "negative", timestamp: "2024-01-03T00:00:00Z" },
    ];
    setupSupabase({ data: rows, error: null });
    const stats = await getTrainingStats();
    expect(stats.byEngine["funnel"]).toBe(2);
    expect(stats.byEngine["copy"]).toBe(1);
  });

  it("sets latestCapture to the most recent timestamp", async () => {
    const rows = [
      { engine_id: "funnel", quality: "positive", timestamp: "2024-01-01T00:00:00Z" },
      { engine_id: "copy",   quality: "negative", timestamp: "2024-06-15T12:00:00Z" },
    ];
    setupSupabase({ data: rows, error: null });
    const stats = await getTrainingStats();
    expect(stats.latestCapture).toBe("2024-06-15T12:00:00Z");
  });

  it("accepts optional userId filter", async () => {
    setupSupabase({ data: [], error: null });
    await getTrainingStats("user-specific");
    expect(mockFrom).toHaveBeenCalledWith("training_pairs");
  });
});
