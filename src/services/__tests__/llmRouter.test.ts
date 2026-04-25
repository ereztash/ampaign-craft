import { describe, it, expect, beforeEach } from "vitest";
import {
  selectModel,
  getMaxTierForPricingTier,
  getMonthlyUsage,
  getMonthlyCap,
  isOverMonthlyBudget,
  wouldExceedCostCap,
  trackUsage,
  getUsageByAgent,
  getUsageByLoop,
  getUsageByTask,
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

describe("Per-agent / per-loop usage attribution", () => {
  beforeEach(() => {
    localStorage.removeItem("funnelforge-llm-usage");
  });

  it("groups usage by agentName, sorted by total cost desc", () => {
    trackUsage({ task: "agent-task", model: "claude-haiku", tokensUsed: 100, costNIS: 0.1, timestamp: "2026-04-25T10:00:00Z", agentName: "qaContentAgent" });
    trackUsage({ task: "agent-task", model: "claude-sonnet", tokensUsed: 500, costNIS: 2.5, timestamp: "2026-04-25T10:01:00Z", agentName: "closingAgent" });
    trackUsage({ task: "agent-task", model: "claude-haiku", tokensUsed: 200, costNIS: 0.2, timestamp: "2026-04-25T10:02:00Z", agentName: "qaContentAgent" });

    const breakdown = getUsageByAgent();
    expect(breakdown).toHaveLength(2);
    expect(breakdown[0].key).toBe("closingAgent");
    expect(breakdown[0].callCount).toBe(1);
    expect(breakdown[1].key).toBe("qaContentAgent");
    expect(breakdown[1].callCount).toBe(2);
    expect(breakdown[1].totalTokens).toBe(300);
    expect(breakdown[1].avgTokensPerCall).toBe(150);
  });

  it("buckets calls without agentName under '_unattributed'", () => {
    trackUsage({ task: "ad-copy", model: "claude-haiku", tokensUsed: 50, costNIS: 0.05, timestamp: "2026-04-25T10:00:00Z" });
    const breakdown = getUsageByAgent();
    expect(breakdown[0].key).toBe("_unattributed");
  });

  it("groups usage by loopName independently of agentName", () => {
    trackUsage({ task: "agent-task", model: "claude-haiku", tokensUsed: 100, costNIS: 0.1, timestamp: "2026-04-25T10:00:00Z", loopName: "promptOptimizerLoop" });
    trackUsage({ task: "agent-task", model: "claude-haiku", tokensUsed: 100, costNIS: 0.1, timestamp: "2026-04-25T10:01:00Z", loopName: "outcomeLoop" });
    const breakdown = getUsageByLoop();
    expect(breakdown.map((b) => b.key).sort()).toEqual(["outcomeLoop", "promptOptimizerLoop"]);
  });

  it("groups usage by task", () => {
    trackUsage({ task: "ad-copy", model: "claude-haiku", tokensUsed: 100, costNIS: 0.1, timestamp: "2026-04-25T10:00:00Z" });
    trackUsage({ task: "ad-copy", model: "claude-haiku", tokensUsed: 100, costNIS: 0.1, timestamp: "2026-04-25T10:01:00Z" });
    trackUsage({ task: "qa-analysis", model: "claude-sonnet", tokensUsed: 200, costNIS: 1.0, timestamp: "2026-04-25T10:02:00Z" });
    const breakdown = getUsageByTask();
    expect(breakdown[0].key).toBe("qa-analysis");
    expect(breakdown[0].totalCostNIS).toBe(1);
    expect(breakdown[1].key).toBe("ad-copy");
    expect(breakdown[1].callCount).toBe(2);
  });
});
