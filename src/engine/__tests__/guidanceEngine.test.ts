import { describe, it, expect } from "vitest";
import { generateGuidance, getOverallHealth, ENGINE_MANIFEST } from "../guidanceEngine";
import type { KpiGap } from "@/types/meta";
import type { FunnelResult } from "@/types/funnel";

// ═══════════════════════════════════════════════
// Fixtures
// ═══════════════════════════════════════════════

function makeGap(overrides: Partial<KpiGap> = {}): KpiGap {
  return {
    kpiName: { he: "עלות לקליק", en: "CPC" },
    targetMin: 1,
    targetMax: 3,
    unit: "number",
    actual: 5,
    gapPercent: 150,
    status: "critical",
    ...overrides,
  };
}

function makeResult(): FunnelResult {
  return {
    id: "plan-test",
    funnelName: { he: "משפך", en: "Funnel" },
    stages: [],
    totalBudget: { min: 0, max: 0 },
    overallTips: [],
    hookTips: [],
    copyLab: {} as FunnelResult["copyLab"],
    kpis: [],
    createdAt: new Date().toISOString(),
    formData: {} as FunnelResult["formData"],
  };
}

// ═══════════════════════════════════════════════
// ENGINE_MANIFEST
// ═══════════════════════════════════════════════

describe("guidanceEngine — ENGINE_MANIFEST", () => {
  it("name is guidanceEngine", () => {
    expect(ENGINE_MANIFEST.name).toBe("guidanceEngine");
  });

  it("stage is discover", () => {
    expect(ENGINE_MANIFEST.stage).toBe("discover");
  });

  it("writes to CAMPAIGN-guidance-*", () => {
    expect(ENGINE_MANIFEST.writes).toContain("CAMPAIGN-guidance-*");
  });
});

// ═══════════════════════════════════════════════
// generateGuidance — structure
// ═══════════════════════════════════════════════

