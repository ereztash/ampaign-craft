// ═══════════════════════════════════════════════
// Threshold-locking tests — Loop 3: Framework Effectiveness Ranking
//
// Behavioral threshold locked here:
//   totalPicks < 5  — minimum picks before a framework becomes default
//
// See: README.md "After 5+ picks, best-scoring framework becomes default"
// ═══════════════════════════════════════════════

import { describe, it, expect, beforeEach } from "vitest";
import { captureFrameworkPick, getTopFramework, clearFrameworkRankings } from "../frameworkRankingEngine";

// Real localStorage is available in jsdom environment
beforeEach(() => {
  clearFrameworkRankings();
});

// ── totalPicks < 5 boundary ───────────────────────────────────────────────────

describe("getTopFramework — totalPicks < 5 signal threshold", () => {
  it("returns null with 4 picks (below totalPicks < 5 threshold)", () => {
    for (let i = 0; i < 4; i++) {
      captureFrameworkPick("PAS", "strategist", "tech", "primary");
    }
    expect(getTopFramework("strategist", "tech")).toBeNull();
  });

  it("returns null with 0 picks", () => {
    expect(getTopFramework("optimizer", "services")).toBeNull();
  });

  it("returns null with exactly 4 total picks across multiple frameworks", () => {
    captureFrameworkPick("PAS", "pioneer", "tech", "primary");
    captureFrameworkPick("AIDA", "pioneer", "tech", "primary");
    captureFrameworkPick("BAB", "pioneer", "tech", "primary");
    captureFrameworkPick("Hormozi", "pioneer", "tech", "primary");
    // totalPicks = 4 — still below the threshold
    expect(getTopFramework("pioneer", "tech")).toBeNull();
  });

  it("returns framework with exactly 5 picks when score qualifies", () => {
    // 5 primary picks for PAS → score = (5*2) / (5*2*2) = 10/20 = 0.5 (qualifies)
    for (let i = 0; i < 5; i++) {
      captureFrameworkPick("PAS", "connector", "food", "primary");
    }
    expect(getTopFramework("connector", "food")).toBe("PAS");
  });

  it("transitions from null to non-null at the totalPicks < 5 boundary", () => {
    const arch = "closer";
    const field = "fashion";

    // Add 4 picks — should stay null
    for (let i = 0; i < 4; i++) {
      captureFrameworkPick("Challenge", arch, field, "primary");
    }
    expect(getTopFramework(arch, field)).toBeNull();

    // Add the 5th pick — should now return the top framework
    captureFrameworkPick("Challenge", arch, field, "primary");
    expect(getTopFramework(arch, field)).toBe("Challenge");
  });
});
