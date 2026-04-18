import { describe, it, expect } from "vitest";
import { getFallbackTemplate, mapTaskToFallback } from "../fallbackTemplates";

const KNOWN_INDUSTRIES = [
  "fashion", "tech", "food", "services", "education",
  "health", "realEstate", "tourism", "personalBrand", "other",
];

const KNOWN_TASKS = ["headline", "ad-copy", "email", "whatsapp"] as const;

describe("fallbackTemplates", () => {
  // ── getFallbackTemplate ───────────────────────────────────────────────

  describe("getFallbackTemplate", () => {
    it("returns a template with he and en strings for known industry and task", () => {
      const template = getFallbackTemplate("tech", "ad-copy");
      expect(typeof template.he).toBe("string");
      expect(template.he.length).toBeGreaterThan(0);
      expect(typeof template.en).toBe("string");
      expect(template.en.length).toBeGreaterThan(0);
    });

    it("returns 'other' fallback for unknown industry", () => {
      const unknown = getFallbackTemplate("unknown_industry", "headline");
      const other = getFallbackTemplate("other", "headline");
      expect(unknown).toEqual(other);
    });

    it("covers all 10 industries for all 4 task types", () => {
      for (const industry of KNOWN_INDUSTRIES) {
        for (const task of KNOWN_TASKS) {
          const template = getFallbackTemplate(industry, task);
          expect(typeof template.he).toBe("string");
          expect(template.he.length).toBeGreaterThan(0);
          expect(typeof template.en).toBe("string");
        }
      }
    });

    it("fashion headline contains expected text", () => {
      const t = getFallbackTemplate("fashion", "headline");
      // Should be in Hebrew or English — check it's non-empty
      expect(t.he.length).toBeGreaterThan(0);
      expect(t.en.length).toBeGreaterThan(0);
    });

    it("tech email contains social proof element", () => {
      const t = getFallbackTemplate("tech", "email");
      // The template should reference something about businesses/solutions
      expect(t.en.toLowerCase()).toMatch(/200\+|businesses|operations|solution/);
    });

    it("food whatsapp contains an emoji", () => {
      const t = getFallbackTemplate("food", "whatsapp");
      // Hebrew or English whatsapp messages include emojis
      const combined = t.he + t.en;
      expect(/[\p{Emoji}]/u.test(combined)).toBe(true);
    });
  });

  // ── mapTaskToFallback ─────────────────────────────────────────────────

  describe("mapTaskToFallback", () => {
    it("maps 'headline' to 'headline'", () => {
      expect(mapTaskToFallback("headline")).toBe("headline");
    });

    it("maps 'social-post' to 'headline'", () => {
      expect(mapTaskToFallback("social-post")).toBe("headline");
    });

    it("maps 'social' (partial) to 'headline'", () => {
      expect(mapTaskToFallback("social")).toBe("headline");
    });

    it("maps 'email-sequence' to 'email'", () => {
      expect(mapTaskToFallback("email-sequence")).toBe("email");
    });

    it("maps 'email' to 'email'", () => {
      expect(mapTaskToFallback("email")).toBe("email");
    });

    it("maps 'whatsapp-message' to 'whatsapp'", () => {
      expect(mapTaskToFallback("whatsapp-message")).toBe("whatsapp");
    });

    it("maps 'whatsapp' to 'whatsapp'", () => {
      expect(mapTaskToFallback("whatsapp")).toBe("whatsapp");
    });

    it("maps 'ad-copy' to 'ad-copy'", () => {
      expect(mapTaskToFallback("ad-copy")).toBe("ad-copy");
    });

    it("maps 'landing-page' to 'ad-copy' (default)", () => {
      expect(mapTaskToFallback("landing-page")).toBe("ad-copy");
    });

    it("maps unknown task to 'ad-copy' (default)", () => {
      expect(mapTaskToFallback("unknown_task_type")).toBe("ad-copy");
    });
  });
});
