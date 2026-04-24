import { describe, it, expect } from "vitest";
import {
  canProceedPhase,
  describeBlockingField,
  isPhaseComplete,
  getPhaseColor,
} from "../differentiationFormRules";
import type { DifferentiationFormData } from "@/types/differentiation";

// ── Helpers ───────────────────────────────────────────────────────────────

function makeFormData(overrides: Partial<DifferentiationFormData> = {}): DifferentiationFormData {
  return {
    businessName: "Test Corp",
    industry: "tech",
    targetMarket: "b2b",
    companySize: "2-10",
    currentPositioning: "We help companies do things better than anyone else.",
    topCompetitors: ["Competitor A", "Competitor B"],
    priceRange: "mid",
    claimExamples: [],
    customerQuote: "This changed everything.",
    lostDealReason: "Price was too high.",
    negativeReviewTheme: "",
    returnReason: "",
    competitorOverlap: "Both offer analytics dashboards.",
    ashamedPains: ["pain1", "pain2"],
    hiddenValues: Array.from({ length: 4 }, (_, i) => ({ id: `v${i}`, score: 3, label: { he: "", en: "" } })) as never,
    internalFriction: "",
    competitorArchetypes: [{ id: "a1", name: "Category King" }] as never,
    buyingCommitteeMap: [
      { role: "Champion", influence: "high" },
      { role: "Budget", influence: "high" },
    ] as never,
    decisionLatency: "weeks",
    ...overrides,
  } as DifferentiationFormData;
}

