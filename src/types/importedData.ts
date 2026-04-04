export interface ColumnDef {
  name: string;
  type: "string" | "number" | "date" | "boolean";
  role?: "date" | "metric" | "dimension" | "identifier";
}

export interface DatasetSchema {
  columns: ColumnDef[];
  detectedType:
    | "campaign_performance"
    | "budget_tracking"
    | "leads"
    | "content_performance"
    | "custom";
}

export interface ImportedDataset {
  id: string;
  name: string;
  importedAt: string;
  source: "xlsx" | "csv";
  schema: DatasetSchema;
  rows: Record<string, unknown>[];
  linkedPlanId?: string;
}

export interface TrendItem {
  metric: string;
  direction: "up" | "down" | "stable";
  changePercent: number;
  period: string;
  significance: "high" | "medium" | "low";
  insight: { he: string; en: string };
}

export interface TrendAnalysis {
  datasetId: string;
  analyzedAt: string;
  trends: TrendItem[];
  summary: {
    direction: "improving" | "declining" | "stable";
    confidence: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
