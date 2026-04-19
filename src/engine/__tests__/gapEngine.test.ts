import { describe, it, expect } from "vitest";
import { computeGaps, ENGINE_MANIFEST } from "../gapEngine";
import type { FunnelResult } from "@/types/funnel";
import type { MetaInsights } from "@/types/meta";

// ═══════════════════════════════════════════════
// Fixtures
// ═══════════════════════════════════════════════

function makeInsights(overrides: Partial<MetaInsights> = {}): MetaInsights {
  return {
    spend: "500",
    impressions: "10000",
    clicks: "200",
    cpc: "2.50",
    cpm: "50",
    ctr: "2.0",
    reach: "8000",
    date_start: "2024-01-01",
    date_stop: "2024-01-31",
    actions: [],
    cost_per_action_type: [],
    ...overrides,
  };
}

function makeFunnelResult(
  kpis: { name: { he: string; en: string }; target: string }[],
): FunnelResult {
  return {
    id: "plan-1",
    funnelName: { he: "משפך", en: "Funnel" },
    stages: [],
    totalBudget: { min: 0, max: 0 },
    overallTips: [],
    hookTips: [],
    copyLab: {} as FunnelResult["copyLab"],
    kpis,
    createdAt: new Date().toISOString(),
    formData: {} as FunnelResult["formData"],
  };
}

// ═══════════════════════════════════════════════
// ENGINE_MANIFEST
// ═══════════════════════════════════════════════

describe("gapEngine — ENGINE_MANIFEST", () => {
  it("name is gapEngine", () => {
    expect(ENGINE_MANIFEST.name).toBe("gapEngine");
  });

  it("stage is diagnose", () => {
    expect(ENGINE_MANIFEST.stage).toBe("diagnose");
  });

  it("writes to CAMPAIGN-gaps-*", () => {
    expect(ENGINE_MANIFEST.writes).toContain("CAMPAIGN-gaps-*");
  });
});

// ═══════════════════════════════════════════════
// computeGaps — basic parsing
// ═══════════════════════════════════════════════

describe("computeGaps — target parsing", () => {
  it("returns empty array when kpis array is empty", () => {
    const result = computeGaps(makeFunnelResult([]), makeInsights());
    expect(result).toEqual([]);
  });

  it("skips kpi when target cannot be parsed", () => {
    const result = computeGaps(
      makeFunnelResult([{ name: { he: "CPC", en: "CPC" }, target: "unparseable" }]),
      makeInsights(),
    );
    expect(result).toHaveLength(0);
  });

  it("parses simple range target like '2-4'", () => {
    const result = computeGaps(
      makeFunnelResult([{ name: { he: "CPC", en: "CPC" }, target: "2-4" }]),
      makeInsights({ cpc: "3.00" }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].targetMin).toBe(2);
    expect(result[0].targetMax).toBe(4);
  });

  it("parses currency-prefixed target like '₪3-8'", () => {
    const result = computeGaps(
      makeFunnelResult([{ name: { he: "CPC", en: "CPC" }, target: "₪3-8" }]),
      makeInsights({ cpc: "5.00" }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].targetMin).toBe(3);
    expect(result[0].targetMax).toBe(8);
  });

  it("parses percentage target like '2-4%'", () => {
    const result = computeGaps(
      makeFunnelResult([{ name: { he: "CTR", en: "CTR" }, target: "2-4%" }]),
      makeInsights({ ctr: "3.0" }),
    );
    expect(result[0].unit).toBe("%");
    expect(result[0].targetMin).toBe(2);
  });

  it("parses dash variants (en-dash –)", () => {
    const result = computeGaps(
      makeFunnelResult([{ name: { he: "CPC", en: "CPC" }, target: "2–4" }]),
      makeInsights({ cpc: "3.00" }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].targetMin).toBe(2);
    expect(result[0].targetMax).toBe(4);
  });
});

// ═══════════════════════════════════════════════
// computeGaps — metric extraction
// ═══════════════════════════════════════════════

