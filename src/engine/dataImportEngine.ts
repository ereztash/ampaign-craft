import {
  ImportedDataset,
  DatasetSchema,
  ColumnDef,
  TrendAnalysis,
  TrendItem,
  ValidationResult,
} from "@/types/importedData";
import {
  writeContext,
  conceptKey,
  type BlackboardWriteContext,
} from "./blackboard/contract";

export const ENGINE_MANIFEST = {
  name: "dataImportEngine",
  reads: ["USER-import-*"],
  writes: ["USER-dataset-*"],
  stage: "discover",
  isLive: true,
  parameters: ["Data import pipeline"],
} as const;

// ═══════════════════════════════════════════════
// XLSX Parsing
// ═══════════════════════════════════════════════

export async function parseXlsxFile(
  file: File
): Promise<{ sheetName: string; rows: Record<string, unknown>[] }[]> {
  // Dynamic import keeps xlsx (~85KB gzipped) out of the main bundle —
  // pulled in only when a user actually imports a spreadsheet.
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  // type: 'array' is required when passing an ArrayBuffer in xlsx 0.18.x
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });

  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
    });
    return { sheetName, rows };
  });
}

// ═══════════════════════════════════════════════
// Schema Detection
// ═══════════════════════════════════════════════

const DATE_KEYWORDS = ["date", "תאריך", "day", "יום", "month", "חודש", "time", "זמן"];
const METRIC_KEYWORDS = [
  "spend", "הוצאה", "cost", "עלות", "impressions", "חשיפות",
  "clicks", "לחיצות", "cpc", "cpm", "ctr", "conversions", "המרות",
  "revenue", "הכנסה", "budget", "תקציב", "reach", "חשיפה",
  "views", "צפיות", "engagement", "מעורבות", "rate", "שיעור",
];
const DIMENSION_KEYWORDS = [
  "campaign", "קמפיין", "channel", "ערוץ", "source", "מקור",
  "type", "סוג", "category", "קטגוריה", "status", "סטטוס",
  "stage", "שלב", "name", "שם",
];
const ID_KEYWORDS = ["id", "מזהה", "lead_id", "campaign_id"];

function inferColumnType(values: unknown[]): "string" | "number" | "date" | "boolean" {
  const nonNull = values.filter((v) => v !== null && v !== undefined);
  if (nonNull.length === 0) return "string";

  const sample = nonNull.slice(0, 50);

  // Check for dates
  if (sample.some((v) => v instanceof Date)) return "date";
  if (sample.every((v) => typeof v === "boolean")) return "boolean";
  if (sample.every((v) => typeof v === "number" || (typeof v === "string" && !isNaN(Number(v)) && v.trim() !== ""))) {
    return "number";
  }

  // Check for date strings
  const datePattern = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/;
  if (sample.every((v) => typeof v === "string" && datePattern.test(v))) return "date";

  return "string";
}

function inferColumnRole(name: string, type: ColumnDef["type"]): ColumnDef["role"] {
  const lower = name.toLowerCase().trim();

  if (ID_KEYWORDS.some((k) => lower.includes(k))) return "identifier";
  if (type === "date" || DATE_KEYWORDS.some((k) => lower.includes(k))) return "date";
  if (type === "number" || METRIC_KEYWORDS.some((k) => lower.includes(k))) return "metric";
  if (DIMENSION_KEYWORDS.some((k) => lower.includes(k))) return "dimension";

  return (type as string) === "number" ? "metric" : "dimension";
}

function detectDatasetType(columns: ColumnDef[]): DatasetSchema["detectedType"] {
  const names = columns.map((c) => c.name.toLowerCase());

  // Campaign performance: has campaign + spend/impressions/clicks
  if (
    names.some((n) => n.includes("campaign") || n.includes("קמפיין")) &&
    names.some((n) => n.includes("spend") || n.includes("impression") || n.includes("click") || n.includes("הוצאה"))
  ) {
    return "campaign_performance";
  }

  // Budget tracking
  if (
    names.some((n) => n.includes("budget") || n.includes("תקציב")) &&
    names.some((n) => n.includes("allocated") || n.includes("spent") || n.includes("הוקצה"))
  ) {
    return "budget_tracking";
  }

  // Leads
  if (names.some((n) => n.includes("lead") || n.includes("ליד"))) {
    return "leads";
  }

  // Content performance
  if (
    names.some((n) => n.includes("content") || n.includes("תוכן")) &&
    names.some((n) => n.includes("view") || n.includes("engagement") || n.includes("צפיות"))
  ) {
    return "content_performance";
  }

  return "custom";
}

export function detectSchema(
  rows: Record<string, unknown>[],
  blackboardCtx?: BlackboardWriteContext,
): DatasetSchema {
  if (rows.length === 0) {
    return { columns: [], detectedType: "custom" };
  }

  const keys = Object.keys(rows[0]);
  const columns: ColumnDef[] = keys.map((key) => {
    const values = rows.map((r) => r[key]);
    const type = inferColumnType(values);
    const role = inferColumnRole(key, type);
    return { name: key, type, role };
  });

  const schema: DatasetSchema = {
    columns,
    detectedType: detectDatasetType(columns),
  };

  if (blackboardCtx) {
    void writeContext({
      userId: blackboardCtx.userId,
      planId: blackboardCtx.planId,
      key: conceptKey("USER", "dataset", blackboardCtx.planId ?? blackboardCtx.userId),
      stage: "discover",
      payload: {
        columnCount: schema.columns.length,
        detectedType: schema.detectedType,
        rowCount: rows.length,
      },
      writtenBy: ENGINE_MANIFEST.name,
    }).catch(() => {});
  }

  return schema;
}

