import { describe, it, expect, vi } from "vitest";
import { hormoziAgent } from "../hormoziAgent";
import { Blackboard } from "../../blackboardStore";

// ── Mock the Hormozi value engine ─────────────────────────────────────────
vi.mock("@/engine/hormoziValueEngine", () => ({
  calculateValueScore: vi.fn(() => ({
    overallScore: 82,
    dreamOutcome: { he: "תוצאה חלומית", en: "Dream outcome" },
    perceivedLikelihood: 75,
    timeDelay: { he: "השגה בתוך 3 חודשים", en: "Achieved within 3 months" },
    effortSacrifice: { he: "מינימום מאמץ", en: "Minimum effort" },
    valueEquation: {
      numerator: ["dreamOutcome", "perceivedLikelihood"],
      denominator: ["timeDelay", "effortSacrifice"],
    },
    offer: { he: "הצעת ערך מדהימה", en: "Amazing value offer" },
    priceJustification: { he: "המחיר מוצדק לחלוטין", en: "Price fully justified" },
    bonuses: [{ he: "בונוס 1", en: "Bonus 1" }],
    guarantee: { he: "אחריות מלאה", en: "Full guarantee" },
    scarcity: { he: "מלאי מוגבל", en: "Limited stock" },
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────
function makeBoard() {
  return new Blackboard();
}

function makeFormData(overrides = {}) {
  return {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45] as [number, number],
    interests: "marketing automation",
    productDescription: "SaaS platform for marketing automation",
    averagePrice: 200,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook", "google"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

function makeKnowledgeGraph(overrides = {}) {
  return {
    business: { field: "tech", audience: "b2c" },
    derived: {
      identityStatement: { he: "פלטפורמת SaaS", en: "SaaS platform" },
    },
    ...overrides,
  };
}

describe("hormoziAgent", () => {
  // ── Metadata ──────────────────────────────────────────────────────────────
  describe("Agent metadata", () => {
    it("has the correct name", () => {
      expect(hormoziAgent.name).toBe("hormozi");
    });

    it("depends on knowledgeGraph agent", () => {
      expect(hormoziAgent.dependencies).toContain("knowledgeGraph");
    });

    it("writes to hormoziValue section", () => {
      expect(hormoziAgent.writes).toContain("hormoziValue");
    });
  });

  // ── Happy-path ────────────────────────────────────────────────────────────
  describe("Successful execution", () => {
    it("writes hormoziValue to board when formData is present", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      hormoziAgent.run(board);

      expect(board.get("hormoziValue")).not.toBeNull();
    });

    it("produces hormoziValue with overallScore", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      hormoziAgent.run(board);

      const result = board.get("hormoziValue");
      expect(typeof result?.overallScore).toBe("number");
    });

    it("produces hormoziValue with all required fields", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      hormoziAgent.run(board);

      const result = board.get("hormoziValue");
      expect(result).toHaveProperty("dreamOutcome");
      expect(result).toHaveProperty("perceivedLikelihood");
      expect(result).toHaveProperty("timeDelay");
      expect(result).toHaveProperty("effortSacrifice");
      expect(result).toHaveProperty("offer");
      expect(result).toHaveProperty("guarantee");
    });

    it("calls calculateValueScore with formData and graph", async () => {
      const { calculateValueScore } = await import("@/engine/hormoziValueEngine");
      const board = makeBoard();
      const fd = makeFormData();
      const graph = makeKnowledgeGraph();
      board.set("formData", fd as any);
      board.set("knowledgeGraph", graph as any);

      hormoziAgent.run(board);

      expect(calculateValueScore).toHaveBeenCalledWith(fd, graph);
    });

    it("passes null graph when knowledgeGraph is absent", async () => {
      const { calculateValueScore } = await import("@/engine/hormoziValueEngine");
      vi.mocked(calculateValueScore).mockClear();
      const board = makeBoard();
      const fd = makeFormData();
      board.set("formData", fd as any);

      hormoziAgent.run(board);

      expect(calculateValueScore).toHaveBeenCalledWith(fd, null);
    });

    it("overallScore is a positive number", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      hormoziAgent.run(board);

      const result = board.get("hormoziValue");
      expect(result!.overallScore).toBeGreaterThan(0);
    });
  });

  // ── Guard clauses ─────────────────────────────────────────────────────────
  describe("Guard clauses", () => {
    it("does nothing when formData is missing", () => {
      const board = makeBoard();

      hormoziAgent.run(board);

      expect(board.get("hormoziValue")).toBeNull();
    });

    it("runs successfully without knowledgeGraph", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      hormoziAgent.run(board);

      expect(board.get("hormoziValue")).not.toBeNull();
    });
  });

  // ── Idempotency ───────────────────────────────────────────────────────────
  describe("Idempotency", () => {
    it("overwrites previous hormoziValue on re-run", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      hormoziAgent.run(board);
      const first = board.get("hormoziValue");

      hormoziAgent.run(board);
      const second = board.get("hormoziValue");

      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
    });
  });
});
