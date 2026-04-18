import { describe, it, expect, vi } from "vitest";

// ── Mock perplexityBurstiness engine ─────────────────────────────────────

vi.mock("@/engine/perplexityBurstiness", () => ({
  calculateBurstiness: vi.fn(() => ({ overallBurstiness: 60 })),
  analyzeRegisterShifts: vi.fn(() => ({ shiftCount: 2 })),
}));

import { getEnglishCopyRules, scoreEnglishCopy } from "../englishCopyOptimizer";

describe("englishCopyOptimizer", () => {
  // ── getEnglishCopyRules ───────────────────────────────────────────────

  describe("getEnglishCopyRules", () => {
    it("returns an array of rules", () => {
      const rules = getEnglishCopyRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });

    it("each rule has id, category, emoji, name and description in he and en", () => {
      for (const rule of getEnglishCopyRules()) {
        expect(typeof rule.id).toBe("string");
        expect(rule.id.length).toBeGreaterThan(0);
        expect(typeof rule.category).toBe("string");
        expect(typeof rule.emoji).toBe("string");
        expect(typeof rule.name.he).toBe("string");
        expect(typeof rule.name.en).toBe("string");
        expect(typeof rule.description.he).toBe("string");
        expect(typeof rule.description.en).toBe("string");
        expect(typeof rule.example.he).toBe("string");
        expect(typeof rule.example.en).toBe("string");
      }
    });

    it("includes rules from expected categories", () => {
      const categories = getEnglishCopyRules().map((r) => r.category);
      expect(categories).toContain("specificity");
      expect(categories).toContain("power");
      expect(categories).toContain("emotion");
      expect(categories).toContain("credibility");
      expect(categories).toContain("action");
      expect(categories).toContain("stylometry");
    });

    it("includes stylometry rules", () => {
      const styloRules = getEnglishCopyRules().filter((r) => r.category === "stylometry");
      expect(styloRules.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ── scoreEnglishCopy ──────────────────────────────────────────────────

  describe("scoreEnglishCopy", () => {
    it("returns total and breakdown array", () => {
      const result = scoreEnglishCopy("This is a test.");
      expect(typeof result.total).toBe("number");
      expect(Array.isArray(result.breakdown)).toBe(true);
    });

    it("total is between 0 and 100", () => {
      const result = scoreEnglishCopy("Hello world.");
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeLessThanOrEqual(100);
    });

    it("breakdown entries have rule, score, and tip in he and en", () => {
      const { breakdown } = scoreEnglishCopy("Some copy text.");
      for (const entry of breakdown) {
        expect(typeof entry.rule).toBe("string");
        expect(typeof entry.score).toBe("number");
        expect(typeof entry.tip.he).toBe("string");
        expect(typeof entry.tip.en).toBe("string");
      }
    });

    it("scores higher for text with specific numbers", () => {
      const withNumbers = scoreEnglishCopy("We helped 2,847 companies scale to $10M ARR in 30 days.");
      const withoutNumbers = scoreEnglishCopy("We helped many companies grow.");
      expect(withNumbers.total).toBeGreaterThan(withoutNumbers.total);
    });

    it("scores higher for text with power words", () => {
      const withPower = scoreEnglishCopy("Unlock your free instant access to this proven method.");
      const withoutPower = scoreEnglishCopy("Access this method now.");
      expect(withPower.total).toBeGreaterThan(withoutPower.total);
    });

    it("scores higher for text with a CTA word", () => {
      const withCTA = scoreEnglishCopy("Get your free trial today.");
      const withoutCTA = scoreEnglishCopy("A trial is available.");
      expect(withCTA.total).toBeGreaterThan(withoutCTA.total);
    });

    it("penalizes fake FOMO markers (!!!)", () => {
      const fakeScarcity = scoreEnglishCopy("HURRY!!! ACT NOW!!! LIMITED TIME ONLY!!!");
      const realScarcity = scoreEnglishCopy("Only 5 spots left. Closes Friday 11:59 PM ET.");
      // Real scarcity should score better than fake FOMO
      expect(realScarcity.total).toBeGreaterThan(fakeScarcity.total);
    });

    it("awards benefit framing bonus for high you/your ratio", () => {
      const youFocused = scoreEnglishCopy(
        "You will love this. Your results will skyrocket. Your team will thank you. You get it all.",
      );
      const weFocused = scoreEnglishCopy(
        "We provide solutions. Our platform is great. We have experience. Our team delivers.",
      );
      expect(youFocused.total).toBeGreaterThan(weFocused.total);
    });

    it("penalizes weak openers", () => {
      const weakOpener = scoreEnglishCopy("In this article, we will discuss how to grow your business.");
      const strongOpener = scoreEnglishCopy("Here's the truth about growing your business today.");
      expect(strongOpener.total).toBeGreaterThan(weakOpener.total);
    });

    it("handles empty string without throwing", () => {
      expect(() => scoreEnglishCopy("")).not.toThrow();
      const result = scoreEnglishCopy("");
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it("includes specificity rule in breakdown", () => {
      const { breakdown } = scoreEnglishCopy("We helped 100 clients.");
      const spec = breakdown.find((b) => b.rule === "specificity");
      expect(spec).toBeDefined();
    });
  });
});
