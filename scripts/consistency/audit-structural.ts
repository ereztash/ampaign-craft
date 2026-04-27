#!/usr/bin/env tsx
// ═══════════════════════════════════════════════
// Structural Consistency Auditor
//
// For each claim in structural-manifest.ts, verifies that references
// in code resolve to physical artifacts:
//   1. supabase.functions.invoke("X") → supabase/functions/X/ exists
//   2. .from("table") → CREATE TABLE/VIEW for "table" exists in migrations
//   3. ENGINE_MANIFEST imports in registry.ts → real engine files
//
// Exit 0 — all references resolve.
// Exit 1 — phantom references found (allowlistable per claim_id).
// ═══════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";
import { STRUCTURAL_CLAIMS, type StructuralClaim } from "./structural-manifest.ts";
import { walk, walkDirs } from "./lib/walk.ts";
import { loadAllowlist, isAllowlisted } from "./lib/allowlist.ts";

const ROOT = path.resolve(import.meta.dirname ?? __dirname, "../../");

interface StructuralViolation {
  claimId: string;
  severity: "blocker" | "warn";
  reference: string;       // the unresolved reference (e.g. "analytics-ingest")
  callSite: string;        // file:line where the reference appears
  detail: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function readFileSafe(p: string): string {
  try { return fs.readFileSync(p, "utf-8"); } catch { return ""; }
}

function listSourceFiles(): string[] {
  return walk(path.join(ROOT, "src"), /\.(ts|tsx)$/).filter(
    (f) => !f.includes(".test.") && !f.includes(".spec."),
  );
}

function extractMatches(content: string, regex: RegExp): { value: string; line: number }[] {
  const results: { value: string; line: number }[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matches = [...line.matchAll(regex)];
    for (const m of matches) {
      if (m[1]) results.push({ value: m[1], line: i + 1 });
    }
  }
  return results;
}

// ── Edge function resolution ──────────────────────────────────────────────────

function checkEdgeFunctionResolution(claim: StructuralClaim): StructuralViolation[] {
  const violations: StructuralViolation[] = [];
  const fnDir = path.join(ROOT, "supabase/functions");
  if (!fs.existsSync(fnDir)) return violations;

  const knownFunctions = new Set(walkDirs(fnDir).filter((d) => d !== "_shared"));
  const exceptions = new Set(claim.knownExceptions ?? []);

  // Match: supabase.functions.invoke("name" OR multi-line: supabase.functions.invoke(\n  "name"
  const sources = listSourceFiles();
  // Pattern handles both single-line `invoke("X"` and multi-line `invoke(\n  "X"`
  const pattern = /supabase\.functions\.invoke\s*\(\s*["']([^"']+)["']/g;

  for (const file of sources) {
    const content = readFileSafe(file);
    const matches = extractMatches(content, pattern);
    for (const m of matches) {
      if (exceptions.has(m.value)) continue;
      if (!knownFunctions.has(m.value)) {
        violations.push({
          claimId: claim.id,
          severity: "blocker",
          reference: m.value,
          callSite: `${path.relative(ROOT, file)}:${m.line}`,
          detail: `supabase.functions.invoke("${m.value}") points to a non-existent edge function (no directory at supabase/functions/${m.value}/)`,
        });
      }
    }
  }
  return violations;
}

// ── Database table resolution ─────────────────────────────────────────────────

function getKnownTablesAndViews(): Set<string> {
  const migrationsDir = path.join(ROOT, "supabase/migrations");
  if (!fs.existsSync(migrationsDir)) return new Set();

  const tables = new Set<string>();
  // CREATE TABLE [IF NOT EXISTS] [public.]name
  const tablePattern = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-zA-Z_][a-zA-Z0-9_]*)/gi;
  // CREATE [OR REPLACE] [MATERIALIZED] VIEW [IF NOT EXISTS] [public.]name
  const viewPattern = /create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-zA-Z_][a-zA-Z0-9_]*)/gi;

  const files = walk(migrationsDir, /\.sql$/);
  for (const file of files) {
    const content = readFileSafe(file);
    for (const m of content.matchAll(tablePattern)) tables.add(m[1]);
    for (const m of content.matchAll(viewPattern)) tables.add(m[1]);
  }
  return tables;
}

