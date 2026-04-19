import { describe, it, expect, vi, beforeEach } from "vitest";
import { closingAgent } from "../closingAgent";
import { Blackboard } from "../../blackboardStore";

// ── Mock the neuro-closing engine ─────────────────────────────────────────
vi.mock("@/engine/neuroClosingEngine", () => ({
  generateClosingStrategy: vi.fn(() => ({
    closingStyle: { he: "אסטרטגיית סגירה ישירה", en: "Direct closing strategy" },
    objectionHandlers: [
      {
        objection: { he: "יקר מדי", en: "Too expensive" },
        response: { he: "ההשקעה מחזירה עצמה", en: "The investment pays for itself" },
        technique: "cost-of-inaction",
      },
    ],
    pricePresentation: {
      strategy: { he: "הצגת מחיר", en: "Price presentation" },
      anchor: { he: "עוגן מחיר", en: "Price anchor" },
      framing: { he: "מסגרת מחיר", en: "Price framing" },
    },
    followUpSequence: [
      { day: 1, channel: "whatsapp", action: { he: "מעקב", en: "Follow up" }, template: { he: "תבנית", en: "Template" } },
    ],
    urgencyTactics: [{ he: "הצעה מוגבלת בזמן", en: "Time-limited offer" }],
    trustSignals: [{ he: "המלצות לקוחות", en: "Customer testimonials" }],
  })),
}));

// ── Helper ────────────────────────────────────────────────────────────────
function makeBoard() {
  return new Blackboard();
}

function makeFormData(overrides = {}) {
  return {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45] as [number, number],
    interests: "marketing",
    productDescription: "SaaS platform",
    averagePrice: 200,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

function makeDiscProfile(overrides = {}) {
  return {
    primary: "D" as const,
    secondary: "C" as const,
    distribution: { D: 40, I: 20, S: 20, C: 20 },
    messagingStrategy: {
      emphasize: [{ he: "תוצאות", en: "Results" }],
      avoid: [{ he: "פרטים מיותרים", en: "Unnecessary details" }],
    },
    ctaStyle: { he: "פעל עכשיו", en: "Act now" },
    funnelEmphasis: "conversion",
    communicationTone: { he: "ישיר ותכליתי", en: "Direct and purposeful" },
    ...overrides,
  };
}

describe("closingAgent", () => {
  // ── Metadata ─────────────────────────────────────────────────────────────
  describe("Agent metadata", () => {
    it("has the correct name", () => {
      expect(closingAgent.name).toBe("closing");
    });

    it("depends on disc agent", () => {
      expect(closingAgent.dependencies).toContain("disc");
    });

    it("writes to closingStrategy section", () => {
      expect(closingAgent.writes).toContain("closingStrategy");
    });
  });

  // ── Happy-path ────────────────────────────────────────────────────────────
  describe("Successful execution", () => {
    it("writes closingStrategy to board when both formData and discProfile are present", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);
      board.set("discProfile", makeDiscProfile() as any);

      closingAgent.run(board);

      const strategy = board.get("closingStrategy");
      expect(strategy).not.toBeNull();
    });

    it("produces a closing strategy with required fields", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);
      board.set("discProfile", makeDiscProfile() as any);

      closingAgent.run(board);

      const strategy = board.get("closingStrategy");
      expect(strategy).toHaveProperty("closingStyle");
      expect(strategy).toHaveProperty("objectionHandlers");
      expect(strategy).toHaveProperty("pricePresentation");
      expect(strategy).toHaveProperty("followUpSequence");
      expect(strategy).toHaveProperty("urgencyTactics");
      expect(strategy).toHaveProperty("trustSignals");
    });

    it("calls generateClosingStrategy with discProfile and formData", async () => {
      const { generateClosingStrategy } = await import("@/engine/neuroClosingEngine");
      const board = makeBoard();
      const fd = makeFormData();
      const disc = makeDiscProfile();
      board.set("formData", fd as any);
      board.set("discProfile", disc as any);

      closingAgent.run(board);

      expect(generateClosingStrategy).toHaveBeenCalledWith(disc, fd);
    });
  });

  // ── Guard clauses ─────────────────────────────────────────────────────────
  describe("Guard clauses", () => {
    it("does nothing when formData is missing", () => {
      const board = makeBoard();
      board.set("discProfile", makeDiscProfile() as any);

      closingAgent.run(board);

      expect(board.get("closingStrategy")).toBeNull();
    });

    it("does nothing when discProfile is missing", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      closingAgent.run(board);

      expect(board.get("closingStrategy")).toBeNull();
    });

    it("does nothing when both formData and discProfile are missing", () => {
      const board = makeBoard();

      closingAgent.run(board);

      expect(board.get("closingStrategy")).toBeNull();
    });
  });

  // ── Idempotency ───────────────────────────────────────────────────────────
  describe("Idempotency", () => {
    it("can run multiple times and overwrites the previous result", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);
      board.set("discProfile", makeDiscProfile() as any);

      closingAgent.run(board);
      const first = board.get("closingStrategy");

      closingAgent.run(board);
      const second = board.get("closingStrategy");

      // Both should be non-null (idempotent writes)
      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
    });
  });
});
