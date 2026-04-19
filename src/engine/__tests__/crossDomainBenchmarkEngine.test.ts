import { describe, it, expect, vi } from "vitest";
import {
  findTransferableStrategies,
  generateCrossDomainInsights,
  getAllIndustries,
  ENGINE_MANIFEST,
  type Industry,
  type CrossDomainInsight,
  type CrossDomainReport,
} from "../crossDomainBenchmarkEngine";

// ── Mock external deps ─────────────────────────────────────────────────────
vi.mock("../blackboard/contract", () => ({
  writeContext: vi.fn().mockResolvedValue(undefined),
  conceptKey: vi.fn((_a: string, _b: string, _c: string) => `${_a}-${_b}-${_c}`),
}));

// ─────────────────────────────────────────────────────────────────────────
// ENGINE_MANIFEST
// ─────────────────────────────────────────────────────────────────────────

describe("CrossDomainBenchmarkEngine — ENGINE_MANIFEST", () => {
  it("has the correct name", () => {
    expect(ENGINE_MANIFEST.name).toBe("crossDomainBenchmarkEngine");
  });

  it("has stage 'diagnose'", () => {
    expect(ENGINE_MANIFEST.stage).toBe("diagnose");
  });

  it("isLive is true", () => {
    expect(ENGINE_MANIFEST.isLive).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getAllIndustries
// ─────────────────────────────────────────────────────────────────────────

describe("getAllIndustries", () => {
  it("returns an array of industry strings", () => {
    const industries = getAllIndustries();
    expect(Array.isArray(industries)).toBe(true);
    expect(industries.length).toBeGreaterThan(0);
  });

  it("contains known industries", () => {
    const industries = getAllIndustries();
    expect(industries).toContain("tech");
    expect(industries).toContain("fashion");
    expect(industries).toContain("food");
    expect(industries).toContain("education");
    expect(industries).toContain("health");
  });

  it("returns 10 industries", () => {
    expect(getAllIndustries()).toHaveLength(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// findTransferableStrategies
// ─────────────────────────────────────────────────────────────────────────

describe("findTransferableStrategies", () => {
  it("returns an array (possibly empty) for any source/target pair", () => {
    const result = findTransferableStrategies("tech", "health");
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns insights for tech → health", () => {
    const result = findTransferableStrategies("tech", "health");
    expect(result.length).toBeGreaterThan(0);
  });

  it("each insight has sourceIndustry and targetIndustry set", () => {
    const result = findTransferableStrategies("tech", "health");
    for (const insight of result) {
      expect(insight.sourceIndustry).toBe("tech");
      expect(insight.targetIndustry).toBe("health");
    }
  });

  it("each insight has required fields", () => {
    const result = findTransferableStrategies("food", "fashion");
    for (const insight of result) {
      expect(insight.transferableStrategy.he).toBeTruthy();
      expect(insight.transferableStrategy.en).toBeTruthy();
      expect(insight.expectedLift).toBeTruthy();
      expect(typeof insight.confidence).toBe("number");
      expect(insight.confidence).toBeGreaterThan(0);
      expect(insight.confidence).toBeLessThanOrEqual(100);
      expect(insight.rationale.he).toBeTruthy();
      expect(insight.rationale.en).toBeTruthy();
      expect(Array.isArray(insight.applicableChannels)).toBe(true);
    }
  });

  it("returns empty array for unknown source/target combination", () => {
    const result = findTransferableStrategies("health", "fashion");
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("returns empty array when source equals target", () => {
    const result = findTransferableStrategies("tech", "tech");
    expect(result).toEqual([]);
  });

  it("tech → education returns insights", () => {
    const result = findTransferableStrategies("tech", "education");
    expect(result.length).toBeGreaterThan(0);
  });

  it("fashion → beauty returns insights", () => {
    const result = findTransferableStrategies("fashion", "beauty");
    expect(result.length).toBeGreaterThan(0);
  });

  it("education → services returns insights", () => {
    const result = findTransferableStrategies("education", "services");
    expect(result.length).toBeGreaterThan(0);
  });

  it("sports → health returns insights", () => {
    const result = findTransferableStrategies("sports", "health");
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// generateCrossDomainInsights
// ─────────────────────────────────────────────────────────────────────────

describe("generateCrossDomainInsights", () => {
  it("returns a CrossDomainReport for known industry", () => {
    const report = generateCrossDomainInsights("health");
    expect(report).toHaveProperty("targetIndustry", "health");
    expect(report).toHaveProperty("insights");
    expect(report).toHaveProperty("topLift");
    expect(report).toHaveProperty("summary");
  });

  it("insights is an array", () => {
    const report = generateCrossDomainInsights("health");
    expect(Array.isArray(report.insights)).toBe(true);
  });

  it("does not include insights where source === target", () => {
    const report = generateCrossDomainInsights("tech");
    for (const insight of report.insights) {
      expect(insight.sourceIndustry).not.toBe("tech");
    }
  });

  it("topLift is the insight with highest confidence", () => {
    const report = generateCrossDomainInsights("health");
    if (report.topLift && report.insights.length > 0) {
      const maxConf = Math.max(...report.insights.map((i) => i.confidence));
      expect(report.topLift.confidence).toBe(maxConf);
    }
  });

  it("summary has bilingual text", () => {
    const report = generateCrossDomainInsights("health");
    expect(report.summary.he).toBeTruthy();
    expect(report.summary.en).toBeTruthy();
  });

  it("summary for industry with insights references insightCount", () => {
    const report = generateCrossDomainInsights("fashion");
    if (report.insights.length > 0) {
      expect(report.summary.en).toContain(String(report.insights.length));
    }
  });

  it("topLift is null when no insights found", () => {
    // beauty as target — likely has no insights from other industries mapping to it
    // We use a target with no incoming mappings
    const report = generateCrossDomainInsights("ecommerce");
    // Either has insights or topLift is null
    if (report.insights.length === 0) {
      expect(report.topLift).toBeNull();
    } else {
      expect(report.topLift).not.toBeNull();
    }
  });

  it("works without blackboardCtx", () => {
    expect(() => generateCrossDomainInsights("tech")).not.toThrow();
  });

  it("works with blackboardCtx", () => {
    expect(() =>
      generateCrossDomainInsights("tech", { userId: "u1", planId: "p1" }),
    ).not.toThrow();
  });

  it("insights are sorted by confidence descending", () => {
    const report = generateCrossDomainInsights("services");
    const confidences = report.insights.map((i) => i.confidence);
    for (let idx = 0; idx < confidences.length - 1; idx++) {
      expect(confidences[idx]).toBeGreaterThanOrEqual(confidences[idx + 1]);
    }
  });

  it("every industry can be used as target without throwing", () => {
    for (const industry of getAllIndustries()) {
      expect(() => generateCrossDomainInsights(industry as Industry)).not.toThrow();
    }
  });

  it("summary for no-insight target includes fallback message", () => {
    // force a target with no incoming matrix entries by targeting sports
    // (no other industry maps TO sports)
    const report = generateCrossDomainInsights("sports");
    if (report.insights.length === 0) {
      expect(report.summary.en).toContain("No cross-industry strategies");
    }
  });

  it("targetIndustry in report matches the argument", () => {
    const industry: Industry = "food";
    const report = generateCrossDomainInsights(industry);
    expect(report.targetIndustry).toBe(industry);
  });
});
