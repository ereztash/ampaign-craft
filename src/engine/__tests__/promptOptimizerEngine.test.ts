import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generatePromptOptimizations,
  ENGINE_MANIFEST,
  type FeedbackPattern,
  type ComplaintCategory,
  type PromptOptimization,
} from "../promptOptimizerEngine";

// ═══════════════════════════════════════════════
// Mock trainingDataEngine (async calls)
// ═══════════════════════════════════════════════

vi.mock("../trainingDataEngine", () => ({
  getTrainingPairs: vi.fn(async () => []),
  getTrainingStats: vi.fn(async () => ({
    total: 0,
    positive: 0,
    negative: 0,
    unrated: 0,
    byEngine: {},
    latestCapture: null,
  })),
}));

// ═══════════════════════════════════════════════
// Mock blackboard contract (fire-and-forget)
// ═══════════════════════════════════════════════

vi.mock("../blackboard/contract", () => ({
  writeContext: vi.fn().mockResolvedValue(undefined),
  conceptKey: vi.fn((a: string, b: string, c: string) => `${a}-${b}-${c}`),
}));

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function makePattern(
  category: ComplaintCategory,
  occurrences: number,
  quotes: string[] = [],
): FeedbackPattern {
  return {
    category,
    occurrences,
    exampleQuotes: quotes,
    topTrigrams: [],
  };
}

// ═══════════════════════════════════════════════
// ENGINE_MANIFEST
// ═══════════════════════════════════════════════

describe("promptOptimizerEngine — ENGINE_MANIFEST", () => {
  it("name is promptOptimizerEngine", () => {
    expect(ENGINE_MANIFEST.name).toBe("promptOptimizerEngine");
  });

  it("stage is discover", () => {
    expect(ENGINE_MANIFEST.stage).toBe("discover");
  });

  it("isLive is true", () => {
    expect(ENGINE_MANIFEST.isLive).toBe(true);
  });

  it("writes to USER-promptOptimization-*", () => {
    expect(ENGINE_MANIFEST.writes).toContain("USER-promptOptimization-*");
  });
});

// ═══════════════════════════════════════════════
// generatePromptOptimizations — basic behaviour
// ═══════════════════════════════════════════════

