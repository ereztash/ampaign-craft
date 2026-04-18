import { describe, it, expect, vi } from "vitest";
import {
  detectSchema,
  validateDataset,
  analyzeTrends,
  ENGINE_MANIFEST,
} from "../dataImportEngine";
import type { ImportedDataset, DatasetSchema } from "@/types/importedData";

// ── Mock external deps ─────────────────────────────────────────────────────
vi.mock("../blackboard/contract", () => ({
  writeContext: vi.fn().mockResolvedValue(undefined),
  conceptKey: vi.fn((_a: string, _b: string, _c: string) => `${_a}-${_b}-${_c}`),
}));

// Note: parseXlsxFile requires a real File object + XLSX parsing — integration only.
// We test detectSchema, validateDataset, analyzeTrends which are pure functions.

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeDataset(overrides: Partial<ImportedDataset> = {}): ImportedDataset {
  return {
    id: "ds1",
    name: "Test Dataset",
    importedAt: new Date().toISOString(),
    source: "xlsx",
    schema: {
      columns: [
        { name: "date", type: "date", role: "date" },
        { name: "spend", type: "number", role: "metric" },
        { name: "clicks", type: "number", role: "metric" },
        { name: "campaign", type: "string", role: "dimension" },
      ],
      detectedType: "campaign_performance",
    },
    rows: [
      { date: "2024-01-01", spend: 100, clicks: 50, campaign: "A" },
      { date: "2024-01-02", spend: 120, clicks: 60, campaign: "A" },
      { date: "2024-01-03", spend: 80, clicks: 40, campaign: "B" },
      { date: "2024-01-04", spend: 200, clicks: 100, campaign: "B" },
    ],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// ENGINE_MANIFEST
// ─────────────────────────────────────────────────────────────────────────

describe("DataImportEngine — ENGINE_MANIFEST", () => {
  it("has the correct name", () => {
    expect(ENGINE_MANIFEST.name).toBe("dataImportEngine");
  });

  it("has stage 'discover'", () => {
    expect(ENGINE_MANIFEST.stage).toBe("discover");
  });

  it("isLive is true", () => {
    expect(ENGINE_MANIFEST.isLive).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// detectSchema
// ─────────────────────────────────────────────────────────────────────────

describe("detectSchema — empty rows", () => {
  it("returns empty columns for empty rows", () => {
    const schema = detectSchema([]);
    expect(schema.columns).toEqual([]);
    expect(schema.detectedType).toBe("custom");
  });
});

describe("detectSchema — column type inference", () => {
  it("detects string column type", () => {
    const rows = [{ name: "Alice" }, { name: "Bob" }];
    const schema = detectSchema(rows);
    const col = schema.columns.find((c) => c.name === "name");
    expect(col?.type).toBe("string");
  });

  it("detects number column type", () => {
    const rows = [{ spend: 100 }, { spend: 200 }];
    const schema = detectSchema(rows);
    const col = schema.columns.find((c) => c.name === "spend");
    expect(col?.type).toBe("number");
  });

  it("detects date column type from Date objects", () => {
    const rows = [{ date: new Date("2024-01-01") }, { date: new Date("2024-01-02") }];
    const schema = detectSchema(rows);
    const col = schema.columns.find((c) => c.name === "date");
    expect(col?.type).toBe("date");
  });

  it("detects date column type from date strings", () => {
    const rows = [{ date: "2024-01-01" }, { date: "2024-01-02" }];
    const schema = detectSchema(rows);
    const col = schema.columns.find((c) => c.name === "date");
    expect(col?.type).toBe("date");
  });

  it("detects boolean column type", () => {
    const rows = [{ active: true }, { active: false }];
    const schema = detectSchema(rows);
    const col = schema.columns.find((c) => c.name === "active");
    expect(col?.type).toBe("boolean");
  });

  it("all-null column defaults to string", () => {
    const rows = [{ field: null }, { field: null }];
    const schema = detectSchema(rows);
    const col = schema.columns.find((c) => c.name === "field");
    expect(col?.type).toBe("string");
  });
});

describe("detectSchema — column role inference", () => {
  it("column named 'date' gets role 'date'", () => {
    const rows = [{ date: "2024-01-01" }];
    const schema = detectSchema(rows);
    expect(schema.columns[0].role).toBe("date");
  });

  it("column named 'spend' gets role 'metric'", () => {
    const rows = [{ spend: 100 }];
    const schema = detectSchema(rows);
    expect(schema.columns[0].role).toBe("metric");
  });

  it("column named 'campaign' gets role 'dimension'", () => {
    const rows = [{ campaign: "Alpha" }];
    const schema = detectSchema(rows);
    expect(schema.columns[0].role).toBe("dimension");
  });

  it("column named 'id' gets role 'identifier'", () => {
    const rows = [{ id: "123" }];
    const schema = detectSchema(rows);
    expect(schema.columns[0].role).toBe("identifier");
  });

  it("column named 'lead_id' gets role 'identifier'", () => {
    const rows = [{ lead_id: "abc" }];
    const schema = detectSchema(rows);
    expect(schema.columns[0].role).toBe("identifier");
  });
});

describe("detectSchema — dataset type detection", () => {
  it("detects campaign_performance with campaign + spend", () => {
    const rows = [{ campaign: "A", spend: 100, impressions: 500 }];
    const schema = detectSchema(rows);
    expect(schema.detectedType).toBe("campaign_performance");
  });

  it("detects budget_tracking with budget + allocated", () => {
    const rows = [{ budget: 1000, allocated: 800 }];
    const schema = detectSchema(rows);
    expect(schema.detectedType).toBe("budget_tracking");
  });

  it("detects leads type with lead column", () => {
    const rows = [{ lead_id: "1", name: "Alice", email: "a@b.com" }];
    const schema = detectSchema(rows);
    expect(schema.detectedType).toBe("leads");
  });

  it("detects content_performance with content + views", () => {
    const rows = [{ content: "Blog post", views: 500, engagement: 0.05 }];
    const schema = detectSchema(rows);
    expect(schema.detectedType).toBe("content_performance");
  });

  it("falls back to custom for unknown schema", () => {
    const rows = [{ foo: "bar", baz: 42 }];
    const schema = detectSchema(rows);
    expect(schema.detectedType).toBe("custom");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// validateDataset
// ─────────────────────────────────────────────────────────────────────────

describe("validateDataset", () => {
  it("returns invalid for empty rows", () => {
    const schema: DatasetSchema = { columns: [], detectedType: "custom" };
    const result = validateDataset([], schema);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns valid for normal dataset", () => {
    const rows = [{ date: "2024-01-01", spend: 100 }];
    const schema = detectSchema(rows);
    const result = validateDataset(rows, schema);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("warns about large dataset (>10000 rows)", () => {
    const rows = Array.from({ length: 10001 }, (_, i) => ({ id: i, val: i }));
    const schema = detectSchema(rows);
    const result = validateDataset(rows, schema);
    const hasLargeWarning = result.warnings.some((w) => w.includes("Large dataset"));
    expect(hasLargeWarning).toBe(true);
  });

  it("warns when no date column detected", () => {
    const rows = [{ spend: 100, clicks: 50 }];
    const schema = detectSchema(rows);
    const result = validateDataset(rows, schema);
    const hasDateWarning = result.warnings.some((w) => w.toLowerCase().includes("date"));
    expect(hasDateWarning).toBe(true);
  });

  it("warns when no metric columns detected", () => {
    const rows = [{ campaign: "A", name: "Alpha" }];
    const schema = detectSchema(rows);
    const result = validateDataset(rows, schema);
    const hasMetricWarning = result.warnings.some((w) => w.toLowerCase().includes("metric"));
    expect(hasMetricWarning).toBe(true);
  });

  it("result has valid, errors, warnings fields", () => {
    const rows = [{ date: "2024-01-01", spend: 100 }];
    const schema = detectSchema(rows);
    const result = validateDataset(rows, schema);
    expect(typeof result.valid).toBe("boolean");
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// analyzeTrends
// ─────────────────────────────────────────────────────────────────────────

describe("analyzeTrends", () => {
  it("returns stable with no trends when no date column", () => {
    const dataset = makeDataset({
      schema: {
        columns: [{ name: "spend", type: "number", role: "metric" }],
        detectedType: "custom",
      },
      rows: [{ spend: 100 }, { spend: 200 }],
    });
    const result = analyzeTrends(dataset);
    expect(result.trends).toHaveLength(0);
    expect(result.summary.direction).toBe("stable");
  });

  it("returns stable with no trends when fewer than 2 rows", () => {
    const dataset = makeDataset({ rows: [{ date: "2024-01-01", spend: 100, campaign: "A" }] });
    const result = analyzeTrends(dataset);
    expect(result.trends).toHaveLength(0);
  });

  it("returns TrendAnalysis with required fields", () => {
    const result = analyzeTrends(makeDataset());
    expect(result).toHaveProperty("datasetId", "ds1");
    expect(result).toHaveProperty("analyzedAt");
    expect(result).toHaveProperty("trends");
    expect(result).toHaveProperty("summary");
  });

  it("returns trends for each metric column", () => {
    const result = analyzeTrends(makeDataset());
    const metricNames = result.trends.map((t) => t.metric);
    expect(metricNames).toContain("spend");
    expect(metricNames).toContain("clicks");
  });

  it("trend direction is up, down, or stable", () => {
    const result = analyzeTrends(makeDataset());
    for (const trend of result.trends) {
      expect(["up", "down", "stable"]).toContain(trend.direction);
    }
  });

  it("trend significance is high, medium, or low", () => {
    const result = analyzeTrends(makeDataset());
    for (const trend of result.trends) {
      expect(["high", "medium", "low"]).toContain(trend.significance);
    }
  });

  it("trend insight has bilingual text", () => {
    const result = analyzeTrends(makeDataset());
    for (const trend of result.trends) {
      expect(trend.insight.he).toBeTruthy();
      expect(trend.insight.en).toBeTruthy();
    }
  });

  it("detects upward trend in improving data", () => {
    const rows = [
      { date: "2024-01-01", conversions: 10 },
      { date: "2024-01-02", conversions: 20 },
      { date: "2024-01-03", conversions: 30 },
      { date: "2024-01-04", conversions: 40 },
    ];
    const schema = detectSchema(rows);
    const dataset: ImportedDataset = { id: "d2", name: "trend", importedAt: new Date().toISOString(), source: "xlsx", schema, rows };
    const result = analyzeTrends(dataset);
    const convTrend = result.trends.find((t) => t.metric === "conversions");
    expect(convTrend?.direction).toBe("up");
  });

  it("summary direction is one of the valid values", () => {
    const result = analyzeTrends(makeDataset());
    expect(["improving", "declining", "stable"]).toContain(result.summary.direction);
  });

  it("summary confidence is between 0 and 1", () => {
    const result = analyzeTrends(makeDataset());
    expect(result.summary.confidence).toBeGreaterThanOrEqual(0);
    expect(result.summary.confidence).toBeLessThanOrEqual(1);
  });

  it("large dataset (>30 rows) has higher confidence", () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({
      date: new Date(2024, 0, i + 1).toISOString().slice(0, 10),
      spend: 100 + i * 2,
    }));
    const schema = detectSchema(rows);
    const dataset: ImportedDataset = { id: "d3", name: "large", importedAt: new Date().toISOString(), source: "xlsx", schema, rows };
    const result = analyzeTrends(dataset);
    expect(result.summary.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("cpc metric (cost type) treats 'down' as improving", () => {
    const rows = [
      { date: "2024-01-01", cpc: 2.0 },
      { date: "2024-01-02", cpc: 1.5 },
      { date: "2024-01-03", cpc: 1.0 },
      { date: "2024-01-04", cpc: 0.8 },
    ];
    const schema = detectSchema(rows);
    const dataset: ImportedDataset = { id: "d4", name: "cpc", importedAt: new Date().toISOString(), source: "xlsx", schema, rows };
    const result = analyzeTrends(dataset);
    const cpcTrend = result.trends.find((t) => t.metric === "cpc");
    expect(cpcTrend?.direction).toBe("down");
    // Declining CPC is positive — insight should say "positive"
    expect(cpcTrend?.insight.en).toContain("positive");
  });
});
