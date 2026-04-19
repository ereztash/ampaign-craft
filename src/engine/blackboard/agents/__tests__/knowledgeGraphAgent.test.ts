import { describe, it, expect, vi } from "vitest";
import { knowledgeGraphAgent } from "../knowledgeGraphAgent";
import { Blackboard } from "../../blackboardStore";

// ── Mock the user knowledge graph engine ──────────────────────────────────
vi.mock("@/engine/userKnowledgeGraph", () => ({
  buildUserKnowledgeGraph: vi.fn((formData) => ({
    business: {
      field: formData.businessField,
      audience: formData.audienceType,
      pricePoint: formData.averagePrice,
    },
    derived: {
      identityStatement: {
        he: `עסק ב${formData.businessField}`,
        en: `Business in ${formData.businessField}`,
      },
      keyBenefits: [{ he: "יתרון עיקרי", en: "Key benefit" }],
      targetPersona: { he: "פרסונת יעד", en: "Target persona" },
    },
    channels: formData.existingChannels,
    goals: { primary: formData.mainGoal },
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
    existingChannels: ["facebook", "instagram", "email"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

describe("knowledgeGraphAgent", () => {
  // ── Metadata ──────────────────────────────────────────────────────────────
  describe("Agent metadata", () => {
    it("has the correct name", () => {
      expect(knowledgeGraphAgent.name).toBe("knowledgeGraph");
    });

    it("has no dependencies (root agent)", () => {
      expect(knowledgeGraphAgent.dependencies).toEqual([]);
    });

    it("writes to knowledgeGraph section", () => {
      expect(knowledgeGraphAgent.writes).toContain("knowledgeGraph");
    });
  });

  // ── Happy-path ────────────────────────────────────────────────────────────
  describe("Successful execution", () => {
    it("writes knowledgeGraph to board when formData is present", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      knowledgeGraphAgent.run(board);

      expect(board.get("knowledgeGraph")).not.toBeNull();
    });

    it("produces a graph with business section", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      knowledgeGraphAgent.run(board);

      const graph = board.get("knowledgeGraph");
      expect(graph).toHaveProperty("business");
    });

    it("produces a graph with derived section", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      knowledgeGraphAgent.run(board);

      const graph = board.get("knowledgeGraph");
      expect(graph).toHaveProperty("derived");
    });

    it("calls buildUserKnowledgeGraph with the formData", async () => {
      const { buildUserKnowledgeGraph } = await import("@/engine/userKnowledgeGraph");
      const board = makeBoard();
      const fd = makeFormData();
      board.set("formData", fd as any);

      knowledgeGraphAgent.run(board);

      expect(buildUserKnowledgeGraph).toHaveBeenCalledWith(fd);
    });

    it("reflects business field from formData", () => {
      const board = makeBoard();
      board.set("formData", makeFormData({ businessField: "fashion" }) as any);

      knowledgeGraphAgent.run(board);

      const graph = board.get("knowledgeGraph") as any;
      expect(graph.business.field).toBe("fashion");
    });

    it("reflects audience type from formData", () => {
      const board = makeBoard();
      board.set("formData", makeFormData({ audienceType: "b2b" }) as any);

      knowledgeGraphAgent.run(board);

      const graph = board.get("knowledgeGraph") as any;
      expect(graph.business.audience).toBe("b2b");
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────
  describe("Edge cases", () => {
    it("handles different business fields correctly", () => {
      const fields = ["fashion", "tech", "food", "services", "education", "health", "realEstate"];
      for (const businessField of fields) {
        const board = makeBoard();
        board.set("formData", makeFormData({ businessField }) as any);

        knowledgeGraphAgent.run(board);

        expect(board.get("knowledgeGraph")).not.toBeNull();
      }
    });

    it("handles b2b audience type", () => {
      const board = makeBoard();
      board.set("formData", makeFormData({ audienceType: "b2b" }) as any);

      knowledgeGraphAgent.run(board);

      expect(board.get("knowledgeGraph")).not.toBeNull();
    });

    it("handles empty existingChannels", () => {
      const board = makeBoard();
      board.set("formData", makeFormData({ existingChannels: [] }) as any);

      knowledgeGraphAgent.run(board);

      expect(board.get("knowledgeGraph")).not.toBeNull();
    });
  });

  // ── Guard clauses ─────────────────────────────────────────────────────────
  describe("Guard clauses", () => {
    it("does nothing when formData is missing", () => {
      const board = makeBoard();

      knowledgeGraphAgent.run(board);

      expect(board.get("knowledgeGraph")).toBeNull();
    });
  });

  // ── Idempotency ───────────────────────────────────────────────────────────
  describe("Idempotency", () => {
    it("overwrites previous knowledgeGraph on re-run", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      knowledgeGraphAgent.run(board);
      const first = board.get("knowledgeGraph");

      knowledgeGraphAgent.run(board);
      const second = board.get("knowledgeGraph");

      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
    });
  });
});
