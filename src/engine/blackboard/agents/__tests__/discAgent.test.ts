import { describe, it, expect, vi, beforeEach } from "vitest";
import { discAgent } from "../discAgent";
import { Blackboard } from "../../blackboardStore";

// ── Mock the DISC profile engine ─────────────────────────────────────────
vi.mock("@/engine/discProfileEngine", () => ({
  inferDISCProfile: vi.fn(() => ({
    primary: "D",
    secondary: "I",
    distribution: { D: 45, I: 30, S: 15, C: 10 },
    messagingStrategy: {
      emphasize: [{ he: "תוצאות מהירות", en: "Fast results" }],
      avoid: [{ he: "תהליכים ארוכים", en: "Long processes" }],
    },
    ctaStyle: { he: "התחל עכשיו", en: "Start now" },
    funnelEmphasis: "conversion",
    communicationTone: { he: "ישיר ונמרץ", en: "Direct and energetic" },
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
    interests: "marketing",
    productDescription: "SaaS platform for marketing automation",
    averagePrice: 200,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook", "instagram"],
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

describe("discAgent", () => {
  // ── Metadata ──────────────────────────────────────────────────────────────
  describe("Agent metadata", () => {
    it("has the correct name", () => {
      expect(discAgent.name).toBe("disc");
    });

    it("depends on knowledgeGraph agent", () => {
      expect(discAgent.dependencies).toContain("knowledgeGraph");
    });

    it("writes to discProfile section", () => {
      expect(discAgent.writes).toContain("discProfile");
    });
  });

  // ── Happy-path ────────────────────────────────────────────────────────────
  describe("Successful execution", () => {
    it("writes discProfile to the board when formData is present", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      discAgent.run(board);

      expect(board.get("discProfile")).not.toBeNull();
    });

    it("produces a discProfile with primary and secondary types", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      discAgent.run(board);

      const profile = board.get("discProfile");
      expect(profile).toHaveProperty("primary");
      expect(profile).toHaveProperty("secondary");
      expect(["D", "I", "S", "C"]).toContain(profile?.primary);
    });

    it("produces a discProfile with all required fields", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      discAgent.run(board);

      const profile = board.get("discProfile");
      expect(profile).toHaveProperty("distribution");
      expect(profile).toHaveProperty("messagingStrategy");
      expect(profile).toHaveProperty("ctaStyle");
      expect(profile).toHaveProperty("funnelEmphasis");
      expect(profile).toHaveProperty("communicationTone");
    });

    it("passes knowledgeGraph to inferDISCProfile when available", async () => {
      const { inferDISCProfile } = await import("@/engine/discProfileEngine");
      const board = makeBoard();
      const fd = makeFormData();
      const graph = makeKnowledgeGraph();
      board.set("formData", fd as any);
      board.set("knowledgeGraph", graph as any);

      discAgent.run(board);

      expect(inferDISCProfile).toHaveBeenCalledWith(fd, graph);
    });

    it("passes null as graph when knowledgeGraph is missing", async () => {
      const { inferDISCProfile } = await import("@/engine/discProfileEngine");
      const board = makeBoard();
      const fd = makeFormData();
      board.set("formData", fd as any);

      discAgent.run(board);

      expect(inferDISCProfile).toHaveBeenCalledWith(fd, null);
    });

    it("distribution values are numeric", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      discAgent.run(board);

      const profile = board.get("discProfile");
      const dist = profile?.distribution as Record<string, number>;
      expect(typeof dist.D).toBe("number");
      expect(typeof dist.I).toBe("number");
      expect(typeof dist.S).toBe("number");
      expect(typeof dist.C).toBe("number");
    });
  });

  // ── Guard clauses ─────────────────────────────────────────────────────────
  describe("Guard clauses", () => {
    it("does nothing when formData is missing", () => {
      const board = makeBoard();

      discAgent.run(board);

      expect(board.get("discProfile")).toBeNull();
    });

    it("does not require knowledgeGraph to run", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);
      // knowledgeGraph not set — agent should still run

      discAgent.run(board);

      expect(board.get("discProfile")).not.toBeNull();
    });
  });

  // ── Idempotency ───────────────────────────────────────────────────────────
  describe("Idempotency", () => {
    it("overwrites previous discProfile on re-run", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      discAgent.run(board);
      const first = board.get("discProfile");

      discAgent.run(board);
      const second = board.get("discProfile");

      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
    });
  });
});
