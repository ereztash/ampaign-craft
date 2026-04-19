import { describe, it, expect, vi, beforeEach } from "vitest";
import { funnelAgent } from "../funnelAgent";
import { Blackboard } from "../../blackboardStore";

// ── Mock the funnel engine ────────────────────────────────────────────────
const mockFunnelResult = {
  funnelName: { he: "משפך מכירות טק", en: "Tech Sales Funnel" },
  stages: [
    {
      id: "awareness",
      name: { he: "מודעות", en: "Awareness" },
      budgetPercent: 40,
      channels: [
        {
          channel: "facebook",
          name: { he: "פייסבוק", en: "Facebook" },
          budgetPercent: 60,
          kpis: [{ he: "חשיפות", en: "Impressions" }],
          tips: [{ he: "השתמש בוידאו", en: "Use video" }],
        },
      ],
      description: { he: "בנה מודעות למותג", en: "Build brand awareness" },
    },
    {
      id: "conversion",
      name: { he: "המרה", en: "Conversion" },
      budgetPercent: 60,
      channels: [],
      description: { he: "המר לידים ללקוחות", en: "Convert leads to customers" },
    },
  ],
  totalBudget: 6000,
  formData: {} as any,
  hookTips: [],
  overallTips: [],
};

const mockPersonalizedResult = {
  ...mockFunnelResult,
  funnelName: { he: "משפך מותאם אישית", en: "Personalized Funnel" },
};

vi.mock("@/engine/funnelEngine", () => ({
  generateFunnel: vi.fn(() => mockFunnelResult),
  personalizeResult: vi.fn(() => mockPersonalizedResult),
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
    interests: "marketing",
    productDescription: "SaaS platform for marketing automation",
    averagePrice: 200,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

function makeKnowledgeGraph(overrides = {}) {
  return {
    business: { field: "tech", audience: "b2c" },
    derived: { identityStatement: { he: "פלטפורמת SaaS", en: "SaaS platform" } },
    ...overrides,
  };
}

describe("funnelAgent", () => {
  // ── Metadata ──────────────────────────────────────────────────────────────
  describe("Agent metadata", () => {
    it("has the correct name", () => {
      expect(funnelAgent.name).toBe("funnel");
    });

    it("depends on knowledgeGraph agent", () => {
      expect(funnelAgent.dependencies).toContain("knowledgeGraph");
    });

    it("writes to funnelResult section", () => {
      expect(funnelAgent.writes).toContain("funnelResult");
    });
  });

  // ── Happy-path (without knowledge graph) ─────────────────────────────────
  describe("Successful execution — no knowledge graph", () => {
    it("writes funnelResult to board when formData is present", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      funnelAgent.run(board);

      expect(board.get("funnelResult")).not.toBeNull();
    });

    it("calls generateFunnel with formData", async () => {
      const { generateFunnel } = await import("@/engine/funnelEngine");
      const board = makeBoard();
      const fd = makeFormData();
      board.set("formData", fd as any);

      funnelAgent.run(board);

      expect(generateFunnel).toHaveBeenCalledWith(fd);
    });

    it("does NOT call personalizeResult when knowledgeGraph is absent", async () => {
      const { personalizeResult } = await import("@/engine/funnelEngine");
      vi.mocked(personalizeResult).mockClear();
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      funnelAgent.run(board);

      expect(personalizeResult).not.toHaveBeenCalled();
    });

    it("result has stages array", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      funnelAgent.run(board);

      const result = board.get("funnelResult");
      expect(Array.isArray(result?.stages)).toBe(true);
      expect(result!.stages.length).toBeGreaterThan(0);
    });

    it("result has funnelName with he and en fields", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      funnelAgent.run(board);

      const result = board.get("funnelResult");
      expect(result?.funnelName).toHaveProperty("he");
      expect(result?.funnelName).toHaveProperty("en");
    });
  });

  // ── Happy-path (with knowledge graph) ────────────────────────────────────
  describe("Successful execution — with knowledge graph", () => {
    it("calls personalizeResult when knowledgeGraph is available", async () => {
      const { personalizeResult } = await import("@/engine/funnelEngine");
      vi.mocked(personalizeResult).mockClear();
      const board = makeBoard();
      board.set("formData", makeFormData() as any);
      board.set("knowledgeGraph", makeKnowledgeGraph() as any);

      funnelAgent.run(board);

      expect(personalizeResult).toHaveBeenCalled();
    });

    it("uses personalized result from personalizeResult", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);
      board.set("knowledgeGraph", makeKnowledgeGraph() as any);

      funnelAgent.run(board);

      const result = board.get("funnelResult");
      // mock returns personalized result with different funnelName
      expect(result?.funnelName.en).toBe("Personalized Funnel");
    });
  });

  // ── Guard clauses ─────────────────────────────────────────────────────────
  describe("Guard clauses", () => {
    it("does nothing when formData is missing", () => {
      const board = makeBoard();

      funnelAgent.run(board);

      expect(board.get("funnelResult")).toBeNull();
    });
  });

  // ── Idempotency ───────────────────────────────────────────────────────────
  describe("Idempotency", () => {
    it("overwrites previous funnelResult on re-run", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      funnelAgent.run(board);
      const first = board.get("funnelResult");

      funnelAgent.run(board);
      const second = board.get("funnelResult");

      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
    });
  });
});
