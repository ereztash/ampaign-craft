import { describe, it, expect, vi } from "vitest";
import {
  generateCLGStrategy,
  ENGINE_MANIFEST,
  type CLGResult,
} from "../clgEngine";
import type { FormData } from "@/types/funnel";

// ── Mock external deps ─────────────────────────────────────────────────────
vi.mock("../blackboard/contract", () => ({
  writeContext: vi.fn().mockResolvedValue(undefined),
  conceptKey: vi.fn((_a: string, _b: string, _c: string) => `${_a}-${_b}-${_c}`),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2b",
    ageRange: [25, 45],
    interests: "marketing",
    productDescription: "SaaS platform",
    averagePrice: 500,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook"],
    experienceLevel: "advanced",
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// ENGINE_MANIFEST
// ─────────────────────────────────────────────────────────────────────────

describe("CLGEngine — ENGINE_MANIFEST", () => {
  it("has the correct name", () => {
    expect(ENGINE_MANIFEST.name).toBe("clgEngine");
  });

  it("has stage 'design'", () => {
    expect(ENGINE_MANIFEST.stage).toBe("design");
  });

  it("isLive is true", () => {
    expect(ENGINE_MANIFEST.isLive).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// generateCLGStrategy — structure
// ─────────────────────────────────────────────────────────────────────────

describe("generateCLGStrategy — return structure", () => {
  it("returns all required top-level fields", () => {
    const result = generateCLGStrategy(makeFormData());
    expect(result).toHaveProperty("suitable");
    expect(result).toHaveProperty("suitabilityScore");
    expect(result).toHaveProperty("reason");
    expect(result).toHaveProperty("platform");
    expect(result).toHaveProperty("roadmap");
    expect(result).toHaveProperty("metrics");
    expect(result).toHaveProperty("ltvImpact");
  });

  it("suitable is a boolean", () => {
    const result = generateCLGStrategy(makeFormData());
    expect(typeof result.suitable).toBe("boolean");
  });

  it("suitabilityScore is between 0 and 100", () => {
    const result = generateCLGStrategy(makeFormData());
    expect(result.suitabilityScore).toBeGreaterThanOrEqual(0);
    expect(result.suitabilityScore).toBeLessThanOrEqual(100);
  });

  it("reason has bilingual text", () => {
    const result = generateCLGStrategy(makeFormData());
    expect(result.reason.he).toBeTruthy();
    expect(result.reason.en).toBeTruthy();
  });

  it("platform has bilingual text", () => {
    const result = generateCLGStrategy(makeFormData());
    expect(result.platform.he).toBeTruthy();
    expect(result.platform.en).toBeTruthy();
  });

  it("roadmap has exactly 4 weeks", () => {
    const result = generateCLGStrategy(makeFormData());
    expect(result.roadmap).toHaveLength(4);
  });

  it("each roadmap week has title, actions, and milestone", () => {
    const result = generateCLGStrategy(makeFormData());
    for (const week of result.roadmap) {
      expect(typeof week.week).toBe("number");
      expect(week.title.he).toBeTruthy();
      expect(week.title.en).toBeTruthy();
      expect(Array.isArray(week.actions)).toBe(true);
      expect(week.actions.length).toBeGreaterThan(0);
      expect(week.milestone.he).toBeTruthy();
      expect(week.milestone.en).toBeTruthy();
    }
  });

  it("roadmap actions have bilingual text", () => {
    const result = generateCLGStrategy(makeFormData());
    for (const week of result.roadmap) {
      for (const action of week.actions) {
        expect(action.he).toBeTruthy();
        expect(action.en).toBeTruthy();
      }
    }
  });

  it("metrics has 5 items", () => {
    const result = generateCLGStrategy(makeFormData());
    expect(result.metrics).toHaveLength(5);
  });

  it("each metric has name, target, and emoji", () => {
    const result = generateCLGStrategy(makeFormData());
    for (const metric of result.metrics) {
      expect(metric.name.he).toBeTruthy();
      expect(metric.name.en).toBeTruthy();
      expect(metric.target).toBeTruthy();
      expect(metric.emoji).toBeTruthy();
    }
  });

  it("ltvImpact has current, projected, and multiplier", () => {
    const result = generateCLGStrategy(makeFormData());
    expect(result.ltvImpact.current).toBeGreaterThan(0);
    expect(result.ltvImpact.projected).toBeGreaterThan(0);
    expect(result.ltvImpact.multiplier).toBeGreaterThan(0);
    expect(result.ltvImpact.projected).toBeGreaterThan(result.ltvImpact.current);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Suitability scoring
// ─────────────────────────────────────────────────────────────────────────

describe("generateCLGStrategy — suitability scoring", () => {
  it("subscription + b2b + tech + advanced → high suitability and suitable=true", () => {
    const result = generateCLGStrategy(makeFormData({
      salesModel: "subscription",
      audienceType: "b2b",
      businessField: "tech",
      experienceLevel: "advanced",
    }));
    expect(result.suitabilityScore).toBeGreaterThanOrEqual(40);
    expect(result.suitable).toBe(true);
  });

  it("oneTime + b2c + beginner → low suitability and suitable=false", () => {
    const result = generateCLGStrategy(makeFormData({
      salesModel: "oneTime",
      audienceType: "b2c",
      businessField: "realEstate",
      experienceLevel: "beginner",
    }));
    expect(result.suitable).toBe(false);
    expect(result.suitabilityScore).toBeLessThan(40);
  });

  it("subscription adds 30 points to score", () => {
    const withSub = generateCLGStrategy(makeFormData({ salesModel: "subscription", audienceType: "b2c", businessField: "fashion", experienceLevel: "beginner" }));
    const withOne = generateCLGStrategy(makeFormData({ salesModel: "oneTime", audienceType: "b2c", businessField: "fashion", experienceLevel: "beginner" }));
    expect(withSub.suitabilityScore).toBeGreaterThan(withOne.suitabilityScore);
  });

  it("b2b audience adds 20 points", () => {
    const b2b = generateCLGStrategy(makeFormData({ audienceType: "b2b", salesModel: "oneTime", businessField: "services", experienceLevel: "beginner" }));
    const b2c = generateCLGStrategy(makeFormData({ audienceType: "b2c", salesModel: "oneTime", businessField: "services", experienceLevel: "beginner" }));
    expect(b2b.suitabilityScore).toBeGreaterThan(b2c.suitabilityScore);
  });

  it("education field adds 20 points", () => {
    const edu = generateCLGStrategy(makeFormData({ businessField: "education", salesModel: "oneTime", audienceType: "b2c", experienceLevel: "beginner" }));
    const fashion = generateCLGStrategy(makeFormData({ businessField: "fashion", salesModel: "oneTime", audienceType: "b2c", experienceLevel: "beginner" }));
    expect(edu.suitabilityScore).toBeGreaterThan(fashion.suitabilityScore);
  });

  it("score does not exceed 100", () => {
    const result = generateCLGStrategy(makeFormData({
      salesModel: "subscription",
      audienceType: "b2b",
      businessField: "education",
      experienceLevel: "advanced",
    }));
    expect(result.suitabilityScore).toBeLessThanOrEqual(100);
  });

  it("score threshold: ≥40 means suitable=true, <40 means suitable=false", () => {
    const high = generateCLGStrategy(makeFormData({ salesModel: "subscription", audienceType: "b2b" }));
    const low = generateCLGStrategy(makeFormData({ salesModel: "oneTime", audienceType: "b2c", businessField: "realEstate", experienceLevel: "beginner" }));
    if (high.suitabilityScore >= 40) expect(high.suitable).toBe(true);
    if (low.suitabilityScore < 40) expect(low.suitable).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Platform selection
// ─────────────────────────────────────────────────────────────────────────

describe("generateCLGStrategy — platform selection", () => {
  it("b2b → LinkedIn/Slack platform", () => {
    const result = generateCLGStrategy(makeFormData({ audienceType: "b2b" }));
    expect(result.platform.en.toLowerCase()).toMatch(/linkedin|slack/i);
  });

  it("education b2c → WhatsApp/Facebook Group", () => {
    const result = generateCLGStrategy(makeFormData({ audienceType: "b2c", businessField: "education" }));
    expect(result.platform.en.toLowerCase()).toMatch(/whatsapp|facebook/i);
  });

  it("personalBrand b2c → Telegram/WhatsApp VIP", () => {
    const result = generateCLGStrategy(makeFormData({ audienceType: "b2c", businessField: "personalBrand" }));
    expect(result.platform.en.toLowerCase()).toMatch(/telegram|whatsapp/i);
  });

  it("default b2c → Facebook Group + Newsletter", () => {
    const result = generateCLGStrategy(makeFormData({ audienceType: "b2c", businessField: "food" }));
    expect(result.platform.en.toLowerCase()).toMatch(/facebook|newsletter/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// LTV impact
// ─────────────────────────────────────────────────────────────────────────

describe("generateCLGStrategy — ltvImpact", () => {
  it("current LTV = averagePrice * 3", () => {
    const result = generateCLGStrategy(makeFormData({ averagePrice: 200 }));
    expect(result.ltvImpact.current).toBe(600);
  });

  it("score ≥ 60 → multiplier 3.5", () => {
    const result = generateCLGStrategy(makeFormData({ salesModel: "subscription", audienceType: "b2b", businessField: "tech", experienceLevel: "advanced" }));
    if (result.suitabilityScore >= 60) {
      expect(result.ltvImpact.multiplier).toBe(3.5);
    }
  });

  it("uses default 500 when averagePrice missing", () => {
    const fd = makeFormData();
    (fd as any).averagePrice = undefined;
    const result = generateCLGStrategy(fd);
    expect(result.ltvImpact.current).toBe(1500); // 500 * 3
  });

  it("roadmap week numbers are 1, 4, 8, 12", () => {
    const result = generateCLGStrategy(makeFormData());
    const weeks = result.roadmap.map((w) => w.week);
    expect(weeks).toEqual([1, 4, 8, 12]);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// BlackboardCtx
// ─────────────────────────────────────────────────────────────────────────

describe("generateCLGStrategy — blackboard ctx", () => {
  it("works without blackboardCtx", () => {
    expect(() => generateCLGStrategy(makeFormData())).not.toThrow();
  });

  it("works with blackboardCtx", () => {
    expect(() =>
      generateCLGStrategy(makeFormData(), { userId: "u1", planId: "p1" }),
    ).not.toThrow();
  });
});
