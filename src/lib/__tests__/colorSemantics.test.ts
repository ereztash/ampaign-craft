import { describe, it, expect } from "vitest";
import {
  colorSemantics,
  neuroVectorColors,
  funnelStageColors,
  getKpiStatusColor,
  getTrendColor,
  getDiagnosticTierColor,
  getReaderProfileColor,
  getProgressColor,
  chartColorPalette,
  getDatasetHealthColor,
} from "../colorSemantics";

describe("colorSemantics", () => {
  // ── colorSemantics constant ───────────────────────────────────────────

  describe("colorSemantics", () => {
    const EXPECTED_KEYS = ["tension", "trust", "reward", "insight", "opportunity", "neutral"];

    it("has all expected semantic keys", () => {
      for (const key of EXPECTED_KEYS) {
        expect(key in colorSemantics).toBe(true);
      }
    });

    it("maps tension to destructive", () => {
      expect(colorSemantics.tension).toBe("destructive");
    });

    it("maps trust to primary", () => {
      expect(colorSemantics.trust).toBe("primary");
    });

    it("maps reward to accent", () => {
      expect(colorSemantics.reward).toBe("accent");
    });

    it("all values are non-empty strings", () => {
      for (const val of Object.values(colorSemantics)) {
        expect(typeof val).toBe("string");
        expect(val.length).toBeGreaterThan(0);
      }
    });
  });

  // ── neuroVectorColors ─────────────────────────────────────────────────

  describe("neuroVectorColors", () => {
    const VECTORS = ["cortisol", "oxytocin", "dopamine"] as const;

    it("has cortisol, oxytocin, and dopamine entries", () => {
      for (const v of VECTORS) {
        expect(neuroVectorColors[v]).toBeDefined();
      }
    });

    it("each vector has bg, text, border, badge, gradient", () => {
      for (const v of VECTORS) {
        const entry = neuroVectorColors[v];
        expect(typeof entry.bg).toBe("string");
        expect(typeof entry.text).toBe("string");
        expect(typeof entry.border).toBe("string");
        expect(typeof entry.badge).toBe("string");
        expect(typeof entry.gradient).toBe("string");
      }
    });
  });

  // ── funnelStageColors ─────────────────────────────────────────────────

  describe("funnelStageColors", () => {
    const STAGES = ["awareness", "engagement", "leads", "conversion", "retention"];

    it("has all 5 funnel stages", () => {
      for (const stage of STAGES) {
        expect(funnelStageColors[stage]).toBeDefined();
      }
    });

    it("each stage has border, bg, text, label, gradient", () => {
      for (const stage of STAGES) {
        const entry = funnelStageColors[stage];
        expect(typeof entry.border).toBe("string");
        expect(typeof entry.bg).toBe("string");
        expect(typeof entry.text).toBe("string");
        expect(typeof entry.label).toBe("string");
        expect(typeof entry.gradient).toBe("string");
      }
    });
  });

  // ── getKpiStatusColor ─────────────────────────────────────────────────

  describe("getKpiStatusColor", () => {
    it("returns accent-based colors for good status", () => {
      const result = getKpiStatusColor("good");
      expect(result.bg).toContain("accent");
      expect(result.dot).toContain("accent");
    });

    it("returns chart-3-based colors for warning status", () => {
      const result = getKpiStatusColor("warning");
      expect(result.bg).toContain("chart-3");
    });

    it("returns destructive-based colors for critical status", () => {
      const result = getKpiStatusColor("critical");
      expect(result.bg).toContain("destructive");
    });

    it("each status result has bg, text, border, dot", () => {
      for (const status of ["good", "warning", "critical"] as const) {
        const result = getKpiStatusColor(status);
        expect(result.bg).toBeDefined();
        expect(result.text).toBeDefined();
        expect(result.border).toBeDefined();
        expect(result.dot).toBeDefined();
      }
    });
  });

  // ── getTrendColor ─────────────────────────────────────────────────────

  describe("getTrendColor", () => {
    it("returns primary-based colors for stable", () => {
      const result = getTrendColor("stable", true);
      expect(result.text).toContain("primary");
    });

    it("returns accent-based colors when trend is up and metric is positive", () => {
      const result = getTrendColor("up", true);
      expect(result.text).toContain("accent");
    });

    it("returns destructive colors when trend is up but metric is negative (bad)", () => {
      const result = getTrendColor("up", false);
      expect(result.text).toContain("destructive");
    });

    it("returns accent-based colors when trend is down and metric is negative (good, e.g. cost)", () => {
      const result = getTrendColor("down", false);
      expect(result.text).toContain("accent");
    });

    it("returns destructive colors when trend is down and metric is positive (bad)", () => {
      const result = getTrendColor("down", true);
      expect(result.text).toContain("destructive");
    });

    it("each result has text, icon, bg", () => {
      const result = getTrendColor("up", true);
      expect(result.text).toBeDefined();
      expect(result.icon).toBeDefined();
      expect(result.bg).toBeDefined();
    });
  });

  // ── getDiagnosticTierColor ────────────────────────────────────────────

  describe("getDiagnosticTierColor", () => {
    it("returns accent-based for strong tier", () => {
      const result = getDiagnosticTierColor("strong");
      expect(result.bg).toContain("accent");
    });

    it("returns chart-3-based for gaps tier", () => {
      const result = getDiagnosticTierColor("gaps");
      expect(result.bg).toContain("chart-3");
    });

    it("returns destructive-based for pivot tier", () => {
      const result = getDiagnosticTierColor("pivot");
      expect(result.bg).toContain("destructive");
    });

    it("returns destructive-based for restart tier", () => {
      const result = getDiagnosticTierColor("restart");
      expect(result.bg).toContain("destructive");
    });

    it("each tier result has bg, text, border, badge", () => {
      for (const tier of ["strong", "gaps", "pivot", "restart"] as const) {
        const result = getDiagnosticTierColor(tier);
        expect(result.bg).toBeDefined();
        expect(result.text).toBeDefined();
        expect(result.border).toBeDefined();
        expect(result.badge).toBeDefined();
      }
    });
  });

  // ── getReaderProfileColor ─────────────────────────────────────────────

  describe("getReaderProfileColor", () => {
    it("returns destructive-based for level 1 (System 1)", () => {
      const result = getReaderProfileColor(1);
      expect(result.border).toContain("destructive");
    });

    it("returns destructive-based for level 2", () => {
      const result = getReaderProfileColor(2);
      expect(result.border).toContain("destructive");
    });

    it("returns primary-based for level 4 (System 2)", () => {
      const result = getReaderProfileColor(4);
      expect(result.border).toContain("primary");
    });

    it("returns primary-based for level 5", () => {
      const result = getReaderProfileColor(5);
      expect(result.border).toContain("primary");
    });

    it("returns accent-based for balanced level 3", () => {
      const result = getReaderProfileColor(3);
      expect(result.border).toContain("accent");
    });

    it("each result has border and bg", () => {
      for (const level of [1, 2, 3, 4, 5]) {
        const result = getReaderProfileColor(level);
        expect(result.border).toBeDefined();
        expect(result.bg).toBeDefined();
      }
    });
  });

  // ── getProgressColor ──────────────────────────────────────────────────

  describe("getProgressColor", () => {
    it("returns primary for early progress (step 1 of 10)", () => {
      expect(getProgressColor(1, 10)).toBe("bg-primary");
    });

    it("returns chart-3 for mid progress (step 5 of 10)", () => {
      expect(getProgressColor(5, 10)).toBe("bg-[hsl(var(--chart-3))]");
    });

    it("returns accent for late progress (step 9 of 10)", () => {
      expect(getProgressColor(9, 10)).toBe("bg-accent");
    });

    it("returns primary for step 0 of 3 (0%)", () => {
      expect(getProgressColor(0, 3)).toBe("bg-primary");
    });

    it("returns accent for step 3 of 3 (100%)", () => {
      expect(getProgressColor(3, 3)).toBe("bg-accent");
    });
  });

  // ── chartColorPalette ─────────────────────────────────────────────────

  describe("chartColorPalette", () => {
    it("has 5 colors", () => {
      expect(chartColorPalette).toHaveLength(5);
    });

    it("all colors are non-empty strings", () => {
      for (const color of chartColorPalette) {
        expect(typeof color).toBe("string");
        expect(color.length).toBeGreaterThan(0);
      }
    });
  });

  // ── getDatasetHealthColor ─────────────────────────────────────────────

  describe("getDatasetHealthColor", () => {
    it("returns healthy label for score >= 75", () => {
      expect(getDatasetHealthColor(75).label).toBe("healthy");
      expect(getDatasetHealthColor(100).label).toBe("healthy");
    });

    it("returns attention label for score 50-74", () => {
      expect(getDatasetHealthColor(50).label).toBe("attention");
      expect(getDatasetHealthColor(74).label).toBe("attention");
    });

    it("returns critical label for score < 50", () => {
      expect(getDatasetHealthColor(49).label).toBe("critical");
      expect(getDatasetHealthColor(0).label).toBe("critical");
    });

    it("each result has text and bg", () => {
      for (const score of [0, 50, 75, 100]) {
        const result = getDatasetHealthColor(score);
        expect(result.text).toBeDefined();
        expect(result.bg).toBeDefined();
      }
    });
  });
});
