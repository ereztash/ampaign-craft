import { describe, it, expect, beforeEach } from "vitest";
import {
  selectModel,
  getMaxTierForPricingTier,
  getMonthlyUsage,
  getMonthlyCap,
  isOverMonthlyBudget,
  wouldExceedCostCap,
} from "../llmRouter";

describe("Tier-based model restriction", () => {
  it("free tier is clamped to fast", () => {
    const result = selectModel({ task: "strategy", textLength: "long", qualityPriority: "quality" }, "free");
    expect(result.tier).toBe("fast");
    expect(result.model).toContain("haiku");
  });

  it("pro tier allows standard but not deep", () => {
    const result = selectModel({ task: "strategy", textLength: "long", qualityPriority: "quality" }, "pro");
    expect(result.tier).toBe("standard");
  });

  it("business tier allows deep", () => {
    const result = selectModel({ task: "strategy", textLength: "long", qualityPriority: "quality" }, "business");
    expect(result.tier).toBe("deep");
  });

  it("no pricing tier means no clamping", () => {
    const result = selectModel({ task: "strategy", textLength: "long", qualityPriority: "quality" });
    expect(result.tier).toBe("deep");
  });

  it("getMaxTierForPricingTier returns correct tiers", () => {
    expect(getMaxTierForPricingTier("free")).toBe("fast");
    expect(getMaxTierForPricingTier("pro")).toBe("standard");
    expect(getMaxTierForPricingTier("business")).toBe("deep");
  });
});

describe("Monthly usage tracking", () => {
  it("getMonthlyUsage returns current month key", () => {
    const usage = getMonthlyUsage();
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    expect(usage.monthKey).toBe(expected);
  });

  it("getMonthlyCap returns correct caps", () => {
    expect(getMonthlyCap("free")).toBe(5);
    expect(getMonthlyCap("pro")).toBe(50);
    expect(getMonthlyCap("business")).toBe(200);
  });
});

describe("Cost cap check", () => {
  it("returns true when over cap", () => {
    expect(wouldExceedCostCap(5, 8, 10)).toBe(true);
  });

  it("returns false when under cap", () => {
    expect(wouldExceedCostCap(1, 5, 10)).toBe(false);
  });

  it("returns true when exactly at cap", () => {
    expect(wouldExceedCostCap(0.01, 10, 10)).toBe(true);
  });
});