describe("differentiationFormRules", () => {
  // ── canProceedPhase ───────────────────────────────────────────────────

  describe("canProceedPhase - surface", () => {
    it("returns true when all surface fields are valid", () => {
      expect(canProceedPhase("surface", makeFormData())).toBe(true);
    });

    it("returns false when businessName is empty", () => {
      expect(canProceedPhase("surface", makeFormData({ businessName: "" }))).toBe(false);
    });

    it("returns false when industry is empty", () => {
      expect(canProceedPhase("surface", makeFormData({ industry: "" }))).toBe(false);
    });

    it("returns false when targetMarket is falsy", () => {
      expect(canProceedPhase("surface", makeFormData({ targetMarket: "" as never }))).toBe(false);
    });

    it("returns false when companySize is falsy", () => {
      expect(canProceedPhase("surface", makeFormData({ companySize: "" as never }))).toBe(false);
    });

    it("returns false when currentPositioning is too short (<=10)", () => {
      expect(canProceedPhase("surface", makeFormData({ currentPositioning: "short" }))).toBe(false);
    });

    it("returns false when no non-empty competitors", () => {
      expect(canProceedPhase("surface", makeFormData({ topCompetitors: ["", ""] }))).toBe(false);
    });

    it("returns false when priceRange is falsy", () => {
      expect(canProceedPhase("surface", makeFormData({ priceRange: "" as never }))).toBe(false);
    });
  });

  describe("canProceedPhase - contradiction", () => {
    it("returns true when all contradiction fields are present", () => {
      expect(canProceedPhase("contradiction", makeFormData())).toBe(true);
    });

    it("returns false when customerQuote is empty", () => {
      expect(canProceedPhase("contradiction", makeFormData({ customerQuote: "" }))).toBe(false);
    });

    it("returns false when lostDealReason is empty", () => {
      expect(canProceedPhase("contradiction", makeFormData({ lostDealReason: "" }))).toBe(false);
    });

    it("returns false when competitorOverlap is empty", () => {
      expect(canProceedPhase("contradiction", makeFormData({ competitorOverlap: "" }))).toBe(false);
    });
  });

  describe("canProceedPhase - hidden", () => {
    it("returns true when hiddenValues >= 4 and ashamedPains >= 2", () => {
      expect(canProceedPhase("hidden", makeFormData())).toBe(true);
    });

    it("returns false when hiddenValues < 4", () => {
      expect(
        canProceedPhase("hidden", makeFormData({
          hiddenValues: Array.from({ length: 3 }, (_, i) => ({ id: `v${i}` })) as never,
        })),
      ).toBe(false);
    });

    it("returns false when ashamedPains < 2", () => {
      expect(canProceedPhase("hidden", makeFormData({ ashamedPains: ["only one"] }))).toBe(false);
    });
  });

  describe("canProceedPhase - mapping", () => {
    it("returns true when competitorArchetypes, buyingCommitteeMap, and decisionLatency are valid", () => {
      expect(canProceedPhase("mapping", makeFormData())).toBe(true);
    });

    it("returns false when competitorArchetypes is empty", () => {
      expect(canProceedPhase("mapping", makeFormData({ competitorArchetypes: [] }))).toBe(false);
    });

    it("returns false when buyingCommitteeMap < 2", () => {
      expect(
        canProceedPhase("mapping", makeFormData({
          buyingCommitteeMap: [{ role: "one" }] as never,
        })),
      ).toBe(false);
    });

    it("returns false when decisionLatency is falsy", () => {
      expect(canProceedPhase("mapping", makeFormData({ decisionLatency: "" as never }))).toBe(false);
    });
  });

  describe("canProceedPhase - synthesis", () => {
    it("always returns true (AI-generated step)", () => {
      expect(canProceedPhase("synthesis", makeFormData())).toBe(true);
      expect(canProceedPhase("synthesis", {} as DifferentiationFormData)).toBe(true);
    });
  });

  describe("canProceedPhase - unknown phase", () => {
    it("returns false for an unknown phase", () => {
      expect(canProceedPhase("unknown_phase" as never, makeFormData())).toBe(false);
    });
  });

  // ── describeBlockingField ────────────────────────────────────────────

  describe("describeBlockingField", () => {
    it("returns null when the phase is complete", () => {
      expect(describeBlockingField("surface", makeFormData())).toBeNull();
      expect(describeBlockingField("contradiction", makeFormData())).toBeNull();
      expect(describeBlockingField("hidden", makeFormData())).toBeNull();
      expect(describeBlockingField("mapping", makeFormData())).toBeNull();
      expect(describeBlockingField("synthesis", makeFormData())).toBeNull();
    });

    it("surface: names the first missing field", () => {
      const hint = describeBlockingField("surface", makeFormData({ businessName: "" }));
      expect(hint?.he).toContain("שם");
      expect(hint?.en.toLowerCase()).toContain("business");
    });

    it("contradiction: names lostDealReason when it is empty", () => {
      const hint = describeBlockingField(
        "contradiction",
        makeFormData({ lostDealReason: "" }),
      );
      expect(hint).not.toBeNull();
      expect(hint?.en.toLowerCase()).toContain("deal");
    });

    it("mapping: names buying committee when < 2 roles", () => {
      const hint = describeBlockingField(
        "mapping",
        makeFormData({ buyingCommitteeMap: [{ role: "one" }] as never }),
      );
      expect(hint).not.toBeNull();
      expect(hint?.en.toLowerCase()).toContain("committee");
    });

    it("hidden: names ashamedPains when < 2 entries", () => {
      const hint = describeBlockingField(
        "hidden",
        makeFormData({ ashamedPains: ["only one"] }),
      );
      expect(hint).not.toBeNull();
      expect(hint?.en.toLowerCase()).toContain("pain");
    });

    it("canProceed false iff describeBlockingField non-null", () => {
      const cases: Array<[string, DifferentiationFormData]> = [
        ["surface", makeFormData({ industry: "" })],
        ["contradiction", makeFormData({ customerQuote: "" })],
        ["hidden", makeFormData({ ashamedPains: [] })],
        ["mapping", makeFormData({ competitorArchetypes: [] })],
      ];
      for (const [phase, data] of cases) {
        expect(canProceedPhase(phase as never, data)).toBe(false);
        expect(describeBlockingField(phase as never, data)).not.toBeNull();
      }
    });
  });

  // ── isPhaseComplete ───────────────────────────────────────────────────

  describe("isPhaseComplete", () => {
    it("delegates to canProceedPhase and returns same result", () => {
      const data = makeFormData();
      expect(isPhaseComplete("surface", data)).toBe(canProceedPhase("surface", data));
      expect(isPhaseComplete("contradiction", data)).toBe(canProceedPhase("contradiction", data));
      expect(isPhaseComplete("hidden", data)).toBe(canProceedPhase("hidden", data));
      expect(isPhaseComplete("mapping", data)).toBe(canProceedPhase("mapping", data));
      expect(isPhaseComplete("synthesis", data)).toBe(canProceedPhase("synthesis", data));
    });
  });

  // ── getPhaseColor ─────────────────────────────────────────────────────

  describe("getPhaseColor", () => {
    it("returns a CSS color string for phases 1-5", () => {
      const expected: Record<number, string> = {
        1: "#3B82F6",
        2: "#F59E0B",
        3: "#8B5CF6",
        4: "#10B981",
        5: "#B87333",
      };
      for (const [num, color] of Object.entries(expected)) {
        expect(getPhaseColor(Number(num))).toBe(color);
      }
    });

    it("returns fallback gray for unknown phase number", () => {
      expect(getPhaseColor(99)).toBe("#6B7280");
      expect(getPhaseColor(0)).toBe("#6B7280");
    });
  });
});
