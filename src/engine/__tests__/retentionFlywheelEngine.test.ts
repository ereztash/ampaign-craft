import { describe, it, expect } from "vitest";
import { generateRetentionFlywheel, type RetentionFlywheel, type FlywheelStep } from "../retentionFlywheelEngine";
import type { FormData } from "@/types/funnel";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45],
    interests: "marketing",
    productDescription: "SaaS platform",
    averagePrice: 200,
    salesModel: "oneTime",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════
// generateRetentionFlywheel — Type detection
// ═══════════════════════════════════════════════

describe("generateRetentionFlywheel — flywheel type detection", () => {
  it("returns subscription type for subscription sales model", () => {
    const result = generateRetentionFlywheel(makeFormData({ salesModel: "subscription" }));
    expect(result.type).toBe("subscription");
  });

  it("returns community type for loyalty goal", () => {
    const result = generateRetentionFlywheel(makeFormData({ mainGoal: "loyalty" }));
    expect(result.type).toBe("community");
  });

  it("returns community type for b2b audience", () => {
    const result = generateRetentionFlywheel(makeFormData({ audienceType: "b2b" }));
    expect(result.type).toBe("community");
  });

  it("returns content type for education field", () => {
    const result = generateRetentionFlywheel(makeFormData({ businessField: "education" }));
    expect(result.type).toBe("content");
  });

  it("returns content type for personalBrand field", () => {
    const result = generateRetentionFlywheel(makeFormData({ businessField: "personalBrand" }));
    expect(result.type).toBe("content");
  });

  it("returns transactional type as fallback for non-subscription b2c", () => {
    const result = generateRetentionFlywheel(makeFormData({ salesModel: "oneTime", audienceType: "b2c", mainGoal: "sales", businessField: "fashion" }));
    expect(result.type).toBe("transactional");
  });

  it("subscription takes priority over loyalty goal", () => {
    const result = generateRetentionFlywheel(makeFormData({ salesModel: "subscription", mainGoal: "loyalty" }));
    expect(result.type).toBe("subscription");
  });
});

// ═══════════════════════════════════════════════
// generateRetentionFlywheel — Structure
// ═══════════════════════════════════════════════

describe("generateRetentionFlywheel — result structure", () => {
  const allTypes: Array<FormData["salesModel"] | ""> = ["subscription", "oneTime"];

  it("returned flywheel has all required fields", () => {
    const result = generateRetentionFlywheel(makeFormData());
    expect(result.type).toBeDefined();
    expect(result.typeLabel).toBeDefined();
    expect(result.typeLabel.he).toBeTruthy();
    expect(result.typeLabel.en).toBeTruthy();
    expect(Array.isArray(result.steps)).toBe(true);
    expect(typeof result.churnReduction).toBe("number");
    expect(Array.isArray(result.metrics)).toBe(true);
  });

  it("steps array has at least one step", () => {
    const result = generateRetentionFlywheel(makeFormData());
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it("each step has all required fields", () => {
    const result = generateRetentionFlywheel(makeFormData());
    for (const step of result.steps) {
      expect(["trigger", "action", "reward", "investment"]).toContain(step.phase);
      expect(step.name.he).toBeTruthy();
      expect(step.name.en).toBeTruthy();
      expect(step.description.he).toBeTruthy();
      expect(step.description.en).toBeTruthy();
      expect(step.channel).toBeTruthy();
      expect(step.emoji).toBeTruthy();
    }
  });

  it("steps cover all four phases: trigger, action, reward, investment", () => {
    const result = generateRetentionFlywheel(makeFormData({ salesModel: "subscription" }));
    const phases = result.steps.map((s) => s.phase);
    expect(phases).toContain("trigger");
    expect(phases).toContain("action");
    expect(phases).toContain("reward");
    expect(phases).toContain("investment");
  });

  it("metrics array has at least one metric", () => {
    const result = generateRetentionFlywheel(makeFormData());
    expect(result.metrics.length).toBeGreaterThan(0);
  });

  it("each metric has name (he+en), target, and emoji", () => {
    const result = generateRetentionFlywheel(makeFormData());
    for (const metric of result.metrics) {
      expect(metric.name.he).toBeTruthy();
      expect(metric.name.en).toBeTruthy();
      expect(metric.target).toBeTruthy();
      expect(metric.emoji).toBeTruthy();
    }
  });

  it("churnReduction is a positive number between 1 and 100", () => {
    const result = generateRetentionFlywheel(makeFormData());
    expect(result.churnReduction).toBeGreaterThan(0);
    expect(result.churnReduction).toBeLessThanOrEqual(100);
  });
});

// ═══════════════════════════════════════════════
// Per-type churnReduction values
// ═══════════════════════════════════════════════

describe("generateRetentionFlywheel — churnReduction per type", () => {
  it("transactional has 25% churn reduction", () => {
    const result = generateRetentionFlywheel(makeFormData({ salesModel: "oneTime", businessField: "fashion", mainGoal: "sales", audienceType: "b2c" }));
    expect(result.churnReduction).toBe(25);
  });

  it("subscription has 35% churn reduction", () => {
    const result = generateRetentionFlywheel(makeFormData({ salesModel: "subscription" }));
    expect(result.churnReduction).toBe(35);
  });

  it("community has 40% churn reduction", () => {
    const result = generateRetentionFlywheel(makeFormData({ mainGoal: "loyalty", salesModel: "oneTime" }));
    expect(result.churnReduction).toBe(40);
  });

  it("content has 30% churn reduction", () => {
    const result = generateRetentionFlywheel(makeFormData({ businessField: "education", salesModel: "oneTime" }));
    expect(result.churnReduction).toBe(30);
  });
});

// ═══════════════════════════════════════════════
// Smoke tests across all business fields
// ═══════════════════════════════════════════════

describe("generateRetentionFlywheel — smoke tests", () => {
  const fields: FormData["businessField"][] = [
    "fashion", "tech", "food", "services", "education",
    "health", "realEstate", "tourism", "personalBrand", "other",
  ];

  fields.forEach((field) => {
    it(`produces a valid flywheel for businessField="${field}"`, () => {
      const result = generateRetentionFlywheel(makeFormData({ businessField: field }));
      expect(result.type).toBeTruthy();
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.churnReduction).toBeGreaterThan(0);
    });
  });
});
