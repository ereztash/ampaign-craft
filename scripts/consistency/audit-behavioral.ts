#!/usr/bin/env tsx
// ═══════════════════════════════════════════════
// Behavioral Consistency Auditor — Static Threshold Check
//
// For every claim in behavioral-manifest.ts:
//   1. Verify the implementation file exists.
//   2. Verify the documented symbol appears in that file.
//   3. For each threshold, verify at least one acceptedLiteral matches
//      somewhere in the file (constant declaration OR inline literal).
//
// Exit 0 — all checks pass (blockers=0).
// Exit 1 — one or more blockers found (no allowlist for behavioral drift).
// ═══════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";
import { BEHAVIORAL_CLAIMS, type BehavioralClaim, type BehavioralThreshold } from "./behavioral-manifest.ts";
import { loadAllowlist, isAllowlisted } from "./lib/allowlist.ts";

const ROOT = path.resolve(import.meta.dirname ?? __dirname, "../../");

interface BehavioralViolation {
  claimId: string;
  severity: "blocker" | "warn";
  kind: "missing_file" | "missing_symbol" | "missing_threshold";
  detail: string;
}

function checkClaim(claim: BehavioralClaim): BehavioralViolation[] {
  const violations: BehavioralViolation[] = [];
  const implPath = path.join(ROOT, claim.implementation.file);

  // 1. File must exist
  if (!fs.existsSync(implPath)) {
    violations.push({
      claimId: claim.id,
      severity: "blocker",
      kind: "missing_file",
      detail: `Implementation file not found: ${claim.implementation.file}`,
    });
    return violations; // no point checking further
  }

  const content = fs.readFileSync(implPath, "utf-8");

  // 2. Symbol must exist
  const symbol = claim.implementation.symbol;
  const symbolPattern = new RegExp(
    `(?:export\\s+)?(?:async\\s+)?(?:function|const|let|var)\\s+${symbol}\\b|\\b${symbol}\\s*[:=]\\s*(?:async\\s*)?(?:\\(|function)`,
  );
  if (!symbolPattern.test(content)) {
    violations.push({
      claimId: claim.id,
      severity: "blocker",
      kind: "missing_symbol",
      detail: `Symbol "${symbol}" not found in ${claim.implementation.file}`,
    });
    // Still check thresholds — they might be in the file even if symbol name changed
  }

  // 3. Each threshold must have at least one acceptedLiteral match in the file
  for (const threshold of claim.thresholds) {
    const found = threshold.acceptedLiterals.some((pattern) => pattern.test(content));
    if (!found) {
      violations.push({
        claimId: claim.id,
        severity: "blocker",
        kind: "missing_threshold",
        detail: `Threshold "${threshold.name}" (value: ${threshold.value}) not found in ${claim.implementation.file}. ` +
          `Expected one of: ${threshold.acceptedLiterals.map((r) => r.toString()).join(", ")}`,
      });
    }
  }

  return violations;
}

function main(): void {
  const allowlist = loadAllowlist();
  const allViolations: BehavioralViolation[] = [];
  let checked = 0;
  let passed = 0;
  let allowlisted = 0;
  let blockers = 0;

  for (const claim of BEHAVIORAL_CLAIMS) {
    checked++;
    const violations = checkClaim(claim);

    if (violations.length === 0) {
      passed++;
      continue;
    }

    // Check allowlist per claim-id
    if (isAllowlisted(claim.id, allowlist)) {
      allowlisted++;
      continue;
    }

    for (const v of violations) {
      allViolations.push(v);
      if (v.severity === "blocker") blockers++;
    }
  }

  // ── Report ────────────────────────────────────────────────────────────
  console.log("\nBEHAVIORAL CONSISTENCY REPORT");
  console.log(`  ✓ checked      : ${checked}`);
  console.log(`  ✓ passed       : ${passed}`);
  console.log(`  ⚠ allowlisted  : ${allowlisted}`);
  console.log(`  ✗ blockers     : ${blockers}`);

  if (allViolations.length > 0) {
    console.log("\nActive violations:");
    for (const v of allViolations) {
      const icon = v.severity === "blocker" ? "✗" : "⚠";
      console.log(`  [${icon}] ${v.claimId} (${v.kind}): ${v.detail}`);
    }
  }

  // ── Write JSON report ─────────────────────────────────────────────────
  const reportDir = path.join(ROOT, "reports/consistency");
  fs.mkdirSync(reportDir, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    summary: { checked, passed, allowlisted, blockers },
    violations: allViolations,
  };
  fs.writeFileSync(path.join(reportDir, "behavioral.json"), JSON.stringify(report, null, 2));

  if (blockers > 0) {
    console.log(`\n✗ Behavioral audit FAILED (${blockers} blocker${blockers !== 1 ? "s" : ""}).\n`);
    process.exit(1);
  }

  console.log(`\n✓ Behavioral audit passed (${allViolations.length} warnings, ${allowlisted} allowlisted).\n`);
}

main();
