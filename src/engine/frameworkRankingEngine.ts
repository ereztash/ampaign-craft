// ═══════════════════════════════════════════════
// Framework Effectiveness Ranking Engine — Loop 3
//
// Tracks which copy framework (PAS / AIDA / BAB / Hormozi / Challenge)
// performs best for each (archetype, businessField) combination based
// on variant pick signals from the user.
//
// Closed loop:
//   captureFrameworkPick() ← called from copy variant UX
//   getTopFramework()      → consumed by aiCopyService.buildSystemPrompt
//
// Storage: localStorage (offline-first, no auth required).
// Cross-user aggregation: Supabase "framework_rankings" table (async).
// ═══════════════════════════════════════════════

import { safeStorage } from "@/lib/safeStorage";

export type CopyFramework = "PAS" | "AIDA" | "BAB" | "Hormozi" | "Challenge";

export interface FrameworkStats {
  framework: CopyFramework;
  primaryPicks: number;
  variationPicks: number;
  skips: number;
  /** Pick score: primary=2, variation=1, skip=0 — normalized 0–1 */
  score: number;
}

export interface FrameworkRankSnapshot {
  archetypeId: string;
  businessField: string;
  stats: FrameworkStats[];
  updatedAt: string;
}

const STORAGE_KEY = "funnelforge-framework-rankings";
const MAX_SNAPSHOTS = 30; // max unique (archetype, field) combos to retain

// ───────────────────────────────────────────────
// Storage helpers
// ───────────────────────────────────────────────

function readStore(): FrameworkRankSnapshot[] {
  return safeStorage.getJSON<FrameworkRankSnapshot[]>(STORAGE_KEY, []);
}

function writeStore(snapshots: FrameworkRankSnapshot[]): void {
  safeStorage.setJSON(STORAGE_KEY, snapshots.slice(-MAX_SNAPSHOTS));
}

function rankKey(archetypeId: string, businessField: string): string {
  return `${archetypeId}:${businessField}`;
}

// ───────────────────────────────────────────────
// Score computation
// ───────────────────────────────────────────────

function computeScore(stats: Omit<FrameworkStats, "score">): number {
  const total = stats.primaryPicks * 2 + stats.variationPicks + stats.skips;
  if (total === 0) return 0;
  return (stats.primaryPicks * 2 + stats.variationPicks) / (total * 2);
}

// ───────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────

/**
 * Record that a user picked a copy variant generated with the given framework.
 * Call from copy variant selection UI after captureVariantPick().
 *
 * choice:
 *   "primary"   → Use this  (strong positive, weight 2)
 *   "variation" → Try another (soft positive, weight 1)
 *   "skip"      → Not for me (negative, weight 0)
 */
export function captureFrameworkPick(
  framework: CopyFramework,
  archetypeId: string,
  businessField: string,
  choice: "primary" | "variation" | "skip",
): void {
  const store = readStore();
  const key = rankKey(archetypeId, businessField);
  const idx = store.findIndex((s) => rankKey(s.archetypeId, s.businessField) === key);

  let snapshot: FrameworkRankSnapshot;
  if (idx >= 0) {
    snapshot = store[idx];
  } else {
    snapshot = {
      archetypeId,
      businessField,
      stats: [],
      updatedAt: new Date().toISOString(),
    };
    store.push(snapshot);
  }

  let fwStats = snapshot.stats.find((s) => s.framework === framework);
  if (!fwStats) {
    fwStats = { framework, primaryPicks: 0, variationPicks: 0, skips: 0, score: 0 };
    snapshot.stats.push(fwStats);
  }

  if (choice === "primary") fwStats.primaryPicks++;
  else if (choice === "variation") fwStats.variationPicks++;
  else fwStats.skips++;

  fwStats.score = computeScore(fwStats);
  snapshot.updatedAt = new Date().toISOString();

  writeStore(store);

  // Fire-and-forget Supabase sync
  void syncFrameworkPick(framework, archetypeId, businessField, choice);
}

/**
 * Get the best-performing framework for a given (archetype, businessField) pair.
 * Returns null when no data exists (caller should fall back to default framework).
 * Uses score threshold of 0.5 to ensure the winner is meaningfully better.
 */
export function getTopFramework(
  archetypeId: string,
  businessField: string,
): CopyFramework | null {
  const store = readStore();
  const key = rankKey(archetypeId, businessField);
  const snapshot = store.find((s) => rankKey(s.archetypeId, s.businessField) === key);
  if (!snapshot || snapshot.stats.length === 0) return null;

  const totalPicks = snapshot.stats.reduce(
    (sum, s) => sum + s.primaryPicks + s.variationPicks + s.skips,
    0,
  );
  if (totalPicks < 5) return null; // not enough signal yet

  const best = snapshot.stats.reduce((a, b) => (b.score > a.score ? b : a));
  return best.score >= 0.5 ? best.framework : null;
}

/**
 * Get full ranking table for a given (archetype, businessField).
 * Returns sorted array (best first). Useful for admin debug panels.
 */
export function getFrameworkRanking(
  archetypeId: string,
  businessField: string,
): FrameworkStats[] {
  const store = readStore();
  const key = rankKey(archetypeId, businessField);
  const snapshot = store.find((s) => rankKey(s.archetypeId, s.businessField) === key);
  if (!snapshot) return [];
  return [...snapshot.stats].sort((a, b) => b.score - a.score);
}

/**
 * Clear all local rankings (GDPR / testing).
 */
export function clearFrameworkRankings(): void {
  safeStorage.remove(STORAGE_KEY);
}

// ───────────────────────────────────────────────
// Supabase sync (async, non-blocking)
// ───────────────────────────────────────────────

async function syncFrameworkPick(
  framework: CopyFramework,
  archetypeId: string,
  businessField: string,
  choice: "primary" | "variation" | "skip",
): Promise<void> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    await db.from("framework_pick_events").insert({
      framework,
      archetype_id: archetypeId,
      business_field: businessField,
      choice,
      picked_at: new Date().toISOString(),
    });
  } catch { /* offline — localStorage is source of truth */ }
}
