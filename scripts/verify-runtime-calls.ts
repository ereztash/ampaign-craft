#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════
// Runtime Reachability Verifier
//
// For every engine whose ENGINE_MANIFEST declares `isLive: true`,
// walks src/pages/ and src/components/ to verify that at least one
// CallExpression (or JSX usage) of a binding imported from the engine
// exists in a real view file.
//
// Classification per engine:
//   REACHABLE             — at least one real call/JSX site in pages/components.
//   IMPORTED_BUT_UNCALLED — imported somewhere under src/ but never actually called.
//   NO_IMPORT             — not imported anywhere under src/.
//
// Writes `reports/reachability-audit.json`.
//
// Exit code 1 if any live engine is IMPORTED_BUT_UNCALLED.
// Exit code 0 otherwise.
//
// Usage: npx tsx scripts/verify-runtime-calls.ts
// ═══════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { isBindingCalled } from "./score-market-gap";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(REPO_ROOT, "src");
const ENGINE_DIR = path.join(SRC_DIR, "engine");
const SERVICES_DIR = path.join(SRC_DIR, "services");
const PAGES_DIR = path.join(SRC_DIR, "pages");
const COMPONENTS_DIR = path.join(SRC_DIR, "components");
const REPORTS_DIR = path.join(REPO_ROOT, "reports");
const OUTPUT_PATH = path.join(REPORTS_DIR, "reachability-audit.json");

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function walk(dir: string, exts: RegExp, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, exts, acc);
    } else if (entry.isFile() && exts.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface LiveEngine {
  name: string;
  filePath: string;
}

function listLiveEngines(): LiveEngine[] {
  const candidates: string[] = [];
  if (fs.existsSync(ENGINE_DIR)) {
    for (const entry of fs.readdirSync(ENGINE_DIR, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
        candidates.push(path.join(ENGINE_DIR, entry.name));
      }
    }
  }
  if (fs.existsSync(SERVICES_DIR)) {
    for (const entry of fs.readdirSync(SERVICES_DIR, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
        candidates.push(path.join(SERVICES_DIR, entry.name));
      }
    }
  }

  const live: LiveEngine[] = [];
  const manifestRe = /export\s+const\s+ENGINE_MANIFEST\s*=\s*\{([\s\S]*?)\}\s*as\s*const/;
  for (const filePath of candidates) {
    const src = fs.readFileSync(filePath, "utf8");
    const match = src.match(manifestRe);
    if (!match) continue;
    if (!/isLive\s*:\s*true/.test(match[1])) continue;
    const name = path.basename(filePath).replace(/\.ts$/, "");
    live.push({ name, filePath });
  }
  return live.sort((a, b) => a.name.localeCompare(b.name));
}

function extractBindings(importStatement: string): string[] {
  const bindings = new Set<string>();

  const defaultMatch = importStatement.match(
    /import\s+(?:type\s+)?(\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+))?\s+from/,
  );
  if (defaultMatch) bindings.add(defaultMatch[1]);

  const nsMatch = importStatement.match(/import\s+(?:\w+\s*,\s*)?\*\s+as\s+(\w+)\s+from/);
  if (nsMatch) bindings.add(nsMatch[1]);

  const namedMatch = importStatement.match(/import\s+(?:type\s+)?(?:\w+\s*,\s*)?\{([^}]*)\}\s+from/);
  if (namedMatch) {
    for (const rawPart of namedMatch[1].split(",")) {
      const trimmed = rawPart.trim();
      if (!trimmed) continue;
      const clean = trimmed.replace(/^type\s+/, "");
      const asMatch = clean.match(/^(\w+)\s+as\s+(\w+)$/);
      if (asMatch) bindings.add(asMatch[2]);
      else {
        const name = clean.split(/\s+/)[0];
        if (name && /^\w+$/.test(name)) bindings.add(name);
      }
    }
  }

  return Array.from(bindings);
}

