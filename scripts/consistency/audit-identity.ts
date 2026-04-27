#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════
// Consistency Audit — Identity Claims (Component 4)
//
// Verifies that named tokens (archetypes, tiers, routes, edge-function names)
// are used consistently across the codebase relative to their canonical source.
//
// Exit 0: no non-allowlisted BLOCKER violations.
// Exit 1: at least one non-allowlisted BLOCKER.
//
// Usage: npx tsx scripts/consistency/audit-identity.ts [--format=json|console|github]
// ═══════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { IDENTITY_CLAIMS } from "./manifest";
import { loadAllowlist, validateAllowlist, isAllowlisted } from "./lib/allowlist";
import { writeReport, printReport } from "./lib/report";
import { walk } from "./lib/walk";
import type { IdentityViolation, ReportSummary } from "./lib/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO = path.resolve(__dirname, "../..");
const REPORTS_DIR = path.join(REPO, "reports/consistency");

const format = (process.argv.find((a) => a.startsWith("--format="))?.split("=")[1] ?? "console") as
  | "json"
  | "console"
  | "github";

// ── Scan directory for token usages ──────────────────────────────────────────

interface TokenMatch {
  file: string;
  line: number;
  token: string;
  raw: string;
}

function scanDirForTokens(dir: string, pattern: RegExp, groupIndex: number): TokenMatch[] {
  if (!fs.existsSync(dir)) return [];

  const results: TokenMatch[] = [];
  const files = fs.statSync(dir).isDirectory()
    ? walk(dir, /\.(ts|tsx)$/).filter(
        (f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx") && !f.includes("__tests__"),
      )
    : [dir];

  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    const globalPattern = new RegExp(
      pattern.source,
      pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g",
    );

    const lines = src.split("\n");
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      // Reset lastIndex for global patterns
      globalPattern.lastIndex = 0;
      for (const m of line.matchAll(new RegExp(pattern.source, "gi"))) {
        const token = m[groupIndex];
        if (!token) continue;
        // Skip test files' fictional tokens by flagging source only
        results.push({
          file: path.relative(REPO, file),
          line: lineIdx + 1,
          token: token.toLowerCase().trim(),
          raw: m[0],
        });
      }
    }
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const allowlistEntries = loadAllowlist();
  const allowlistErrors = validateAllowlist(allowlistEntries);
  if (allowlistErrors.length > 0) {
    console.error("Allowlist validation failed:");
    for (const e of allowlistErrors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  const violations: (IdentityViolation & { allowlisted: boolean })[] = [];
  let checked = 0;
  let passed = 0;
  let allowlisted = 0;

  for (const claim of IDENTITY_CLAIMS) {
    const canonical = await claim.canonicalExtractor();
    const canonicalSet = new Set(canonical.map((s) => s.toLowerCase()));

    for (const scan of claim.consumerScans) {
      const matches = scanDirForTokens(scan.files, scan.pattern, scan.groupIndex);
      checked++;

      const foundTokens = new Set(matches.map((m) => m.token));
      const unknownTokens = [...foundTokens].filter((t) => !canonicalSet.has(t));
      const missingTokens = scan.requiresFullCoverage
        ? [...canonicalSet].filter((t) => !foundTokens.has(t))
        : [];

      if (unknownTokens.length === 0 && missingTokens.length === 0) {
        passed++;
        continue;
      }

      for (const token of unknownTokens) {
        const example = matches.find((m) => m.token === token);
        const v: IdentityViolation & { allowlisted: boolean } = {
          claimId: claim.id,
          type: "unknown_token",
          scanLabel: scan.label,
          file: example?.file ?? scan.files,
          line: example?.line,
          token,
          canonical,
          context: `Token "${token}" used in "${scan.label}" but not in canonical set from ${claim.canonicalFile}`,
          severity: claim.severity,
          allowlisted: isAllowlisted(claim.id, allowlistEntries),
        };
        violations.push(v);
        if (v.allowlisted) allowlisted++;
      }

      for (const token of missingTokens) {
        const v: IdentityViolation & { allowlisted: boolean } = {
          claimId: claim.id,
          type: "missing_token",
          scanLabel: scan.label,
          file: scan.files,
          token,
          canonical,
          context: `Token "${token}" from canonical set not found in "${scan.label}" (requiresFullCoverage=true)`,
          severity: "warn",
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
    kind: "identity" as const,
    ranAt: new Date().toISOString(),
    summary,
    violations,
  };

  writeReport(report, REPORTS_DIR);
  printReport(report, format);

  if (blockers.length > 0) {
    console.error(`\n✗ ${blockers.length} blocker(s). Fix unknown/mismatched tokens or add to allowlist.json.`);
    process.exit(1);
  }

  console.log(`\n✓ Identity audit passed (${active.filter((v) => v.severity === "warn").length} warnings, ${allowlisted} allowlisted).`);
}

main().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