// ═══════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════

export function validateDataset(
  rows: Record<string, unknown>[],
  schema: DatasetSchema
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (rows.length === 0) {
    errors.push("Dataset is empty");
    return { valid: false, errors, warnings };
  }

  if (rows.length > 10000) {
    warnings.push(`Large dataset (${rows.length} rows) — consider filtering to improve performance`);
  }

  const hasDateCol = schema.columns.some((c) => c.role === "date");
  if (!hasDateCol) {
    warnings.push("No date column detected — trend analysis will be limited");
  }

  const hasMetric = schema.columns.some((c) => c.role === "metric");
  if (!hasMetric) {
    warnings.push("No metric columns detected — consider mapping column roles manually");
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ═══════════════════════════════════════════════
// Trend Analysis
// ═══════════════════════════════════════════════

function toDateValue(val: unknown): Date | null {
  if (val instanceof Date) return val;
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === "number") {
    // Excel serial date
    const d = new Date((val - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function toNumber(val: unknown): number | null {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseFloat(val.replace(/[^\d.-]/g, ""));
    return isNaN(n) ? null : n;
  }
  return null;
}

export function analyzeTrends(dataset: ImportedDataset): TrendAnalysis {
  const { schema, rows } = dataset;

  const dateCol = schema.columns.find((c) => c.role === "date");
  const metricCols = schema.columns.filter((c) => c.role === "metric");

  if (!dateCol || metricCols.length === 0 || rows.length < 2) {
    return {
      datasetId: dataset.id,
      analyzedAt: new Date().toISOString(),
      trends: [],
      summary: { direction: "stable", confidence: 0 },
    };
  }

  // Sort rows by date
  const sortedRows = [...rows]
    .map((r) => ({ ...r, _date: toDateValue(r[dateCol.name]) }))
    .filter((r) => r._date !== null)
    .sort((a, b) => a._date!.getTime() - b._date!.getTime());

  if (sortedRows.length < 2) {
    return {
      datasetId: dataset.id,
      analyzedAt: new Date().toISOString(),
      trends: [],
      summary: { direction: "stable", confidence: 0 },
    };
  }

  // Split into first half and second half
  const midpoint = Math.floor(sortedRows.length / 2);
  const firstHalf = sortedRows.slice(0, midpoint);
  const secondHalf = sortedRows.slice(midpoint);

  const trends: TrendItem[] = metricCols.map((col) => {
    const firstAvg = average(firstHalf.map((r) => toNumber(r[col.name])));
    const secondAvg = average(secondHalf.map((r) => toNumber(r[col.name])));

    const changePercent =
      firstAvg !== 0 ? ((secondAvg - firstAvg) / Math.abs(firstAvg)) * 100 : 0;

    const direction: "up" | "down" | "stable" =
      Math.abs(changePercent) < 3 ? "stable" : changePercent > 0 ? "up" : "down";

    const significance: "high" | "medium" | "low" =
      Math.abs(changePercent) > 20 ? "high" : Math.abs(changePercent) > 10 ? "medium" : "low";

    // Determine if this metric is "positive when up" (e.g., CTR, conversions)
    // vs "positive when down" (e.g., CPC, CPL)
    const isPositiveUp = !col.name.toLowerCase().match(/cpc|cpl|cpa|cost|עלות|הוצאה/);
    const isImproving = isPositiveUp ? direction === "up" : direction === "down";

    const insight = generateTrendInsight(col.name, direction, changePercent, isImproving);

    return {
      metric: col.name,
      direction,
      changePercent: Math.round(changePercent * 10) / 10,
      period: `${sortedRows.length} ${sortedRows.length > 30 ? "days" : "data points"}`,
      significance,
      insight,
    };
  });

  // Overall summary
  const improvingCount = trends.filter(
    (t) => (t.direction === "up" && !t.metric.toLowerCase().match(/cpc|cpl|cpa|cost/)) ||
           (t.direction === "down" && !!t.metric.toLowerCase().match(/cpc|cpl|cpa|cost/))
  ).length;
  const totalMeaningful = trends.filter((t) => t.direction !== "stable").length;

  const summaryDirection =
    totalMeaningful === 0
      ? "stable" as const
      : improvingCount > totalMeaningful / 2
      ? "improving" as const
      : "declining" as const;

  return {
    datasetId: dataset.id,
    analyzedAt: new Date().toISOString(),
    trends,
    summary: {
      direction: summaryDirection,
      confidence: sortedRows.length > 30 ? 0.8 : sortedRows.length > 10 ? 0.6 : 0.3,
    },
  };
}

function average(values: (number | null)[]): number {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function generateTrendInsight(
  metric: string,
  direction: "up" | "down" | "stable",
  changePercent: number,
  isImproving: boolean
): { he: string; en: string } {
  const absChange = Math.abs(Math.round(changePercent));
  const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";

  if (direction === "stable") {
    return {
      he: `${metric} יציב — ללא שינוי משמעותי`,
      en: `${metric} is stable — no significant change`,
    };
  }

  if (isImproving) {
    return {
      he: `${metric} ${arrow}${absChange}% — מגמה חיובית, להמשיך בכיוון`,
      en: `${metric} ${arrow}${absChange}% — positive trend, keep this direction`,
    };
  }

  return {
    he: `${metric} ${arrow}${absChange}% — דורש תשומת לב, לבדוק ולמטב`,
    en: `${metric} ${arrow}${absChange}% — needs attention, review and optimize`,
  };
}
