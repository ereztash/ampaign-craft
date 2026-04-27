#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════
// Consistency Audit — Schema Claims (Component 5a)
//
// Validates: RLS coverage, env var declarations, edge-function env var docs.
//
// Exit 0: no non-allowlisted BLOCKER violations.
// Exit 1: at least one non-allowlisted BLOCKER.
//
// Usage: npx tsx scripts/consistency/audit-schema.ts [--format=json|console|github]
// ═══════════════════════════════════════════════

import { fileURLToPath } from "url";
import * as path from "path";
import { SCHEMA_CLAIMS } from "./manifest";
import { loadAllowlist, validateAllowlist, isAllowlisted } from "./lib/allowlist";
import { writeReport, printReport } from "./lib/report";
import type { ReportSummary } from "./lib/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO = path.resolve(__dirname, "../..");
const REPORTS_DIR = path.join(REPO, "reports/consistency");

const format = (process.argv.find((a) => a.startsWith("--format="))?.split("=")[1] ?? "console") as
  | "json"
  | "console"
  | "github";

async function main(): Promise<void> {
  const allowlistEntries = loadAllowlist();
  const allowlistErrors = validateAllowlist(allowlistEntries);
  if (allowlistErrors.length > 0) {
    console.error("Allowlist validation failed:");
    for (const e of allowlistErrors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  type SchemaViolationTagged = {
    claimId: string;
    severity: string;
    allowlisted: boolean;
    file: string;
    line?: number;
    message: string;
    fixHint?: string;
  };

  const violations: SchemaViolationTagged[] = [];
  let checked = 0;
  let passed = 0;
  let allowlisted = 0;

  for (const claim of SCHEMA_CLAIMS) {
    checked++;
    const claimViolations = await claim.validate();

    if (claimViolations.length === 0) {
      passed++;
      continue;
    }

    const isAll = isAllowlisted(claim.id, allowlistEntries);
    for (const v of claimViolations) {
      const tagged: SchemaViolationTagged = {
        claimId: claim.id,
        severity: claim.severity,
        allowlisted: isAll,
        ...v,
      };
      violations.push(tagged);
      if (isAll) allowlisted++;
    }
  }

  const active = violations.filter((v) => !v.allowlisted);
  const blockers = active.filter((v) => v.severity === "blocker");

  const summary: ReportSummary = {
    checked,
    passed,
    violations: violations.length,
    allowlisted,
    blockers: blockers.length,
  };

  const report = {
    kind: "schema" as const,
    ranAt: new Date().toISOString(),
    summary,
    violations,
  };

  writeReport(report, REPORTS_DIR);
  printReport(report, format);

  if (blockers.length > 0) {
    console.error(`\n✗ ${blockers.length} blocker(s). Fix schema violations or add to allowlist.json.`);
    process.exit(1);
  }

  console.log(`\n✓ Schema audit passed (${active.filter((v) => v.severity === "warn").length} warnings, ${allowlisted} allowlisted).`);
}

main().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
