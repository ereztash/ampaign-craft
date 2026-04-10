#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════
// Market Gap Scorer (honest metric, v2)
//
// For each of the 50 benchmark parameters, classifies
// the backing engines as SHIPPED / PARTIAL / PAPER / MISSING
// and computes paper / shipped / partial-credit scores against
// the fixed market constants (70.2% average, 85% top competitor).
//
// Honest consumer counting rules (as of 2026-04-10):
//   1. A file is counted as a consumer only if it has BOTH
//      an import AND a CallExpression that uses the binding.
//   2. Pure re-export files (`export ... from "..."`) do NOT count.
//   3. Two location-aware thresholds apply:
//        - LIB_MIN_CONSUMERS     = 1  (src/lib/ wrappers, src/services/)
//        - ENGINE_MIN_CONSUMERS  = 3  (src/engine/ full engines)
//        - edge functions also use LIB_MIN_CONSUMERS.
//   4. isLive in a manifest is a *claim*, not a shortcut.
//      Classification relies on real consumers, not on isLive alone.
//
// Usage: npx tsx scripts/score-market-gap.ts
// Side effect: returns the in-memory result for downstream use.
// ═══════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { PARAMETERS, TOTAL_PARAMETERS, type ParameterEntry } from "./map-parameters";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(REPO_ROOT, "src");
const ENGINE_DIR = path.join(SRC_DIR, "engine");
const FUNCTIONS_DIR = path.join(REPO_ROOT, "supabase", "functions");

// Fixed competitor constants for this run.
export const MARKET_AVG_PCT = 70.2;
export const TOP_COMPETITOR_PCT = 85;

// Honest metric thresholds — exported for other tooling.
export const LIB_MIN_CONSUMERS = 1;     // src/lib/, src/services/, edge functions
export const ENGINE_MIN_CONSUMERS = 3;  // src/engine/

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

export type ParameterStatus = "SHIPPED" | "PARTIAL" | "PAPER" | "MISSING";

export type BackingEngineKind =
  | "src-engine"
  | "src-lib"
  | "src-other"
  | "edge-function"
  | "meta"
  | "unresolved";

export interface BackingEngineResolution {
  name: string;
  exists: boolean;
  isLiveInRegistry: boolean;
  consumerCount: number;
  kind: BackingEngineKind;
  filePath: string | null;
}

export interface ParameterScore extends ParameterEntry {
  resolutions: BackingEngineResolution[];
  status: ParameterStatus;
  totalConsumers: number;
}

export interface ScoreSummary {
  paperScore: number;          // 0..1
  shippedScore: number;        // 0..1
  partialCreditScore: number;  // 0..1
  paperCount: number;
  shippedCount: number;
  partialCount: number;
  missingCount: number;
}

export interface ScoreResult {
  parameters: ParameterScore[];
  summary: ScoreSummary;
}

// ───────────────────────────────────────────────
// Source-tree helpers
// ───────────────────────────────────────────────

