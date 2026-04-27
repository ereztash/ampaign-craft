#!/usr/bin/env tsx
// ═══════════════════════════════════════════════
// Behavioral Coverage Auditor — Test Threshold Locking
//
// For every claim with testability: 'static+test':
//   1. Find test files that import the implementation file.
//   2. For each threshold, check if at least one of those test files
//      contains one of the acceptedLiterals as a literal value.
//
// A threshold is "locked" if a test file that tests the implementation
// explicitly contains the threshold value — so changing the threshold
// in code without updating the test breaks the test.
//
// Exit 0  — always (this is informational; use continue-on-error in CI).
// Report is written to reports/consistency/behavioral-coverage.json.
// ═══════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";
import { BEHAVIORAL_CLAIMS } from "./behavioral-manifest.ts";
import { walk } from "./lib/walk.ts";

const ROOT = path.resolve(import.meta.dirname ?? __dirname, "../../");

interface ThresholdCoverageResult {
  thresholdName: string;
  value: number | string;
  covered: boolean;
  coveredBy?: string; // relative path of first test that locked it
}

interface ClaimCoverageResult {
  claimId: string;
  implementationFile: string;
  symbol: string;
  testFiles: string[];
  thresholds: ThresholdCoverageResult[];
  fullyCovered: boolean;
  partiallyCovered: boolean;
}

function findTestFiles(): string[] {
  const testFiles: string[] = [];
  const srcDir = path.join(ROOT, "src");
  const allTs = walk(srcDir, /\.(ts|tsx)$/);
  for (const f of allTs) {
    if (f.includes(".test.") || f.includes(".spec.")) {
      testFiles.push(f);
    }
  }
  return testFiles;
}

function findTestFilesForImpl(implRelPath: string, testFiles: string[]): string[] {
  // Match by basename (without extension) appearing anywhere in the test file content
  const baseName = path.basename(implRelPath, path.extname(implRelPath));
  const result: string[] = [];
  for (const testFile of testFiles) {
    try {
      const content = fs.readFileSync(testFile, "utf-8");
      if (content.includes(baseName)) {
        result.push(testFile);
      }
    } catch {
      // skip unreadable files
    }
  }
  return result;
}

function main(): void {
  const allTestFiles = findTestFiles();
  const results: ClaimCoverageResult[] = [];
  let totalClaims = 0;
  let fullyCovered = 0;
  let partiallyCovered = 0;
  let uncovered = 0;

  for (const claim of BEHAVIORAL_CLAIMS) {
    if (claim.testability === "static-only" || claim.testability === "test-only") {
      continue; // skip — no numeric literal coverage required
    }

    totalClaims++;
    const implPath = path.join(ROOT, claim.implementation.file);
    if (!fs.existsSync(implPath)) continue;

    const testFiles = findTestFilesForImpl(claim.implementation.file, allTestFiles);
    const thresholdResults: ThresholdCoverageResult[] = [];

    for (const threshold of claim.thresholds) {
      let covered = false;
      let coveredBy: string | undefined;

      for (const testFile of testFiles) {
        try {
          const content = fs.readFileSync(testFile, "utf-8");
          const matches = threshold.acceptedLiterals.some((pat) => pat.test(content));
          if (matches) {
            covered = true;
            coveredBy = path.relative(ROOT, testFile);
            break;
          }
        } catch {
          // skip
        }
      }

      thresholdResults.push({
        thresholdName: threshold.name,
        value: threshold.value,
        covered,
        coveredBy,
      });
    }

    const numCovered = thresholdResults.filter((t) => t.covered).length;
    const numTotal = thresholdResults.length;
    const isFullyCovered = numCovered === numTotal;
    const isPartiallyCovered = numCovered > 0 && numCovered < numTotal;

    if (isFullyCovered) fullyCovered++;
    else if (isPartiallyCovered) partiallyCovered++;
    else uncovered++;

    results.push({
      claimId: claim.id,
      implementationFile: claim.implementation.file,
      symbol: claim.implementation.symbol,
      testFiles: testFiles.map((f) => path.relative(ROOT, f)),
      thresholds: thresholdResults,
      fullyCovered: isFullyCovered,
      partiallyCovered: isPartiallyCovered,
    });
  }

  // ── Console report ─────────────────────────────────────────────────────
  console.log("\nBEHAVIORAL COVERAGE REPORT");
  console.log(`  ✓ claims checked  : ${totalClaims}`);
  console.log(`  ✓ fully covered   : ${fullyCovered}`);
  console.log(`  ⚠ partially       : ${partiallyCovered}`);
  console.log(`  ✗ uncovered       : ${uncovered}`);

  const uncoveredClaims = results.filter((r) => !r.fullyCovered);
  if (uncoveredClaims.length > 0) {
    console.log("\nThresholds missing explicit test literals:");
    for (const result of uncoveredClaims) {
      for (const t of result.thresholds.filter((th) => !th.covered)) {
        console.log(
          `  [warn] ${result.claimId}.${t.thresholdName} (${t.value}): ` +
          `no test in ${result.testFiles.join(", ") || "(no test files found)"} ` +
          `contains one of the acceptedLiterals`,
        );
      }
    }
  }

  // ── JSON report ────────────────────────────────────────────────────────
  const reportDir = path.join(ROOT, "reports/consistency");
  fs.mkdirSync(reportDir, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    summary: { totalClaims, fullyCovered, partiallyCovered, uncovered },
    results,
  };
  fs.writeFileSync(
    path.join(reportDir, "behavioral-coverage.json"),
    JSON.stringify(report, null, 2),
  );

  if (uncovered > 0 || partiallyCovered > 0) {
    console.log(
      `\n⚠ Coverage audit: ${uncovered} uncovered, ${partiallyCovered} partial. ` +
      `Add threshold-locking tests to eliminate these warnings.\n`,
    );
  } else {
    console.log("\n✓ All behavioral thresholds are locked by tests.\n");
  }

  // Always exit 0 — this is informational until coverage reaches 100%
  process.exit(0);
}

main();
