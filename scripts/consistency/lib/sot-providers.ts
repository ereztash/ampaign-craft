// ═══════════════════════════════════════════════
// Consistency Audit — Source of Truth Providers
//
// Every function in this file computes a ground truth value
// deterministically from the filesystem or source code.
// No mocks, no side effects, no external calls.
// ═══════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { walk, walkDirs } from "./walk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO = path.resolve(__dirname, "../../..");

function repoPath(...parts: string[]): string {
  return path.join(REPO, ...parts);
}

// ── Engine counts ─────────────────────────────────────────────────────────────

/** All non-test .ts files recursively under src/engine/. */
export function countEngineFiles(): number {
  return walk(repoPath("src/engine"), /\.ts$/).filter(
    (f) => !f.endsWith(".test.ts"),
  ).length;
}

/** Files named *Engine.ts under src/engine/ (non-test, recursive). */
export function countNamedEngineFiles(): number {
  return walk(repoPath("src/engine"), /Engine\.ts$/).filter(
    (f) => !f.endsWith(".test.ts"),
  ).length;
}

/** .ts files (non-test) in src/engine/blackboard/agents/. */
export function countAgentFiles(): number {
  return walk(repoPath("src/engine/blackboard/agents"), /\.ts$/).filter(
    (f) => !f.endsWith(".test.ts"),
  ).length;
}

// ── Infrastructure counts ─────────────────────────────────────────────────────

/** .sql files in supabase/migrations/. */
export function countMigrations(): number {
  const dir = repoPath("supabase/migrations");
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).length;
}

/** Directories in supabase/functions/ excluding _shared. */
export function countEdgeFunctions(): number {
  const dir = repoPath("supabase/functions");
  return walkDirs(dir).filter((name) => name !== "_shared").length;
}

// ── UI counts ────────────────────────────────────────────────────────────────

/** Non-test .tsx files under src/components/ (recursive). */
export function countComponents(): number {
  return walk(repoPath("src/components"), /\.tsx$/).filter(
    (f) => !f.includes("__tests__") && !f.endsWith(".test.tsx"),
  ).length;
}

/** Non-test .tsx files under src/pages/ (recursive). */
export function countPages(): number {
  return walk(repoPath("src/pages"), /\.tsx$/).filter(
    (f) => !f.includes("__tests__") && !f.endsWith(".test.tsx"),
  ).length;
}

/** Non-test .ts/.tsx files under src/hooks/. */
export function countHooks(): number {
  return walk(repoPath("src/hooks"), /\.tsx?$/).filter(
    (f) => !f.includes("__tests__") && !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"),
  ).length;
}

// ── i18n ─────────────────────────────────────────────────────────────────────

/**
 * Top-level key count in the `translations` export of src/i18n/translations.ts.
 * Counted as lines matching `  identifier:` at 2-space indent level.
 */
export function countI18nKeys(): number {
  const filePath = repoPath("src/i18n/translations.ts");
  if (!fs.existsSync(filePath)) return 0;
  const src = fs.readFileSync(filePath, "utf8");
  return (src.match(/^  [a-zA-Z_]\w*\s*:/gm) ?? []).length;
}

// ── Archetype and loop counts (derived from source) ──────────────────────────

/**
 * Number of members in the `ArchetypeId` union type in src/types/archetype.ts.
 * Slice from declaration to the first `;` to avoid matching other union types.
 */
export function countArchetypes(): number {
  const filePath = repoPath("src/types/archetype.ts");
  if (!fs.existsSync(filePath)) return 0;
  const src = fs.readFileSync(filePath, "utf8");
  const start = src.indexOf("export type ArchetypeId");
  if (start === -1) return 0;
  const end = src.indexOf(";", start);
  if (end === -1) return 0;
  return (src.slice(start, end).match(/\|\s*"/g) ?? []).length;
}

/** Number of parameters in map-parameters.ts (counted by `index:` entries). */
export function countParameters(): number {
  const filePath = repoPath("scripts/map-parameters.ts");
  if (!fs.existsSync(filePath)) return 0;
  const src = fs.readFileSync(filePath, "utf8");
  return (src.match(/^\s*\{\s*index\s*:/gm) ?? []).length;
}

// ── Pricing / quota values (derived from code) ─────────────────────────────

/** Trial days from the TRIAL_DAYS constant in create-checkout/index.ts. */
export function getTrialDays(): number {
  const filePath = repoPath("supabase/functions/create-checkout/index.ts");
  if (!fs.existsSync(filePath)) return -1;
  const src = fs.readFileSync(filePath, "utf8");
  // e.g.  const TRIAL_DAYS: Record<string, number> = { pro: 14, business: 14 };
  const m = src.match(/TRIAL_DAYS[^=]*=\s*\{[^}]*pro\s*:\s*(\d+)/);
  return m ? parseInt(m[1], 10) : -1;
}

// ── Hardcoded sentinel values (business decisions; human-maintained) ──────────

/** Canonical Pro tier price in ILS. Update here if pricing changes. */
export function proPriceIls(): number { return 99; }

/** Canonical Business tier price in ILS. */
export function businessPriceIls(): number { return 249; }

/** Monthly AI Coach message quota for Pro. */
export function proAiCoachMsgs(): number { return 75; }

/** Monthly WhatsApp quota for Pro. */
export function proWhatsappMonthly(): number { return 10; }

/** Seat count for Business tier. */
export function businessSeats(): number { return 3; }

/** Annual discount percentage. */
export function annualDiscountPct(): number { return 20; }

/** Number of closed feedback loops. */
export function loopCount(): number { return 6; }

/** Number of differentiation pillars. */
export function differentiationPillars(): number { return 5; }