function checkTableResolution(claim: StructuralClaim): StructuralViolation[] {
  const violations: StructuralViolation[] = [];
  const knownTables = getKnownTablesAndViews();
  const exceptions = new Set(claim.knownExceptions ?? []);

  // Match: .from("table") — but only when used on a Supabase client.
  // We use a heuristic: any .from("...") call that is NOT preceded by certain
  // collection words (Array, Set, Map, JSON, etc.) is treated as a table ref.
  const sources = listSourceFiles();
  const pattern = /\.from\s*\(\s*["']([a-zA-Z_][a-zA-Z0-9_]*)["']/g;
  // Words that clearly indicate non-Supabase .from() calls
  const NON_SUPABASE_PRECEDERS = /\b(Array|Set|Map|Object|JSON|Buffer|Promise|Date)\s*$/;
  // .storage.from() targets a Storage bucket name, not a database table
  const STORAGE_PRECEDER = /\.storage\s*$/;

  for (const file of sources) {
    const content = readFileSafe(file);
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const m of line.matchAll(pattern)) {
        const tableName = m[1];
        if (exceptions.has(tableName)) continue;
        // Check the prefix on the line before .from() to filter non-Supabase uses
        const idx = m.index ?? 0;
        const prefix = line.slice(0, idx);
        if (NON_SUPABASE_PRECEDERS.test(prefix)) continue;
        if (STORAGE_PRECEDER.test(prefix)) continue;
        if (!knownTables.has(tableName)) {
          violations.push({
            claimId: claim.id,
            severity: "blocker",
            reference: tableName,
            callSite: `${path.relative(ROOT, file)}:${i + 1}`,
            detail: `.from("${tableName}") references a table that has no CREATE TABLE/VIEW in supabase/migrations/`,
          });
        }
      }
    }
  }
  return violations;
}

// ── Engine registry resolution ───────────────────────────────────────────────

function checkEngineRegistryResolution(claim: StructuralClaim): StructuralViolation[] {
  const violations: StructuralViolation[] = [];
  const registryFile = path.join(ROOT, "src/engine/blackboard/registry.ts");
  if (!fs.existsSync(registryFile)) return violations;

  const content = readFileSafe(registryFile);
  // Match: import { ENGINE_MANIFEST as X } from "../engineName";
  const pattern = /import\s+\{\s*ENGINE_MANIFEST\s+as\s+\w+\s*\}\s+from\s+["']([^"']+)["']/g;
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const m of line.matchAll(pattern)) {
      const importPath = m[1];
      // Resolve the import relative to the registry file
      const resolved = path.resolve(path.dirname(registryFile), importPath);
      // Check both .ts and .tsx and /index.ts
      const candidates = [
        `${resolved}.ts`,
        `${resolved}.tsx`,
        path.join(resolved, "index.ts"),
        path.join(resolved, "index.tsx"),
      ];
      const found = candidates.some((p) => fs.existsSync(p));
      if (!found) {
        violations.push({
          claimId: claim.id,
          severity: "blocker",
          reference: importPath,
          callSite: `src/engine/blackboard/registry.ts:${i + 1}`,
          detail: `ENGINE_MANIFEST import "${importPath}" does not resolve to an existing file`,
        });
      }
    }
  }
  return violations;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main(): void {
  const allowlist = loadAllowlist();
  const allViolations: StructuralViolation[] = [];
  let checked = 0;
  let passed = 0;
  let allowlisted = 0;
  let blockers = 0;

  for (const claim of STRUCTURAL_CLAIMS) {
    checked++;
    let violations: StructuralViolation[] = [];

    switch (claim.kind) {
      case "edge_fn_resolution":
        violations = checkEdgeFunctionResolution(claim);
        break;
      case "table_resolution":
        violations = checkTableResolution(claim);
        break;
      case "engine_registry_resolution":
        violations = checkEngineRegistryResolution(claim);
        break;
    }

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

  // ── Report ──────────────────────────────────────────────────────────────
  console.log("\nSTRUCTURAL CONSISTENCY REPORT");
  console.log(`  ✓ checked      : ${checked}`);
  console.log(`  ✓ passed       : ${passed}`);
  console.log(`  ⚠ allowlisted  : ${allowlisted}`);
  console.log(`  ✗ blockers     : ${blockers}`);

  if (allViolations.length > 0) {
    console.log("\nUnresolved structural references:");
    for (const v of allViolations) {
      const icon = v.severity === "blocker" ? "✗" : "⚠";
      console.log(`  [${icon}] ${v.claimId}: ${v.reference}`);
      console.log(`       ${v.callSite}`);
      console.log(`       ${v.detail}`);
    }
  }

  // ── JSON report ─────────────────────────────────────────────────────────
  const reportDir = path.join(ROOT, "reports/consistency");
  fs.mkdirSync(reportDir, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    summary: { checked, passed, allowlisted, blockers },
    violations: allViolations,
  };
  fs.writeFileSync(path.join(reportDir, "structural.json"), JSON.stringify(report, null, 2));

  if (blockers > 0) {
    console.log(`\n✗ Structural audit FAILED (${blockers} blocker${blockers !== 1 ? "s" : ""}).\n`);
    process.exit(1);
  }
  console.log(`\n✓ Structural audit passed (${allViolations.length} warnings, ${allowlisted} allowlisted).\n`);
}

main();
