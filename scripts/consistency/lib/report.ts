import * as fs from "fs";
import * as path from "path";
import type { NumericViolation, IdentityViolation, SchemaViolation, ReportSummary } from "./types";

export type ReportFormat = "json" | "console" | "github";

export interface NumericReport {
  kind: "numeric";
  ranAt: string;
  summary: ReportSummary;
  violations: (NumericViolation & { allowlisted: boolean })[];
}

export interface IdentityReport {
  kind: "identity";
  ranAt: string;
  summary: ReportSummary;
  violations: (IdentityViolation & { allowlisted: boolean })[];
}

export interface SchemaReport {
  kind: "schema";
  ranAt: string;
  summary: ReportSummary;
  violations: (SchemaViolation & { claimId: string; severity: string; allowlisted: boolean })[];
}

type AnyReport = NumericReport | IdentityReport | SchemaReport;

export function writeReport(report: AnyReport, outDir: string): void {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${report.kind}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
}

export function printReport(report: AnyReport, format: ReportFormat = "console"): void {
  const { summary } = report;
  const all = report.violations as Array<{ allowlisted: boolean; claimId?: string }>;
  const active = all.filter((v) => !v.allowlisted);
  const blockers = active.filter(
    (v) => (v as { severity?: string }).severity === "blocker",
  );

  if (format === "github") {
    console.log(`## Consistency — ${report.kind}`);
    console.log(
      `- Checked: ${summary.checked} | Passed: ${summary.passed} | Violations: ${summary.violations} | Allowlisted: ${summary.allowlisted} | Blockers: ${blockers.length}`,
    );
    if (blockers.length > 0) {
      console.log("\n### Blockers\n");
      for (const v of blockers) {
        printViolation(v as NumericViolation & IdentityViolation & SchemaViolation, "github");
      }
    }
    return;
  }

  const tick = "✓";
  const cross = "✗";
  const warn = "⚠";

  console.log(`\n${report.kind.toUpperCase()} CONSISTENCY REPORT`);
  console.log(`  ${tick} checked      : ${summary.checked}`);
  console.log(`  ${tick} passed       : ${summary.passed}`);
  console.log(`  ${warn} allowlisted  : ${summary.allowlisted}`);
  console.log(`  ${cross} blockers     : ${blockers.length}`);

  if (active.length > 0) {
    console.log("\nActive violations:");
    for (const v of active) {
      printViolation(v as NumericViolation & IdentityViolation & SchemaViolation, format);
    }
  }

  if (blockers.length === 0 && active.length === 0) {
    console.log(`\n  ${tick} All checks passed (${summary.allowlisted} allowlisted).`);
  }
}

function printViolation(
  v: Partial<NumericViolation & IdentityViolation & SchemaViolation>,
  format: ReportFormat,
): void {
  const severity = v.severity === "blocker" ? "[BLOCKER]" : "[warn]";
  const id = v.claimId ?? "schema";
  if (format === "github") {
    console.log(
      `- **${severity}** \`${id}\` — ${v.message ?? `expected ${v.expected}, got ${v.actual ?? v.token}`}`,
    );
    if (v.fixHint ?? (v as { suggestedFix?: string }).suggestedFix) {
      console.log(`  _Fix:_ ${v.fixHint ?? (v as { suggestedFix?: string }).suggestedFix}`);
    }
    return;
  }
  const loc = v.file ? `  ${v.file}${v.line ? `:${v.line}` : ""}` : "";
  const detail =
    v.message ?? `expected=${v.expected} actual=${v.actual ?? v.token ?? "(missing)"}`;
  console.error(`  ${severity} ${id}: ${detail}${loc ? "\n" + loc : ""}`);
  const fix = v.fixHint ?? (v as { suggestedFix?: string }).suggestedFix;
  if (fix) console.error(`    → ${fix}`);
}