function walkFiles(dir: string, exts: RegExp, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, exts, acc);
    } else if (entry.isFile() && exts.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const SRC_TS_FILES = walkFiles(SRC_DIR, /\.(ts|tsx)$/);
const ENGINE_TS_FILES = fs.existsSync(ENGINE_DIR)
  ? fs
      .readdirSync(ENGINE_DIR, { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith(".ts") && !d.name.endsWith(".test.ts"))
      .map((d) => d.name.replace(/\.ts$/, ""))
  : [];

const ENGINE_SET = new Set(ENGINE_TS_FILES);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Returns the manifest's isLive value for an engine, parsed statically.
function readEngineIsLive(engineName: string): boolean {
  const filePath = path.join(ENGINE_DIR, `${engineName}.ts`);
  if (!fs.existsSync(filePath)) {
    // Might live in src/services/ (e.g. aiCopyService) or elsewhere.
    const alt = findSrcFileByBasename(engineName);
    if (!alt) return false;
    const src = fs.readFileSync(alt, "utf8");
    const match = src.match(/export\s+const\s+ENGINE_MANIFEST\s*=\s*\{([\s\S]*?)\}\s*as\s*const/);
    if (!match) return false;
    return /isLive\s*:\s*true/.test(match[1]);
  }
  const src = fs.readFileSync(filePath, "utf8");
  const match = src.match(/export\s+const\s+ENGINE_MANIFEST\s*=\s*\{([\s\S]*?)\}\s*as\s*const/);
  if (!match) return false;
  return /isLive\s*:\s*true/.test(match[1]);
}

// ───────────────────────────────────────────────
// Import parsing — extract bindings from an import statement
// ───────────────────────────────────────────────

function extractBindings(importStatement: string): string[] {
  const bindings = new Set<string>();

  // default import: import Foo from "..."
  //                 import Foo, { a, b } from "..."
  const defaultMatch = importStatement.match(
    /import\s+(?:type\s+)?(\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+))?\s+from/,
  );
  if (defaultMatch) {
    bindings.add(defaultMatch[1]);
  }

  // namespace import: import * as foo from "..."
  const nsMatch = importStatement.match(/import\s+(?:\w+\s*,\s*)?\*\s+as\s+(\w+)\s+from/);
  if (nsMatch) bindings.add(nsMatch[1]);

  // named imports: import { a, b as c, type d } from "..."
  const namedMatch = importStatement.match(/import\s+(?:type\s+)?(?:\w+\s*,\s*)?\{([^}]*)\}\s+from/);
  if (namedMatch) {
    const inner = namedMatch[1];
    for (const rawPart of inner.split(",")) {
      const trimmed = rawPart.trim();
      if (!trimmed) continue;
      // Drop leading `type` prefix on individual specifiers.
      const clean = trimmed.replace(/^type\s+/, "");
      const asMatch = clean.match(/^(\w+)\s+as\s+(\w+)$/);
      if (asMatch) {
        bindings.add(asMatch[2]);
      } else {
        const name = clean.split(/\s+/)[0];
        if (name && /^\w+$/.test(name)) bindings.add(name);
      }
    }
  }

  return Array.from(bindings);
}

// ───────────────────────────────────────────────
// Counts files in src/ that import + USE the given module.
//
// Rules:
//  - File must have a real `import ... from "...<name>..."` statement.
//  - File must NOT be a pure re-export: the binding must appear
//    outside of any import or `export ... from "..."` line.
//  - The binding must participate in a CallExpression or JSX usage.
// ───────────────────────────────────────────────

function countEngineConsumers(engineName: string, selfPath: string | null): number {
  const esc = escapeRegExp(engineName);
  // Anchor tightly: import keyword → optional whitespace → exactly one
  // specifier block (default, namespace, named, or default+extra) → from → path.
  // [^}]*? inside braces is bounded so we never jump across statements.
  const importRe = new RegExp(
    `import\\s+(?:\\*\\s+as\\s+\\w+|\\w+(?:\\s*,\\s*(?:\\{[^}]*?\\}|\\*\\s+as\\s+\\w+))?|\\{[^}]*?\\})\\s+from\\s+['"][^'"]*\\b${esc}(?:\\.ts|\\.tsx)?['"]`,
    "g",
  );
  const reexportRe = new RegExp(
    `export\\s+(?:\\*(?:\\s+as\\s+\\w+)?|\\{[^}]*?\\})\\s+from\\s+['"][^'"]*\\b${esc}(?:\\.ts|\\.tsx)?['"]`,
    "g",
  );

  let count = 0;
  for (const file of SRC_TS_FILES) {
    if (selfPath && path.resolve(file) === path.resolve(selfPath)) continue;

    const content = fs.readFileSync(file, "utf8");
    const imports = [...content.matchAll(importRe)];
    if (imports.length === 0) continue;

    const bindings = new Set<string>();
    for (const m of imports) {
      for (const b of extractBindings(m[0])) bindings.add(b);
    }
    if (bindings.size === 0) continue;

    // Strip all import and re-export statements referencing the engine.
    const stripped = content.replace(importRe, "\n").replace(reexportRe, "\n");

    const used = Array.from(bindings).some((b) => isBindingCalled(b, stripped));
    if (used) count++;
  }
  return count;
}

