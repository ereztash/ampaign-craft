// ═══════════════════════════════════════════════
// Export Engine — Data export for CRM, Email, and Analytics
// Produces CSV, Excel, and CRM-compatible formats
// using the existing xlsx dependency.
// ═══════════════════════════════════════════════

import * as XLSX from "xlsx";
import type { SavedPlan, FunnelResult } from "@/types/funnel";
import type { CampaignBenchmark, IndustryInsight } from "./campaignAnalyticsEngine";

export const ENGINE_MANIFEST = {
  name: "exportEngine",
  reads: ["CAMPAIGN-plans-*", "CAMPAIGN-analytics-*"],
  writes: [],
  stage: "deploy" as const,
  isLive: true,
  parameters: ["Export to channels"],
} as const;

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export interface ExportContact {
  name: string;
  email: string;
  company?: string;
  industry?: string;
  tier?: string;
  source?: string;
  tags?: string[];
  createdAt?: string;
}

export interface ExportResult {
  data: ArrayBuffer;
  filename: string;
  mimeType: string;
}

// ═══════════════════════════════════════════════
// PLAN EXPORT
// ═══════════════════════════════════════════════

/**
 * Export saved plans to Excel format.
 */
export function exportPlansToExcel(plans: SavedPlan[]): ExportResult {
  const rows = plans.map((plan) => ({
    "Plan Name": plan.name || plan.result.formData?.businessField || "Unnamed",
    "Industry": plan.result.formData?.businessField || "",
    "Audience": plan.result.formData?.audienceType || "",
    "Goal": plan.result.formData?.mainGoal || "",
    "Budget (Min)": plan.result.totalBudget?.min || 0,
    "Budget (Max)": plan.result.totalBudget?.max || 0,
    "Stages": plan.result.stages?.length || 0,
    "Channels": extractChannels(plan.result).join(", "),
    "Hooks": plan.result.hookTips?.length || 0,
    "Saved At": plan.savedAt || "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Campaign Plans");

  const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });

  return {
    data: buffer,
    filename: `campaign-plans-${dateStamp()}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

/**
 * Export saved plans to CSV format.
 */
export function exportPlansToCSV(plans: SavedPlan[]): ExportResult {
  const rows = plans.map((plan) => ({
    plan_name: plan.name || plan.result.formData?.businessField || "Unnamed",
    industry: plan.result.formData?.businessField || "",
    audience_type: plan.result.formData?.audienceType || "",
    main_goal: plan.result.formData?.mainGoal || "",
    budget_min: plan.result.totalBudget?.min || 0,
    budget_max: plan.result.totalBudget?.max || 0,
    stage_count: plan.result.stages?.length || 0,
    channels: extractChannels(plan.result).join("; "),
    hook_count: plan.result.hookTips?.length || 0,
    saved_at: plan.savedAt || "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Plans");

  const csv = XLSX.utils.sheet_to_csv(ws);
  const encoder = new TextEncoder();
  const buffer = encoder.encode(csv).buffer;

  return {
    data: buffer,
    filename: `campaign-plans-${dateStamp()}.csv`,
    mimeType: "text/csv",
  };
}

// ═══════════════════════════════════════════════
// CRM EXPORT (HubSpot-compatible)
// ═══════════════════════════════════════════════

/**
 * Export contacts in HubSpot-compatible CSV format.
 */
export function exportContactsToCRM(contacts: ExportContact[]): ExportResult {
  const rows = contacts.map((c) => ({
    "First Name": c.name.split(" ")[0] || "",
    "Last Name": c.name.split(" ").slice(1).join(" ") || "",
    "Email": c.email,
    "Company": c.company || "",
    "Industry": c.industry || "",
    "Lifecycle Stage": c.tier === "business" ? "Customer" : c.tier === "pro" ? "Lead" : "Subscriber",
    "Lead Source": c.source || "Campaign Craft",
    "Tags": c.tags?.join("; ") || "",
    "Create Date": c.createdAt || new Date().toISOString(),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Contacts");

  const csv = XLSX.utils.sheet_to_csv(ws);
  const encoder = new TextEncoder();
  const buffer = encoder.encode(csv).buffer;

  return {
    data: buffer,
    filename: `crm-contacts-${dateStamp()}.csv`,
    mimeType: "text/csv",
  };
}

// ═══════════════════════════════════════════════
// EMAIL LIST EXPORT (Mailchimp-compatible)
// ═══════════════════════════════════════════════

/**
 * Export email list in Mailchimp-compatible CSV format.
 */
export function exportEmailList(
  contacts: ExportContact[]
): ExportResult {
  const rows = contacts.map((c) => ({
    "Email Address": c.email,
    "First Name": c.name.split(" ")[0] || "",
    "Last Name": c.name.split(" ").slice(1).join(" ") || "",
    "Tags": c.tags?.join(", ") || "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Subscribers");

  const csv = XLSX.utils.sheet_to_csv(ws);
  const encoder = new TextEncoder();
  const buffer = encoder.encode(csv).buffer;

  return {
    data: buffer,
    filename: `email-list-${dateStamp()}.csv`,
    mimeType: "text/csv",
  };
}

// ═══════════════════════════════════════════════
// ANALYTICS EXPORT
// ═══════════════════════════════════════════════

/**
 * Export analytics data (benchmarks + insights) to Excel workbook.
 */
export function exportAnalyticsToExcel(
  benchmarks: CampaignBenchmark[],
  insights: IndustryInsight[]
): ExportResult {
  const wb = XLSX.utils.book_new();

  // Benchmarks sheet
  const benchmarkRows = benchmarks.map((b) => ({
    "Industry": b.industry,
    "Audience": b.audienceType,
    "Metric": b.metric,
    "Value": b.value,
    "Sample Size": b.sampleSize,
    "Confidence": `${Math.round(b.confidence * 100)}%`,
    "Updated": b.updatedAt,
  }));
  const bws = XLSX.utils.json_to_sheet(benchmarkRows);
  XLSX.utils.book_append_sheet(wb, bws, "Benchmarks");

  // Industry Insights sheet
  const insightRows = insights.map((i) => ({
    "Industry": i.industry,
    "Top Channels": i.topChannels.map((c) => c.channel).join(", "),
    "Avg Budget Min": i.avgBudgetRange.min,
    "Avg Budget Max": i.avgBudgetRange.max,
    "Avg Stages": i.avgStageCount,
    "Common Goals": i.commonGoals.map((g) => g.goal).join(", "),
    "Sample Size": i.sampleSize,
  }));
  const iws = XLSX.utils.json_to_sheet(insightRows);
  XLSX.utils.book_append_sheet(wb, iws, "Industry Insights");

  const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });

  return {
    data: buffer,
    filename: `analytics-report-${dateStamp()}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function extractChannels(result: FunnelResult): string[] {
  const channels = new Set<string>();
  for (const stage of result.stages || []) {
    for (const ch of stage.channels || []) {
      const name = ch.channel || ch.name?.en || "";
      if (name) channels.add(name);
    }
  }
  return [...channels];
}

function dateStamp(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Trigger file download in the browser.
 */
export function downloadExport(result: ExportResult): void {
  const blob = new Blob([result.data], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
