#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════
// Consistency Audit — Numeric Claims (Component 1)
//
// Verifies that every numeric claim in docs/README/CHOICES matches
// the ground truth computed from the filesystem or source code.
//
// Exit 0: all active violations are warn-only or zero.
// Exit 1: at least one non-allowlisted BLOCKER violation.
//
// Usage: npx tsx scripts/consistency/audit-numeric.ts [--format=json|console|github]
// ═══════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { NUMERIC_CLAIMS } from "./manifest";
import { loadAllowlist, validateAllowlist, isAllowlisted } from "./lib/allowlist";
import { writeReport, printReport } from "./lib/report";
import type { NumericViolation, ReportSummary } from "./lib/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO = path.resolve(__dirname, "../..");
const REPORTS_DIR = path.join(REPO, "reports/consistency");

const format = (process.argv.find((a) => a.startsWith("--format="))?.split("=")[1] ?? "console") as
  | "json"
  | "console"
  | "github";

// ── Scan file for a numeric pattern ──────────────────────────────────────────

function scanFileForNumber(
  file: string,
  pattern: RegExp,
  groupIndex: number,
): { found: boolean; value: number | null; raw: string } {
  const fullPath = path.join(REPO, file);
  if (!fs.existsSync(fullPath)) return { found: false, value: null, raw: "" };

  const src = fs.readFileSync(fullPath, "utf8");
  const matches = [...src.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"))];

  if (matches.length === 0) return { found: false, value: null, raw: "" };

  const capture = matches[0][groupIndex];
  if (!capture) return { found: true, value: null, raw: matches[0][0] };

  // Strip locale formatting (commas)
  const num = parseInt(capture.replace(/,/g, ""), 10);
  return { found: true, value: isNaN(num) ? null : num, raw: matches[0][0] };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Validate allowlist first
  const allowlistEntries = loadAllowlist();
  const allowlistErrors = validateAllowlist(allowlistEntries);
  if (allowlistErrors.length > 0) {
    console.error("Allowlist validation failed:");
    for (const e of allowlistErrors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  const violations: (NumericViolation & { allowlisted: boolean })[] = [];
  let checked = 0;
  let passed = 0;
  let allowlisted = 0;

  for (const claim of NUMERIC_CLAIMS) {
    const expected = await claim.sot();
    const tolerance = claim.tolerance ?? 0;

    for (const appearance of claim.appearances) {
      checked++;
      const scan = scanFileForNumber(appearance.file, appearance.pattern, appearance.groupIndex);

      if (!scan.found) {
        // Pattern not found in file — only flag if file exists
        const fullPath = path.join(REPO, appearance.file);
        if (!fs.existsSync(fullPath)) {
          // File doesn't exist — skip without error
          passed++;
          continue;
        }

        const v: NumericViolation & { allowlisted: boolean } = {
          claimId: claim.id,
          type: "pattern_not_found",
          file: appearance.file,
          expected,
          actual: null,
          context: appearance.context,
          severity: claim.severity,
          suggestedFix: `Pattern not found in ${appearance.file}. Verify the claim still appears or remove the appearance from the manifest.`,
          allowlisted: isAllowlisted(claim.id, allowlistEntries),
        };
        violations.push(v);
        if (v.allowlisted) allowlisted++;
        continue;
      }

      if (scan.value === null) {
        const v: NumericViolation & { allowlisted: boolean } = {
          claimId: claim.id,
          type: "pattern_not_found",
          file: appearance.file,
          expected,
          actual: null,
          context: appearance.context,
          severity: "warn",
          suggestedFix: `Pattern matched but capture group ${appearance.groupIndex} returned no value.`,
          allowlisted: isAllowlisted(claim.id, allowlistEntries),
        };
        violations.push(v);
        if (v.allowlisted) allowlisted++;
        continue;
      }

      const actual = scan.value;

      // For minOnly claims (e.g. "275+ keys"): SOT value must be >= doc's claimed minimum.
      // expected = SOT (actual count), actual = number extracted from doc (the minimum claimed).
      const passes = appearance.minOnly
        ? expected >= actual
        : Math.abs(actual - expected) <= tolerance;

      if (passes) {
        passed++;
      } else {
        const v: NumericViolation & { allowlisted: boolean } = {
          claimId: claim.id,
          type: "value_mismatch",
          file: appearance.file,
          expected,
          actual,
          context: appearance.context,
          severity: claim.severity,
          suggestedFix: appearance.minOnly
            ? `Update ${appearance.file}: claimed "${actual}" but actual is ${expected}; since this is a minimum claim, actual must be ≥ ${expected}.`
            : `Update ${appearance.file} to "${expected}" (currently "${actual}") OR update the SOT in manifest.ts if the number has legitimately changed.`,
          allowlisted: isAllowlisted(claim.id, allowlistEntries),
        };
        violations.push(v);
        if (v.allowlisted) allowlisted++;
      }
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
    kind: "numeric" as const,
    ranAt: new Date().toISOString(),
    summary,
    violations,
  };

  writeReport(report, REPORTS_DIR);
  printReport(report, format);

  if (blockers.length > 0) {
    console.error(`\n✗ ${blockers.length} blocker(s) found. Fix drift or add to allowlist.json with expected_until date.`);
    process.exit(1);
  }

  console.log(`\n✓ Numeric audit passed (${active.filter((v) => v.severity === "warn").length} warnings, ${allowlisted} allowlisted).`);
}

main().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
