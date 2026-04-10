#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════
// Market Gap Scorer
//
// For each of the 50 benchmark parameters, classifies
// the backing engines as SHIPPED / PARTIAL / PAPER / MISSING
// and computes paper / shipped / partial-credit scores against
// the fixed market constants (70.2% average, 85% top competitor).
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

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

export type ParameterStatus = "SHIPPED" | "PARTIAL" | "PAPER" | "MISSING";

export interface BackingEngineResolution {
  name: string;
  exists: boolean;
  isLiveInRegistry: boolean;
  consumerCount: number;
  kind: "src-engine" | "src-other" | "edge-function" | "meta" | "unresolved";
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
  if (!fs.existsSync(filePath)) return false;
  const src = fs.readFileSync(filePath, "utf8");
  const match = src.match(/export\s+const\s+ENGINE_MANIFEST\s*=\s*\{([\s\S]*?)\}\s*as\s*const/);
  if (!match) return false;
  return /isLive\s*:\s*true/.test(match[1]);
}

// Counts files in src/ that import from the given engine module path.
function countEngineConsumers(engineName: string, selfPath: string | null): number {
  const re = new RegExp(`from\\s+['"][^'"]*\\b${escapeRegExp(engineName)}(?:\\.ts|\\.tsx)?['"]`);
  let count = 0;
  for (const file of SRC_TS_FILES) {
    if (selfPath && path.resolve(file) === path.resolve(selfPath)) continue;
    const content = fs.readFileSync(file, "utf8");
    if (re.test(content)) count++;
  }
  return count;
}

// Counts files in src/ that reference an Edge function name (string literal).
function countEdgeFunctionConsumers(functionName: string): number {
  const re = new RegExp(`['"\`]${escapeRegExp(functionName)}['"\`]`);
  let count = 0;
  for (const file of SRC_TS_FILES) {
    const content = fs.readFileSync(file, "utf8");
    if (re.test(content)) count++;
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

  // Case 3: any other src/ file with matching basename (e.g. src/lib/hebrewCopyOptimizer.ts)
  const found = findSrcFileByBasename(name);
  if (found) {
    return {
      name,
      exists: true,
      isLiveInRegistry: false,
      consumerCount: countEngineConsumers(name, found),
      kind: "src-other",
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
// Classification
// ───────────────────────────────────────────────

function classifyParameter(resolutions: BackingEngineResolution[]): ParameterStatus {
  // SHIPPED if any backing engine is live in registry OR has >=3 consumers.
  const anyShipped = resolutions.some(
    (r) => r.exists && (r.isLiveInRegistry || r.consumerCount >= 3),
  );
  if (anyShipped) return "SHIPPED";

  // PARTIAL if any backing engine exists with 1-2 consumers and not live.
  const anyPartial = resolutions.some(
    (r) => r.exists && !r.isLiveInRegistry && r.consumerCount >= 1 && r.consumerCount <= 2,
  );
  if (anyPartial) return "PARTIAL";

  // PAPER if any backing engine exists at all (with 0 consumers).
  const anyExists = resolutions.some((r) => r.exists);
  if (anyExists) return "PAPER";

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
  console.log(`Counts: SHIPPED=${s.shippedCount} PARTIAL=${s.partialCount} PAPER=${s.paperCount} MISSING=${s.missingCount}`);
}
