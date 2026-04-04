import { describe, it, expect } from "vitest";
import { getIndustryBenchmarks } from "../industryBenchmarks";

const INDUSTRIES = ["fashion", "tech", "food", "services", "education", "health", "realEstate", "tourism", "personalBrand", "other"];

describe("getIndustryBenchmarks", () => {
  INDUSTRIES.forEach((industry) => {
    it(`returns non-empty benchmarks for "${industry}"`, () => {
      const benchmarks = getIndustryBenchmarks(industry);
      expect(benchmarks.length).toBeGreaterThan(0);
    });

    it(`each benchmark for "${industry}" has metric, value, context`, () => {
      const benchmarks = getIndustryBenchmarks(industry);
      for (const bm of benchmarks) {
        expect(bm.metric.he).toBeTruthy();
        expect(bm.metric.en).toBeTruthy();
        expect(bm.value).toBeTruthy();
        expect(bm.context.he).toBeTruthy();
        expect(bm.context.en).toBeTruthy();
      }
    });
  });

  it("unknown industry falls back to 'other'", () => {
    const benchmarks = getIndustryBenchmarks("nonexistent");
    const otherBenchmarks = getIndustryBenchmarks("other");
    expect(benchmarks).toEqual(otherBenchmarks);
  });
});
