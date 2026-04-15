// ═══════════════════════════════════════════════
// Φ_META_AGENT — AARRR health score tests
// Tests the computeAARRRHealth function via the metaAgent.run() cycle.
// ═══════════════════════════════════════════════

import { describe, it, expect, beforeEach } from "vitest";
import { Blackboard } from "@/engine/blackboard/blackboardStore";
import { createBlackboard } from "@/engine/blackboard/blackboardFactory";
import { metaAgent } from "@/engine/blackboard/agents/metaAgent";

function makeEmptyBoard(): Blackboard {
  return createBlackboard();
}

describe("Φ_META_AGENT aarrrHealth", () => {
  let board: Blackboard;

  beforeEach(() => {
    board = makeEmptyBoard();
  });

  it("produces an aarrrHealth object after running", () => {
    metaAgent.run(board);
    const metrics = board.getState().metaMetrics;
    expect(metrics).toBeTruthy();
    expect(metrics!.aarrrHealth).toBeTruthy();
  });

  it("all scores are in the 0-110 range", () => {
    metaAgent.run(board);
    const h = board.getState().metaMetrics!.aarrrHealth!;
    for (const key of ["overall", "acquisition", "activation", "retention", "revenue", "referral"] as const) {
      expect(h[key]).toBeGreaterThanOrEqual(0);
      expect(h[key]).toBeLessThanOrEqual(110);
    }
  });

  it("lists computedFrom signals", () => {
    metaAgent.run(board);
    const h = board.getState().metaMetrics!.aarrrHealth!;
    expect(Array.isArray(h.computedFrom)).toBe(true);
    expect(h.computedFrom.length).toBeGreaterThan(0);
  });

  it("overall is in expected range for empty board", () => {
    metaAgent.run(board);
    const h = board.getState().metaMetrics!.aarrrHealth!;
    // Empty board → only jGradient contributes to referral; others minimal
    expect(h.overall).toBeLessThanOrEqual(50);
  });
});
