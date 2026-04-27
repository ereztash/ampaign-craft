#!/usr/bin/env tsx
// ═══════════════════════════════════════════════
// Provenance Consistency Auditor
//
// Verifies that every behavioral claim's source.quote substring
// still appears in source.file. Closes the gap where documentation
// is silently edited or deleted while the manifest keeps a stale
// reference — at which point downstream audits become misleading
// (they'd verify thresholds for claims the README no longer makes).
//
// Why this matters:
//   - audit-behavioral checks impl matches threshold value
//   - audit-provenance checks the threshold is STILL CLAIMED in docs
//   Both need to pass for the claim to be live.
//
// Whitespace is normalized (collapsed runs of spaces/tabs/newlines)
// before comparison, so line-wrapping changes don't trigger false
// positives. Punctuation is matched literally.
//
// Exit 0 — all behavioral source quotes resolve.
// Exit 1 — one or more claim quotes no longer appear in their docs.
// ═══════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";
import { BEHAVIORAL_CLAIMS, type BehavioralClaim } from "./behavioral-manifest.ts";
import { loadAllowlist, isAllowlisted } from "./lib/allowlist.ts";

const ROOT = path.resolve(import.meta.dirname ?? __dirname, "../../");

interface ProvenanceViolation {
  claimId: string;
  severity: "blocker" | "warn";
  kind: "missing_source_file" | "missing_source_quote";
  detail: string;
}

/** Collapse runs of whitespace into a single space for resilient matching. */
function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function checkClaim(claim: BehavioralClaim): ProvenanceViolation[] {
  const violations: ProvenanceViolation[] = [];
  const sourcePath = path.join(ROOT, claim.source.file);

  if (!fs.existsSync(sourcePath)) {
    violations.push({
      claimId: claim.id,
      severity: "blocker",
      kind: "missing_source_file",
      detail: `source.file does not exist: ${claim.source.file}`,
    });
    return violations;
  }

  const fileContent = fs.readFileSync(sourcePath, "utf-8");
  const haystack = normalize(fileContent);
  const needle = normalize(claim.source.quote);

  if (!haystack.includes(needle)) {
    violations.push({
      claimId: claim.id,
      severity: "blocker",
      kind: "missing_source_quote",
      detail:
        `Quote no longer appears in ${claim.source.file}: "${claim.source.quote}". ` +
        `Either restore the documentation OR update the manifest source.quote to match the new wording.`,
    });
  }

  return violations;
}

function main(): void {
  const allowlist = loadAllowlist();
  const allViolations: ProvenanceViolation[] = [];
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

    if (isAllowlisted(claim.id, allowlist)) {
      allowlisted++;
      continue;
    }

    for (const v of violations) {
      allViolations.push(v);
      if (v.severity === "blocker") blockers++;
    }
  }

  console.log("\nPROVENANCE CONSISTENCY REPORT");
  console.log(`  ✓ checked      : ${checked}`);
  console.log(`  ✓ passed       : ${passed}`);
  console.log(`  ⚠ allowlisted  : ${allowlisted}`);
  console.log(`  ✗ blockers     : ${blockers}`);

  if (allViolations.length > 0) {
    console.log("\nMissing source provenance:");
    for (const v of allViolations) {
      const icon = v.severity === "blocker" ? "✗" : "⚠";
      console.log(`  [${icon}] ${v.claimId} (${v.kind}):`);
      console.log(`       ${v.detail}`);
    }
  }

  const reportDir = path.join(ROOT, "reports/consistency");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "provenance.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary: { checked, passed, allowlisted, blockers },
        violations: allViolations,
      },
      null,
      2,
    ),
  );

  if (blockers > 0) {
    console.log(`\n✗ Provenance audit FAILED (${blockers} blocker${blockers !== 1 ? "s" : ""}).\n`);
    process.exit(1);
  }
  console.log(`\n✓ Provenance audit passed (${allViolations.length} warnings, ${allowlisted} allowlisted).\n`);
}

main();