describe("computeGaps — metric extraction from insights", () => {
  it("extracts CPC from insights.cpc", () => {
    const gaps = computeGaps(
      makeFunnelResult([{ name: { he: "CPC", en: "CPC" }, target: "1-3" }]),
      makeInsights({ cpc: "5.00" }),
    );
    expect(gaps[0].actual).toBeCloseTo(5.0);
  });

  it("extracts CPM from insights.cpm", () => {
    const gaps = computeGaps(
      makeFunnelResult([{ name: { he: "CPM", en: "CPM" }, target: "30-60" }]),
      makeInsights({ cpm: "80" }),
    );
    expect(gaps[0].actual).toBeCloseTo(80);
  });

  it("extracts CTR from insights.ctr", () => {
    const gaps = computeGaps(
      makeFunnelResult([{ name: { he: "CTR", en: "CTR" }, target: "2-4%" }]),
      makeInsights({ ctr: "1.5" }),
    );
    expect(gaps[0].actual).toBeCloseTo(1.5);
  });

  it("extracts CPL from cost_per_action_type for lead action", () => {
    const gaps = computeGaps(
      makeFunnelResult([{ name: { he: "CPL", en: "CPL" }, target: "20-50" }]),
      makeInsights({
        cost_per_action_type: [{ action_type: "lead", value: "35" }],
      }),
    );
    expect(gaps[0].actual).toBeCloseTo(35);
  });

  it("extracts CPL from offsite_conversion.fb_pixel_lead action type", () => {
    const gaps = computeGaps(
      makeFunnelResult([{ name: { he: "CPL", en: "CPL" }, target: "20-50" }]),
      makeInsights({
        cost_per_action_type: [{ action_type: "offsite_conversion.fb_pixel_lead", value: "40" }],
      }),
    );
    expect(gaps[0].actual).toBeCloseTo(40);
  });

  it("extracts CVR as (conversions/clicks)*100", () => {
    const gaps = computeGaps(
      makeFunnelResult([{ name: { he: "CVR", en: "CVR" }, target: "1-3%" }]),
      makeInsights({
        clicks: "100",
        actions: [{ action_type: "purchase", value: "2" }],
      }),
    );
    expect(gaps[0].actual).toBeCloseTo(2.0);
  });

  it("skips metric when actual value cannot be extracted", () => {
    const gaps = computeGaps(
      makeFunnelResult([{ name: { he: "CPL", en: "CPL" }, target: "20-50" }]),
      makeInsights({ cost_per_action_type: [] }),
    );
    expect(gaps).toHaveLength(0);
  });

  it("skips CVR when clicks is 0", () => {
    const gaps = computeGaps(
      makeFunnelResult([{ name: { he: "CVR", en: "CVR" }, target: "1-3%" }]),
      makeInsights({
        clicks: "0",
        actions: [{ action_type: "purchase", value: "1" }],
      }),
    );
    expect(gaps).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════
// computeGaps — status classification
// ═══════════════════════════════════════════════

describe("computeGaps — status classification", () => {
  it("status is good when actual <= target midpoint (cost metric)", () => {
    // midpoint = 2; actual = 1.5; gapPercent = (1.5-2)/2*100 = -25% → good
    const gaps = computeGaps(
      makeFunnelResult([{ name: { he: "CPC", en: "CPC" }, target: "1-3" }]),
      makeInsights({ cpc: "1.5" }),
    );
    expect(gaps[0].status).toBe("good");
  });

  it("status is warning when actual is 1-20% above target", () => {
    // midpoint = 2; actual = 2.3; gapPercent = (2.3-2)/2*100 = 15% → warning
    const gaps = computeGaps(
      makeFunnelResult([{ name: { he: "CPC", en: "CPC" }, target: "1-3" }]),
      makeInsights({ cpc: "2.30" }),
    );
    expect(gaps[0].status).toBe("warning");
  });

  it("status is critical when actual is > 20% above target", () => {
    // midpoint = 2; actual = 3.0; gapPercent = (3-2)/2*100 = 50% → critical
    const gaps = computeGaps(
      makeFunnelResult([{ name: { he: "CPC", en: "CPC" }, target: "1-3" }]),
      makeInsights({ cpc: "3.00" }),
    );
    expect(gaps[0].status).toBe("critical");
  });

  it("gapPercent is calculated correctly", () => {
    // midpoint = (10+20)/2 = 15; actual = 20; gap = (20-15)/15*100 = 33.33%
    const gaps = computeGaps(
      makeFunnelResult([{ name: { he: "CPC", en: "CPC" }, target: "10-20" }]),
      makeInsights({ cpc: "20.00" }),
    );
    expect(gaps[0].gapPercent).toBeCloseTo(33.33, 1);
  });

  it("exact target midpoint yields gapPercent of 0", () => {
    const gaps = computeGaps(
      makeFunnelResult([{ name: { he: "CPC", en: "CPC" }, target: "2-4" }]),
      makeInsights({ cpc: "3.00" }),
    );
    expect(gaps[0].gapPercent).toBeCloseTo(0, 5);
  });

  it("returns kpiName with both he and en", () => {
    const gaps = computeGaps(
      makeFunnelResult([{ name: { he: "עלות לקליק", en: "CPC" }, target: "1-3" }]),
      makeInsights({ cpc: "2.00" }),
    );
    expect(gaps[0].kpiName.he).toBe("עלות לקליק");
    expect(gaps[0].kpiName.en).toBe("CPC");
  });
});

// ═══════════════════════════════════════════════
// computeGaps — multiple KPIs
// ═══════════════════════════════════════════════

describe("computeGaps — multiple KPIs", () => {
  it("processes multiple KPIs from the same FunnelResult", () => {
    const gaps = computeGaps(
      makeFunnelResult([
        { name: { he: "CPC", en: "CPC" }, target: "1-3" },
        { name: { he: "CPM", en: "CPM" }, target: "30-60" },
      ]),
      makeInsights({ cpc: "2.00", cpm: "45" }),
    );
    expect(gaps).toHaveLength(2);
  });

  it("produces independent status for each KPI", () => {
    const gaps = computeGaps(
      makeFunnelResult([
        { name: { he: "CPC", en: "CPC" }, target: "2-4" }, // actual 2 → good
        { name: { he: "CPM", en: "CPM" }, target: "30-50" }, // actual 80 → critical
      ]),
      makeInsights({ cpc: "2.00", cpm: "80" }),
    );
    const cpcGap = gaps.find((g) => g.kpiName.en === "CPC")!;
    const cpmGap = gaps.find((g) => g.kpiName.en === "CPM")!;
    expect(cpcGap.status).toBe("good");
    expect(cpmGap.status).toBe("critical");
  });
});
