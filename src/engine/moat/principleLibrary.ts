// ═══════════════════════════════════════════════
// src/engine/moat/principleLibrary.ts
//
// Startup loader for knowledge/principles.json + knowledge/sources.json.
// Runs once at module-load time (~60KB combined). No lazy loading, no
// network, no mutation of upstream.
//
// Validation is defensive: if the library shape is broken, we DO NOT
// silently return stubs. We throw in development so the mismatch is
// caught immediately during library version bumps. In production
// (PRINCIPLE_GROUNDING_ENABLED=false by default) the loader still runs
// but nothing consumes the data, so a bad library cannot brick the app.
//
// Why defensive: the library is upstream-generated, bumping through
// its own PR flow. A silently-accepted malformed library would leak
// into the Trace modal as empty state, which looks identical to T4's
// "no research mapping yet" — impossible to distinguish from a missing
// static map entry.
// ═══════════════════════════════════════════════

import principlesJson from "../../../knowledge/principles/principles.json";
import sourcesJson from "../../../knowledge/sources/sources.json";
import type {
  Principle,
  PrincipleId,
  PrincipleLibrary,
  SourceDoc,
  SourceRegistry,
} from "./types";

const PRINCIPLE_ID_RE = /^P\d{2}$/;
const SOURCE_ID_RE = /^D\d{3}$/;

/**
 * Assert that the shape of principles.json matches the contract declared
 * in knowledge/types/principles.ts. Runs once at startup. Throws on any
 * violation so a version mismatch fails loudly.
 */
function validatePrincipleLibrary(raw: unknown): PrincipleLibrary {
  if (!raw || typeof raw !== "object") {
    throw new Error("principles.json: not an object");
  }
  const lib = raw as Record<string, unknown>;
  if (typeof lib.version !== "string") throw new Error("principles.json: version missing");
  if (typeof lib.generated_at !== "string") throw new Error("principles.json: generated_at missing");
  if (!Array.isArray(lib.principles)) throw new Error("principles.json: principles not an array");

  const seenIds = new Set<string>();
  for (const p of lib.principles as unknown[]) {
    if (!p || typeof p !== "object") throw new Error("principle: not an object");
    const pp = p as Record<string, unknown>;
    if (typeof pp.id !== "string" || !PRINCIPLE_ID_RE.test(pp.id)) {
      throw new Error(`principle: bad id ${String(pp.id)}`);
    }
    if (seenIds.has(pp.id)) throw new Error(`principle: duplicate id ${pp.id}`);
    seenIds.add(pp.id);
    if (typeof pp.name_he !== "string" || typeof pp.name_en !== "string") {
      throw new Error(`${pp.id}: name_he/name_en missing`);
    }
    if (typeof pp.definition_he !== "string") throw new Error(`${pp.id}: definition_he missing`);
    if (!Array.isArray(pp.sources)) throw new Error(`${pp.id}: sources not an array`);
    if (!Array.isArray(pp.module_relevance)) throw new Error(`${pp.id}: module_relevance not an array`);
    if (typeof pp.claim_template !== "string") throw new Error(`${pp.id}: claim_template missing`);
    if (typeof pp.market_stance !== "string") throw new Error(`${pp.id}: market_stance missing`);
    if (!Array.isArray(pp.ops_signal)) throw new Error(`${pp.id}: ops_signal not an array`);
    if (!Array.isArray(pp.competitor_scan_keywords)) {
      throw new Error(`${pp.id}: competitor_scan_keywords not an array`);
    }
    if (typeof pp.defense_pattern !== "string") throw new Error(`${pp.id}: defense_pattern missing`);
  }
  return raw as PrincipleLibrary;
}

/**
 * Validate sources.json. We keep this lighter than the principle check
 * because sources are cited by ID — the principle-level check already
 * fails on bad ID strings, and any principle referencing a missing
 * source will simply resolve to empty in the enricher (never fabricate).
 */
function validateSourceRegistry(raw: unknown): SourceRegistry {
  if (!raw || typeof raw !== "object") {
    throw new Error("sources.json: not an object");
  }
  const reg = raw as Record<string, unknown>;
  if (typeof reg.version !== "string") throw new Error("sources.json: version missing");
  if (!Array.isArray(reg.sources)) throw new Error("sources.json: sources not an array");

  const seen = new Set<string>();
  for (const s of reg.sources as unknown[]) {
    if (!s || typeof s !== "object") throw new Error("source: not an object");
    const ss = s as Record<string, unknown>;
    if (typeof ss.id !== "string" || !SOURCE_ID_RE.test(ss.id)) {
      throw new Error(`source: bad id ${String(ss.id)}`);
    }
    if (seen.has(ss.id)) throw new Error(`source: duplicate id ${ss.id}`);
    seen.add(ss.id);
  }
  return raw as SourceRegistry;
}

// Module-level singletons. Loaded once on first import.
const library: PrincipleLibrary = validatePrincipleLibrary(principlesJson);
const registry: SourceRegistry = validateSourceRegistry(sourcesJson);

// Build indices for O(1) lookup. These are built once and never mutated.
const principleById: ReadonlyMap<PrincipleId, Principle> = new Map(
  library.principles.map((p) => [p.id, p] as const),
);
const sourceById: ReadonlyMap<string, SourceDoc> = new Map(
  registry.sources.map((s) => [s.id, s] as const),
);

// ─── Public API ───

export function getLibrary(): PrincipleLibrary {
  return library;
}

export function getSourceRegistry(): SourceRegistry {
  return registry;
}

/**
 * Return the Principle with the given id, or undefined if not present
 * in the current library version. Consumers MUST handle the undefined
 * branch (T4 — never fabricate a principle from thin air).
 */
export function findPrinciple(id: PrincipleId): Principle | undefined {
  return principleById.get(id);
}

/**
 * Return the SourceDoc with the given id, or undefined. Same contract
 * as findPrinciple — undefined is a valid state.
 */
export function findSource(id: string): SourceDoc | undefined {
  return sourceById.get(id);
}

export function libraryVersion(): string {
  return library.version;
}