// ───────────────────────────────────────────────
// Classification
// ───────────────────────────────────────────────

type Classification = "REACHABLE" | "IMPORTED_BUT_UNCALLED" | "NO_IMPORT";

interface EngineReachability {
  engine: string;
  classification: Classification;
  callSites: string[];
  importers: string[];
}

function classifyEngine(engine: LiveEngine): EngineReachability {
  const esc = escapeRegExp(engine.name);
  const importRe = new RegExp(
    `import\\s+(?:\\*\\s+as\\s+\\w+|\\w+(?:\\s*,\\s*(?:\\{[^}]*?\\}|\\*\\s+as\\s+\\w+))?|\\{[^}]*?\\})\\s+from\\s+['"][^'"]*\\b${esc}(?:\\.ts|\\.tsx)?['"]`,
    "g",
  );
  const reexportRe = new RegExp(
    `export\\s+(?:\\*(?:\\s+as\\s+\\w+)?|\\{[^}]*?\\})\\s+from\\s+['"][^'"]*\\b${esc}(?:\\.ts|\\.tsx)?['"]`,
    "g",
  );

  const viewFiles = [
    ...walk(PAGES_DIR, /\.(ts|tsx)$/),
    ...walk(COMPONENTS_DIR, /\.(ts|tsx)$/),
  ];

  const callSites: string[] = [];
  const importers: string[] = [];

  for (const file of viewFiles) {
    if (/\.(test|spec)\.(ts|tsx)$/.test(file)) continue;
    const content = fs.readFileSync(file, "utf8");
    const imports = [...content.matchAll(importRe)];
    if (imports.length === 0) continue;

    const relFile = path.relative(REPO_ROOT, file);
    importers.push(relFile);

    const bindings = new Set<string>();
    for (const m of imports) for (const b of extractBindings(m[0])) bindings.add(b);
    if (bindings.size === 0) continue;

    const stripped = content.replace(importRe, "\n").replace(reexportRe, "\n");
    const used = Array.from(bindings).some((b) => isBindingCalled(b, stripped));
    if (used) callSites.push(relFile);
  }

  let classification: Classification;
  if (callSites.length > 0) classification = "REACHABLE";
  else if (importers.length > 0) classification = "IMPORTED_BUT_UNCALLED";
  else classification = "NO_IMPORT";

  return { engine: engine.name, classification, callSites, importers };
}

// ───────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────

function main(): void {
  const live = listLiveEngines();
  const results: EngineReachability[] = live.map(classifyEngine);

  const counts = {
    REACHABLE: results.filter((r) => r.classification === "REACHABLE").length,
    IMPORTED_BUT_UNCALLED: results.filter((r) => r.classification === "IMPORTED_BUT_UNCALLED").length,
    NO_IMPORT: results.filter((r) => r.classification === "NO_IMPORT").length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    totalLiveEngines: results.length,
    counts,
    engines: results,
  };

  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));

  console.log(`Reachability report written to ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
  console.log(`  total live engines      : ${results.length}`);
  console.log(`  REACHABLE               : ${counts.REACHABLE}`);
  console.log(`  IMPORTED_BUT_UNCALLED   : ${counts.IMPORTED_BUT_UNCALLED}`);
  console.log(`  NO_IMPORT               : ${counts.NO_IMPORT}`);

  if (counts.IMPORTED_BUT_UNCALLED > 0) {
    console.error("\n✗ Live engines imported but never called:");
    for (const r of results.filter((x) => x.classification === "IMPORTED_BUT_UNCALLED")) {
      console.error(`    ${r.engine}  (importers: ${r.importers.join(", ")})`);
    }
    process.exit(1);
  }
  if (counts.NO_IMPORT > 0) {
    console.error("\n✗ Live engines with no importer at all under src/pages or src/components:");
    for (const r of results.filter((x) => x.classification === "NO_IMPORT")) {
      console.error(`    ${r.engine}`);
    }
    process.exit(1);
  }
}

main();
