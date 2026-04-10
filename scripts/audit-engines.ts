#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════
// Engine Audit — Classifies every engine as LIVE / ORPHAN / DEAD
// based on (a) whether ENGINE_MANIFEST.isLive is true, and
// (b) how many other src/ files import the engine module.
//
// Output: reports/engine-audit.json
//
// Usage: npx tsx scripts/audit-engines.ts
// ═══════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ───────────────────────────────────────────────
// Paths
// ───────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(REPO_ROOT, "src");
const ENGINE_DIR = path.join(SRC_DIR, "engine");
const REPORTS_DIR = path.join(REPO_ROOT, "reports");
const OUTPUT_PATH = path.join(REPORTS_DIR, "engine-audit.json");

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

export type Classification = "LIVE" | "ORPHAN" | "DEAD";

interface EngineRecord {
  name: string;
  filePath: string;
  hasManifest: boolean;
  isLive: boolean;
  stage: string;
  parameters: string[];
  consumerCount: number;
  consumers: string[];
  classification: Classification;
}

interface AuditReport {
  generatedAt: string;
  totalEngines: number;
  counts: {
    LIVE: number;
    ORPHAN: number;
    DEAD: number;
  };
  engines: EngineRecord[];
}

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function listEngineFiles(): { name: string; filePath: string }[] {
  return fs
    .readdirSync(ENGINE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts"))
    .map((entry) => ({
      name: entry.name.replace(/\.ts$/, ""),
      filePath: path.join(ENGINE_DIR, entry.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function walkSrcFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSrcFiles(full, acc);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

interface ManifestInfo {
  hasManifest: boolean;
  isLive: boolean;
  stage: string;
  parameters: string[];
}

const MANIFEST_RE = /export\s+const\s+ENGINE_MANIFEST\s*=\s*\{([\s\S]*?)\}\s*as\s*const/;

function parseManifest(source: string): ManifestInfo {
  const match = source.match(MANIFEST_RE);
  if (!match) {
    return { hasManifest: false, isLive: false, stage: "unknown", parameters: [] };
  }

  const body = match[1];
  const isLive = /isLive\s*:\s*true/.test(body);
  const stageMatch = body.match(/stage\s*:\s*['"]([^'"]+)['"]/);
  const parametersMatch = body.match(/parameters\s*:\s*\[([\s\S]*?)\]/);

  const parameters: string[] = [];
  if (parametersMatch) {
    const inner = parametersMatch[1];
    const re = /['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(inner)) !== null) {
      parameters.push(m[1]);
    }
  }

  return {
    hasManifest: true,
    isLive,
    stage: stageMatch ? stageMatch[1] : "unknown",
    parameters,
  };
}

function countConsumers(engineName: string, allSrcFiles: string[], selfPath: string): string[] {
  // Match imports like:
  //   from "./userKnowledgeGraph"
  //   from "../userKnowledgeGraph"
  //   from "@/engine/userKnowledgeGraph"
  //   from "@/engine/userKnowledgeGraph.ts"
  // Ensure boundary so funnelEngine doesn't match funnelEngineV2.
  const re = new RegExp(`from\\s+['"][^'"]*\\b${escapeRegExp(engineName)}(?:\\.ts|\\.tsx)?['"]`);

  const consumers: string[] = [];
  for (const file of allSrcFiles) {
    if (path.resolve(file) === path.resolve(selfPath)) continue;
    const content = fs.readFileSync(file, "utf8");
    if (re.test(content)) {
      consumers.push(path.relative(REPO_ROOT, file));
    }
  }
  return consumers;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function classify(record: { isLive: boolean; consumerCount: number }): Classification {
  if (record.isLive) return "LIVE";
  if (record.consumerCount === 0) return "DEAD";
  return "ORPHAN";
}

// ───────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────

function main(): void {
  const engineFiles = listEngineFiles();
  const allSrcFiles = walkSrcFiles(SRC_DIR);

  const engines: EngineRecord[] = engineFiles.map(({ name, filePath }) => {
    const source = fs.readFileSync(filePath, "utf8");
    const manifest = parseManifest(source);
    const consumers = countConsumers(name, allSrcFiles, filePath);

    const record: EngineRecord = {
      name,
      filePath: path.relative(REPO_ROOT, filePath),
      hasManifest: manifest.hasManifest,
      isLive: manifest.isLive,
      stage: manifest.stage,
      parameters: manifest.parameters,
      consumerCount: consumers.length,
      consumers,
      classification: "DEAD",
    };
    record.classification = classify(record);
    return record;
  });

  const counts = {
    LIVE: engines.filter((e) => e.classification === "LIVE").length,
    ORPHAN: engines.filter((e) => e.classification === "ORPHAN").length,
    DEAD: engines.filter((e) => e.classification === "DEAD").length,
  };

  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    totalEngines: engines.length,
    counts,
    engines,
  };

  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));

  // Console summary
  console.log(`Engine audit written to ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
  console.log(`  total : ${engines.length}`);
  console.log(`  LIVE  : ${counts.LIVE}`);
  console.log(`  ORPHAN: ${counts.ORPHAN}`);
  console.log(`  DEAD  : ${counts.DEAD}`);
}

main();