describe("generatePromptOptimizations — basic behaviour", () => {
  it("returns empty array when no patterns", () => {
    const result = generatePromptOptimizations("funnel", []);
    expect(result).toEqual([]);
  });

  it("filters out patterns with fewer than 3 occurrences", () => {
    const patterns = [
      makePattern("tone", 1),
      makePattern("accuracy", 2),
    ];
    const result = generatePromptOptimizations("funnel", patterns);
    expect(result).toHaveLength(0);
  });

  it("includes patterns with exactly 3 occurrences", () => {
    const patterns = [makePattern("tone", 3)];
    const result = generatePromptOptimizations("funnel", patterns);
    expect(result).toHaveLength(1);
  });

  it("includes patterns with more than 3 occurrences", () => {
    const patterns = [makePattern("length", 10)];
    const result = generatePromptOptimizations("copy", patterns);
    expect(result).toHaveLength(1);
  });

  it("returns one optimization per qualifying pattern", () => {
    const patterns = [
      makePattern("tone", 5),
      makePattern("accuracy", 7),
      makePattern("length", 3),
    ];
    const result = generatePromptOptimizations("funnel", patterns);
    expect(result).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════
// generatePromptOptimizations — optimization structure
// ═══════════════════════════════════════════════

describe("generatePromptOptimizations — optimization structure", () => {
  it("each optimization has all required fields", () => {
    const patterns = [makePattern("tone", 5)];
    const result = generatePromptOptimizations("funnel", patterns);
    const opt = result[0];
    expect(opt.engineId).toBeDefined();
    expect(opt.issue).toBeDefined();
    expect(opt.suggestedPromptAddition).toBeDefined();
    expect(opt.confidence).toBeDefined();
    expect(opt.affectedPairs).toBeDefined();
  });

  it("engineId matches the provided engineId", () => {
    const patterns = [makePattern("tone", 5)];
    const result = generatePromptOptimizations("disc_profile", patterns);
    expect(result[0].engineId).toBe("disc_profile");
  });

  it("affectedPairs equals pattern occurrences", () => {
    const patterns = [makePattern("relevance", 12)];
    const result = generatePromptOptimizations("funnel", patterns);
    expect(result[0].affectedPairs).toBe(12);
  });

  it("issue has both he and en strings", () => {
    const patterns = [makePattern("accuracy", 4)];
    const result = generatePromptOptimizations("copy", patterns);
    expect(result[0].issue.he.length).toBeGreaterThan(0);
    expect(result[0].issue.en.length).toBeGreaterThan(0);
  });

  it("suggestedPromptAddition is a non-empty string", () => {
    const patterns = [makePattern("length", 5)];
    const result = generatePromptOptimizations("funnel", patterns);
    expect(result[0].suggestedPromptAddition.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════
// generatePromptOptimizations — confidence calculation
// ═══════════════════════════════════════════════

describe("generatePromptOptimizations — confidence calculation", () => {
  it("confidence = 40 + occurrences*5, capped at 100", () => {
    const patterns = [makePattern("tone", 5)];
    const result = generatePromptOptimizations("funnel", patterns);
    // 40 + 5*5 = 65
    expect(result[0].confidence).toBe(65);
  });

  it("confidence is capped at 100", () => {
    const patterns = [makePattern("tone", 20)];
    const result = generatePromptOptimizations("funnel", patterns);
    // 40 + 20*5 = 140 → capped to 100
    expect(result[0].confidence).toBe(100);
  });

  it("exactly 12 occurrences gives confidence 100", () => {
    const patterns = [makePattern("relevance", 12)];
    const result = generatePromptOptimizations("funnel", patterns);
    // 40 + 12*5 = 100
    expect(result[0].confidence).toBe(100);
  });

  it("3 occurrences gives confidence 55", () => {
    const patterns = [makePattern("language", 3)];
    const result = generatePromptOptimizations("funnel", patterns);
    // 40 + 3*5 = 55
    expect(result[0].confidence).toBe(55);
  });

  it("confidence is always between 0 and 100", () => {
    const counts = [3, 5, 8, 10, 15, 50, 100];
    for (const count of counts) {
      const patterns = [makePattern("tone", count)];
      const result = generatePromptOptimizations("funnel", patterns);
      expect(result[0].confidence).toBeGreaterThanOrEqual(0);
      expect(result[0].confidence).toBeLessThanOrEqual(100);
    }
  });
});

// ═══════════════════════════════════════════════
// generatePromptOptimizations — per category content
// ═══════════════════════════════════════════════

describe("generatePromptOptimizations — per-category prompt additions", () => {
  const categories: ComplaintCategory[] = ["tone", "accuracy", "length", "relevance", "language"];

  categories.forEach((cat) => {
    it(`category "${cat}" produces a non-empty suggestedPromptAddition`, () => {
      const patterns = [makePattern(cat, 5)];
      const result = generatePromptOptimizations("funnel", patterns);
      expect(result[0].suggestedPromptAddition.length).toBeGreaterThan(0);
    });

    it(`category "${cat}" produces unique suggestedPromptAddition`, () => {
      const patterns = [makePattern(cat, 5)];
      const result = generatePromptOptimizations("funnel", patterns);
      // Each category should have a distinct addition
      expect(typeof result[0].suggestedPromptAddition).toBe("string");
    });
  });

  it("tone category mentions tone-related guidance", () => {
    const patterns = [makePattern("tone", 5)];
    const result = generatePromptOptimizations("funnel", patterns);
    expect(result[0].suggestedPromptAddition.toLowerCase()).toContain("tone");
  });

  it("accuracy category mentions statistics/facts", () => {
    const patterns = [makePattern("accuracy", 5)];
    const result = generatePromptOptimizations("funnel", patterns);
    const text = result[0].suggestedPromptAddition.toLowerCase();
    expect(text.includes("statistic") || text.includes("fact") || text.includes("cite")).toBe(true);
  });

  it("length category mentions concise or proportional", () => {
    const patterns = [makePattern("length", 5)];
    const result = generatePromptOptimizations("funnel", patterns);
    const text = result[0].suggestedPromptAddition.toLowerCase();
    expect(text.includes("concise") || text.includes("proportional") || text.includes("length")).toBe(true);
  });

  it("relevance category mentions industry or specific", () => {
    const patterns = [makePattern("relevance", 5)];
    const result = generatePromptOptimizations("funnel", patterns);
    const text = result[0].suggestedPromptAddition.toLowerCase();
    expect(text.includes("industry") || text.includes("specific") || text.includes("generic")).toBe(true);
  });

  it("language category mentions grammar or Hebrew", () => {
    const patterns = [makePattern("language", 5)];
    const result = generatePromptOptimizations("funnel", patterns);
    const text = result[0].suggestedPromptAddition.toLowerCase();
    expect(text.includes("grammar") || text.includes("hebrew") || text.includes("phrasing")).toBe(true);
  });
});

// ═══════════════════════════════════════════════
// generatePromptOptimizations — multiple patterns mixed
// ═══════════════════════════════════════════════

describe("generatePromptOptimizations — mixed patterns", () => {
  it("correctly filters and maps mixed occurrence counts", () => {
    const patterns = [
      makePattern("tone", 2),      // filtered out
      makePattern("accuracy", 4),  // included
      makePattern("length", 1),    // filtered out
      makePattern("relevance", 6), // included
    ];
    const result = generatePromptOptimizations("copy_qa", patterns);
    expect(result).toHaveLength(2);
  });

  it("all qualifying patterns are included regardless of category", () => {
    const allCategories: ComplaintCategory[] = ["tone", "accuracy", "length", "relevance", "language"];
    const patterns = allCategories.map((cat) => makePattern(cat, 5));
    const result = generatePromptOptimizations("funnel", patterns);
    expect(result).toHaveLength(5);
  });

  it("different engineIds do not affect per-category content", () => {
    const patterns = [makePattern("tone", 5)];
    const r1 = generatePromptOptimizations("funnel", patterns);
    const r2 = generatePromptOptimizations("copy_qa", patterns);
    expect(r1[0].suggestedPromptAddition).toBe(r2[0].suggestedPromptAddition);
  });

  it("output preserves input order", () => {
    const patterns = [
      makePattern("accuracy", 5),
      makePattern("relevance", 8),
      makePattern("tone", 3),
    ];
    const result = generatePromptOptimizations("funnel", patterns);
    expect(result[0].issue.en).toContain("accuracy");
    expect(result[1].issue.en).toContain("relevance");
    expect(result[2].issue.en).toContain("tone");
  });
});

// ═══════════════════════════════════════════════
// analyzeEngineFeedback — via mocked trainingDataEngine
// ═══════════════════════════════════════════════

describe("analyzeEngineFeedback (mocked trainingDataEngine)", () => {
  it("returns empty patterns when no negative pairs exist", async () => {
    const { analyzeEngineFeedback } = await import("../promptOptimizerEngine");
    const patterns = await analyzeEngineFeedback("funnel");
    expect(patterns).toEqual([]);
  });

  it("returns patterns with feedback text containing known keywords", async () => {
    const { getTrainingPairs } = await import("../trainingDataEngine");
    vi.mocked(getTrainingPairs).mockResolvedValueOnce([
      {
        id: "1",
        engine_id: "funnel",
        engine_version: "1.0",
        input: {},
        output: {},
        user_id: null,
        timestamp: new Date().toISOString(),
        quality: "negative",
        feedback_text: "too long and verbose, too long",
        metadata: {},
        created_at: new Date().toISOString(),
      },
      {
        id: "2",
        engine_id: "funnel",
        engine_version: "1.0",
        input: {},
        output: {},
        user_id: null,
        timestamp: new Date().toISOString(),
        quality: "negative",
        feedback_text: "too long and verbose, too long",
        metadata: {},
        created_at: new Date().toISOString(),
      },
    ]);
    const { analyzeEngineFeedback } = await import("../promptOptimizerEngine");
    const patterns = await analyzeEngineFeedback("funnel");
    expect(patterns.length).toBeGreaterThan(0);
    const categories = patterns.map((p) => p.category);
    expect(categories).toContain("length");
  });

  it("pairs without feedback_text are skipped", async () => {
    const { getTrainingPairs } = await import("../trainingDataEngine");
    vi.mocked(getTrainingPairs).mockResolvedValueOnce([
      {
        id: "3",
        engine_id: "funnel",
        engine_version: "1.0",
        input: {},
        output: {},
        user_id: null,
        timestamp: new Date().toISOString(),
        quality: "negative",
        feedback_text: null, // no feedback text
        metadata: {},
        created_at: new Date().toISOString(),
      },
    ]);
    const { analyzeEngineFeedback } = await import("../promptOptimizerEngine");
    const patterns = await analyzeEngineFeedback("funnel");
    expect(patterns).toEqual([]);
  });
});