describe("generateGuidance — basic structure", () => {
  it("returns empty array when no gaps", () => {
    const items = generateGuidance([], makeResult());
    expect(items).toEqual([]);
  });

  it("returns guidance items for critical CPC gap", () => {
    const items = generateGuidance(
      [makeGap({ kpiName: { he: "CPC", en: "CPC" }, status: "critical" })],
      makeResult(),
    );
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].metric).toBe("CPC");
  });

  it("returns guidance items for CTR gap", () => {
    const items = generateGuidance(
      [makeGap({ kpiName: { he: "CTR", en: "CTR" }, status: "critical" })],
      makeResult(),
    );
    expect(items[0].metric).toBe("CTR");
    expect(items[0].area.en).toContain("Click");
  });

  it("returns guidance items for CPL gap", () => {
    const items = generateGuidance(
      [makeGap({ kpiName: { he: "CPL", en: "CPL" }, status: "critical" })],
      makeResult(),
    );
    expect(items[0].metric).toBe("CPL");
    expect(items[0].area.en).toContain("Lead");
  });

  it("returns guidance items for CPM gap", () => {
    const items = generateGuidance(
      [makeGap({ kpiName: { he: "CPM", en: "CPM" }, status: "warning" })],
      makeResult(),
    );
    expect(items[0].metric).toBe("CPM");
    expect(items[0].area.en).toContain("Mille");
  });

  it("each guidance item has required fields", () => {
    const items = generateGuidance(
      [makeGap({ kpiName: { he: "CPC", en: "CPC" }, status: "critical" })],
      makeResult(),
    );
    const item = items[0];
    expect(item.priority).toMatch(/^(high|medium|low)$/);
    expect(item.area.he.length).toBeGreaterThan(0);
    expect(item.area.en.length).toBeGreaterThan(0);
    expect(item.issue.he.length).toBeGreaterThan(0);
    expect(item.issue.en.length).toBeGreaterThan(0);
    expect(Array.isArray(item.actions)).toBe(true);
    expect(item.actions.length).toBeGreaterThan(0);
  });

  it("each action has he and en strings", () => {
    const items = generateGuidance(
      [makeGap({ kpiName: { he: "CTR", en: "CTR" }, status: "warning" })],
      makeResult(),
    );
    for (const action of items[0].actions) {
      expect(action.he.length).toBeGreaterThan(0);
      expect(action.en.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════
// generateGuidance — priority
// ═══════════════════════════════════════════════

describe("generateGuidance — priority levels", () => {
  it("critical status yields high priority", () => {
    const items = generateGuidance(
      [makeGap({ kpiName: { he: "CPC", en: "CPC" }, status: "critical" })],
      makeResult(),
    );
    expect(items[0].priority).toBe("high");
  });

  it("warning status yields medium priority", () => {
    const items = generateGuidance(
      [makeGap({ kpiName: { he: "CPC", en: "CPC" }, status: "warning" })],
      makeResult(),
    );
    expect(items[0].priority).toBe("medium");
  });

  it("CPM always returns medium priority regardless of status", () => {
    const items = generateGuidance(
      [makeGap({ kpiName: { he: "CPM", en: "CPM" }, status: "critical" })],
      makeResult(),
    );
    expect(items[0].priority).toBe("medium");
  });
});

// ═══════════════════════════════════════════════
// generateGuidance — filtering & ordering
// ═══════════════════════════════════════════════

describe("generateGuidance — ordering and limits", () => {
  it("processes critical gaps before warning gaps", () => {
    const items = generateGuidance(
      [
        makeGap({ kpiName: { he: "CPC", en: "CPC" }, status: "warning" }),
        makeGap({ kpiName: { he: "CTR", en: "CTR" }, status: "critical" }),
      ],
      makeResult(),
    );
    // Critical comes first
    expect(items[0].priority).toBe("high");
  });

  it("caps output at max 3 items", () => {
    const items = generateGuidance(
      [
        makeGap({ kpiName: { he: "CPC", en: "CPC" }, status: "critical" }),
        makeGap({ kpiName: { he: "CTR", en: "CTR" }, status: "critical" }),
        makeGap({ kpiName: { he: "CPL", en: "CPL" }, status: "critical" }),
        makeGap({ kpiName: { he: "CPM", en: "CPM" }, status: "warning" }),
      ],
      makeResult(),
    );
    expect(items.length).toBeLessThanOrEqual(3);
  });

  it("ignores good status gaps", () => {
    const items = generateGuidance(
      [makeGap({ kpiName: { he: "CPC", en: "CPC" }, status: "good" })],
      makeResult(),
    );
    expect(items).toHaveLength(0);
  });

  it("skips gaps with unrecognised metric names", () => {
    const items = generateGuidance(
      [makeGap({ kpiName: { he: "ROAS", en: "ROAS" }, status: "critical" })],
      makeResult(),
    );
    expect(items).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════
// generateGuidance — cold-start mode
// ═══════════════════════════════════════════════

describe("generateGuidance — cold-start", () => {
  it("returns educational guidance when ukg.derived.coldStartMode is true", () => {
    const items = generateGuidance([], makeResult(), undefined, {
      derived: { coldStartMode: true },
    } as unknown as import("../userKnowledgeGraph").UserKnowledgeGraph);
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((i) => i.metric === "profile")).toBe(true);
  });

  it("cold-start guidance has high priority for first item", () => {
    const items = generateGuidance([], makeResult(), undefined, {
      derived: { coldStartMode: true },
    } as unknown as import("../userKnowledgeGraph").UserKnowledgeGraph);
    expect(items[0].priority).toBe("high");
  });

  it("cold-start triggered when gaps empty and visitCount is 1", () => {
    const items = generateGuidance([], makeResult(), undefined, {
      derived: { coldStartMode: false },
      behavior: { visitCount: 1 },
    } as unknown as import("../userKnowledgeGraph").UserKnowledgeGraph);
    expect(items.length).toBeGreaterThan(0);
  });

  it("does not trigger cold-start when visitCount > 1 and no coldStartMode", () => {
    const items = generateGuidance([], makeResult(), undefined, {
      derived: { coldStartMode: false },
      behavior: { visitCount: 5 },
    } as unknown as import("../userKnowledgeGraph").UserKnowledgeGraph);
    expect(items).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════
// getOverallHealth
// ═══════════════════════════════════════════════

describe("getOverallHealth", () => {
  it("returns no-data result when gaps is empty", () => {
    const health = getOverallHealth([]);
    expect(health.score).toBe(0);
    expect(health.label.en).toBe("No data");
    expect(health.color).toBe("gray");
  });

  it("100% good gaps → healthy green", () => {
    const health = getOverallHealth([
      makeGap({ status: "good" }),
      makeGap({ status: "good" }),
    ]);
    expect(health.score).toBe(100);
    expect(health.color).toBe("green");
    expect(health.label.en).toBe("Healthy");
  });

  it("0% good gaps → critical red", () => {
    const health = getOverallHealth([
      makeGap({ status: "critical" }),
      makeGap({ status: "critical" }),
    ]);
    expect(health.score).toBe(0);
    expect(health.color).toBe("red");
    expect(health.label.en).toBe("Critical");
  });

  it("50% good → needs attention yellow", () => {
    const health = getOverallHealth([
      makeGap({ status: "good" }),
      makeGap({ status: "critical" }),
    ]);
    expect(health.score).toBe(50);
    expect(health.color).toBe("yellow");
  });

  it("75% good → healthy green boundary", () => {
    const health = getOverallHealth([
      makeGap({ status: "good" }),
      makeGap({ status: "good" }),
      makeGap({ status: "good" }),
      makeGap({ status: "critical" }),
    ]);
    expect(health.score).toBe(75);
    expect(health.color).toBe("green");
  });

  it("score is between 0 and 100 for any input", () => {
    const mixed = [
      makeGap({ status: "good" }),
      makeGap({ status: "warning" }),
      makeGap({ status: "critical" }),
    ];
    const health = getOverallHealth(mixed);
    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.score).toBeLessThanOrEqual(100);
  });

  it("returns bilingual label", () => {
    const health = getOverallHealth([makeGap({ status: "good" })]);
    expect(health.label.he.length).toBeGreaterThan(0);
    expect(health.label.en.length).toBeGreaterThan(0);
  });
});
