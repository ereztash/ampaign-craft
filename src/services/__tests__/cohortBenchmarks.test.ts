import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn() },
}));

import { fetchCohortPriors, buildCohortPromptSection } from "../cohortBenchmarks";
import type { CohortPriors } from "../cohortBenchmarks";

// Build a fake supabase client that returns the provided data/error
function makeFakeClient(data: unknown[] | null, error: { message: string } | null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data, error }),
            }),
          }),
        }),
      }),
    }),
  };
}

describe("cohortBenchmarks", () => {
  // ── fetchCohortPriors ─────────────────────────────────────────────────

  describe("fetchCohortPriors", () => {
    it("returns null when there is an error", async () => {
      const client = makeFakeClient(null, { message: "db error" });
      const result = await fetchCohortPriors("strategist", client as never);
      expect(result).toBeNull();
    });

    it("returns null when data is empty array", async () => {
      const client = makeFakeClient([], null);
      const result = await fetchCohortPriors("strategist", client as never);
      expect(result).toBeNull();
    });

    it("returns null when data is null", async () => {
      const client = makeFakeClient(null, null);
      const result = await fetchCohortPriors("optimizer", client as never);
      expect(result).toBeNull();
    });

    it("returns CohortPriors with correct shape on success", async () => {
      const rows = [
        { archetype_id: "pioneer", action_id: "action-A", sample_n: 30, primary_pick_rate: 0.6, avg_conversion_7d: 0.12 },
        { archetype_id: "pioneer", action_id: "action-B", sample_n: 25, primary_pick_rate: 0.4, avg_conversion_7d: null },
      ];
      const client = makeFakeClient(rows, null);
      const result = await fetchCohortPriors("pioneer", client as never);

      expect(result).not.toBeNull();
      expect(result!.archetype).toBe("pioneer");
      expect(result!.topActions).toHaveLength(2);
      expect(result!.topActions[0].action_id).toBe("action-A");
      expect(result!.topActions[0].pick_rate).toBeCloseTo(0.6);
      expect(result!.topActions[1].conversion_7d).toBeNull();
      expect(result!.sampleSize).toBe(55);
    });

    it("marks isSignificant=true when total sample >= 50", async () => {
      const rows = [
        { archetype_id: "closer", action_id: "a1", sample_n: 50, primary_pick_rate: 0.7, avg_conversion_7d: 0.1 },
      ];
      const client = makeFakeClient(rows, null);
      const result = await fetchCohortPriors("closer", client as never);
      expect(result!.isSignificant).toBe(true);
    });

    it("marks isSignificant=false when total sample < 50", async () => {
      const rows = [
        { archetype_id: "connector", action_id: "a1", sample_n: 20, primary_pick_rate: 0.5, avg_conversion_7d: null },
      ];
      const client = makeFakeClient(rows, null);
      const result = await fetchCohortPriors("connector", client as never);
      expect(result!.isSignificant).toBe(false);
    });

    it("returns null when the client throws", async () => {
      const badClient = {
        from: () => {
          throw new Error("network failure");
        },
      };
      const result = await fetchCohortPriors("strategist", badClient as never);
      expect(result).toBeNull();
    });
  });

  // ── buildCohortPromptSection ──────────────────────────────────────────

  describe("buildCohortPromptSection", () => {
    const significantPriors: CohortPriors = {
      archetype: "strategist",
      topActions: [
        { action_id: "headline-loss", pick_rate: 0.75, conversion_7d: 0.15, sample_n: 80 },
        { action_id: "social-proof", pick_rate: 0.55, conversion_7d: null, sample_n: 40 },
      ],
      sampleSize: 120,
      isSignificant: true,
    };

    it("returns empty string when priors is null", () => {
      expect(buildCohortPromptSection(null)).toBe("");
    });

    it("returns empty string when isSignificant is false", () => {
      const priors: CohortPriors = { ...significantPriors, isSignificant: false };
      expect(buildCohortPromptSection(priors)).toBe("");
    });

    it("returns empty string when topActions is empty", () => {
      const priors: CohortPriors = { ...significantPriors, topActions: [] };
      expect(buildCohortPromptSection(priors)).toBe("");
    });

    it("includes archetype and sample size in Hebrew header", () => {
      const section = buildCohortPromptSection(significantPriors, "he");
      expect(section).toContain("strategist");
      expect(section).toContain("120");
    });

    it("includes archetype and sample size in English header", () => {
      const section = buildCohortPromptSection(significantPriors, "en");
      expect(section).toContain("COHORT EVIDENCE");
      expect(section).toContain("strategist");
      expect(section).toContain("120");
    });

    it("lists action ids with pick rates", () => {
      const section = buildCohortPromptSection(significantPriors, "en");
      expect(section).toContain("headline-loss");
      expect(section).toContain("75%");
      expect(section).toContain("social-proof");
      expect(section).toContain("55%");
    });

    it("includes conversion when available", () => {
      const section = buildCohortPromptSection(significantPriors, "en");
      expect(section).toContain("conv: 0.15");
    });

    it("omits conversion when it is null", () => {
      const section = buildCohortPromptSection(significantPriors, "en");
      // social-proof has null conversion — should have no conv tag for that item
      const lines = section.split("\n");
      const socialProofLine = lines.find((l) => l.includes("social-proof"))!;
      expect(socialProofLine).not.toContain("conv:");
    });

    it("shows sample size per action", () => {
      const section = buildCohortPromptSection(significantPriors, "en");
      expect(section).toContain("[n=80]");
      expect(section).toContain("[n=40]");
    });

    it("defaults to Hebrew when language is not specified", () => {
      const section = buildCohortPromptSection(significantPriors);
      // Hebrew header marker
      expect(section).toContain("קהורט");
    });
  });
});