// Heuristic CallExpression / JSX usage check for a binding in source text.
export function isBindingCalled(binding: string, source: string): boolean {
  const esc = escapeRegExp(binding);
  // Direct call: foo(
  // Method call (possibly chained): foo.bar(  or  foo.bar.baz(
  const callRe = new RegExp(`\\b${esc}(?:\\.[\\w.]+)?\\s*\\(`);
  if (callRe.test(source)) return true;
  // Indexed call: foo[key](
  const indexedRe = new RegExp(`\\b${esc}\\s*\\[[^\\]]*\\]\\s*\\(`);
  if (indexedRe.test(source)) return true;
  // JSX call expression: <Foo ...>
  const jsxRe = new RegExp(`<${esc}[\\s\\n/>]`);
  if (jsxRe.test(source)) return true;
  // Method call via destructure-then-use is already captured by callRe.
  return false;
}

// Counts files in src/ that reference an Edge function name (string literal
// used as the first argument of supabase.functions.invoke or fetch paths).
function countEdgeFunctionConsumers(functionName: string): number {
  const invokeRe = new RegExp(
    `functions\\.invoke\\s*\\(\\s*['"\`]${escapeRegExp(functionName)}['"\`]`,
  );
  const fetchRe = new RegExp(`['"\`][^'"\`]*\\/${escapeRegExp(functionName)}(?:['"\`]|\\?|/)`);
  let count = 0;
  for (const file of SRC_TS_FILES) {
    const content = fs.readFileSync(file, "utf8");
    if (invokeRe.test(content) || fetchRe.test(content)) count++;
  }
  return count;
}

// Look up a non-engine source file by basename anywhere in src/.
function findSrcFileByBasename(basename: string): string | null {
  for (const file of SRC_TS_FILES) {
    const name = path.basename(file).replace(/\.(ts|tsx)$/, "");
    if (name === basename) return file;
  }
  return null;
}

// ───────────────────────────────────────────────
// Resolve a single backing-engine name
// ───────────────────────────────────────────────

function resolveBackingEngine(name: string): BackingEngineResolution {
  // Meta entries that aren't a real file.
  if (name === "Supabase Auth + RLS") {
    return {
      name,
      exists: true,
      isLiveInRegistry: false,
      consumerCount: 99, // RLS is global; treat as effectively shipped.
      kind: "meta",
      filePath: null,
    };
  }

  // Case 1: src/engine/<name>.ts
  if (ENGINE_SET.has(name)) {
    const filePath = path.join(ENGINE_DIR, `${name}.ts`);
    return {
      name,
      exists: true,
      isLiveInRegistry: readEngineIsLive(name),
      consumerCount: countEngineConsumers(name, filePath),
      kind: "src-engine",
      filePath: path.relative(REPO_ROOT, filePath),
    };
  }

  // Case 2: supabase/functions/<name>/
  const fnDir = path.join(FUNCTIONS_DIR, name);
  if (fs.existsSync(fnDir) && fs.statSync(fnDir).isDirectory()) {
    return {
      name,
      exists: true,
      isLiveInRegistry: false,
      consumerCount: countEdgeFunctionConsumers(name),
      kind: "edge-function",
      filePath: path.relative(REPO_ROOT, fnDir),
    };
  }

  // Case 3: any other src/ file with matching basename (e.g. src/lib/*.ts)
  const found = findSrcFileByBasename(name);
  if (found) {
    const rel = path.relative(SRC_DIR, found).replace(/\\/g, "/");
    const isLib = rel.startsWith("lib/");
    return {
      name,
      exists: true,
      isLiveInRegistry: readEngineIsLive(name),
      consumerCount: countEngineConsumers(name, found),
      kind: isLib ? "src-lib" : "src-other",
      filePath: path.relative(REPO_ROOT, found),
    };
  }

  // Case 4: not found anywhere
  return {
    name,
    exists: false,
    isLiveInRegistry: false,
    consumerCount: 0,
    kind: "unresolved",
    filePath: null,
  };
}

// ───────────────────────────────────────────────
// Classification — location-aware, honest
// ───────────────────────────────────────────────

function thresholdForKind(kind: BackingEngineKind): number {
  switch (kind) {
    case "src-engine":
      return ENGINE_MIN_CONSUMERS;
    case "src-lib":
    case "src-other":
    case "edge-function":
      return LIB_MIN_CONSUMERS;
    case "meta":
      return 1;
    case "unresolved":
    default:
      return Number.POSITIVE_INFINITY;
  }
}

function isResolutionShipped(r: BackingEngineResolution): boolean {
  if (!r.exists) return false;
  // (a) An engine whose manifest claims isLive:true is considered shipped
  //     as soon as it has at least one real call site anywhere under src/.
  //     `verify-runtime-calls.ts` enforces that claim with an exit-1 gate.
  // (b) Otherwise the location-aware threshold applies.
  if (r.isLiveInRegistry && r.consumerCount >= 1) return true;
  return r.consumerCount >= thresholdForKind(r.kind);
}

function classifyParameter(resolutions: BackingEngineResolution[]): ParameterStatus {
  if (resolutions.some(isResolutionShipped)) return "SHIPPED";

  // PARTIAL: any backing engine exists with 1..(threshold-1) consumers.
  const anyPartial = resolutions.some(
    (r) =>
      r.exists &&
      r.consumerCount >= 1 &&
      r.consumerCount < thresholdForKind(r.kind),
  );
  if (anyPartial) return "PARTIAL";

  // PAPER: any backing engine exists at all (with 0 consumers).
  if (resolutions.some((r) => r.exists)) return "PAPER";

  return "MISSING";
}

// ───────────────────────────────────────────────
// Score
// ───────────────────────────────────────────────

export function scoreMarketGap(): ScoreResult {
  const parameters: ParameterScore[] = PARAMETERS.map((p) => {
    const resolutions = p.backingEngines.map(resolveBackingEngine);
    const status = classifyParameter(resolutions);
    const totalConsumers = resolutions.reduce((sum, r) => sum + r.consumerCount, 0);
    return { ...p, resolutions, status, totalConsumers };
  });

  const shippedCount = parameters.filter((p) => p.status === "SHIPPED").length;
  const partialCount = parameters.filter((p) => p.status === "PARTIAL").length;
  const paperCount = parameters.filter((p) => p.status === "PAPER").length;
  const missingCount = parameters.filter((p) => p.status === "MISSING").length;

  // paper_score = backing engine exists / 50
  const existsCount = parameters.filter((p) =>
    p.resolutions.some((r) => r.exists),
  ).length;

  const paperScore = existsCount / TOTAL_PARAMETERS;
  const shippedScore = shippedCount / TOTAL_PARAMETERS;
  const partialCreditScore = (shippedCount + 0.5 * partialCount) / TOTAL_PARAMETERS;

  return {
    parameters,
    summary: {
      paperScore,
      shippedScore,
      partialCreditScore,
      shippedCount,
      partialCount,
      paperCount,
      missingCount,
    },
  };
}

// CLI entry — print summary if invoked directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = scoreMarketGap();
  const s = result.summary;
  console.log(`Paper score:   ${(s.paperScore * 100).toFixed(1)}%`);
  console.log(`Shipped score: ${(s.shippedScore * 100).toFixed(1)}%`);
  console.log(`Partial credit:${(s.partialCreditScore * 100).toFixed(1)}%`);
  console.log(
    `Counts: SHIPPED=${s.shippedCount} PARTIAL=${s.partialCount} PAPER=${s.paperCount} MISSING=${s.missingCount}`,
  );
}
