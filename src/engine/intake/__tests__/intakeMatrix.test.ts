// ═══════════════════════════════════════════════
// Tests the totality + invariants of the (need × pain) matrix.
// ═══════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  resolveIntake,
  ALL_NEEDS,
  ALL_PAINS,
} from "../intakeMatrix";

describe("intakeMatrix", () => {
  it("totality: every (need × pain) cell resolves to a defined routing", () => {
    for (const need of ALL_NEEDS) {
      for (const pain of ALL_PAINS) {
        const r = resolveIntake(need, pain);
        expect(r.target, `target missing for ${need}×${pain}`).toBeTruthy();
        expect(r.promise.headline.he.length).toBeGreaterThan(5);
        expect(r.promise.headline.en.length).toBeGreaterThan(5);
        expect(r.promise.kicker.he.length).toBeGreaterThan(5);
        expect(r.promise.kicker.en.length).toBeGreaterThan(5);
        expect(r.promise.expectedMinutes).toBeGreaterThan(0);
        expect(r.promise.expectedMinutes).toBeLessThanOrEqual(60);
      }
    }
  });

  it("module destination depends on pain only — same pain, any need => same target", () => {
    for (const pain of ALL_PAINS) {
      const targets = ALL_NEEDS.map((need) => resolveIntake(need, pain).target);
      const distinct = new Set(targets);
      expect(distinct.size, `pain ${pain} routes to multiple targets`).toBe(1);
    }
  });

  it("pain → target mapping matches design contract", () => {
    expect(resolveIntake("time", "finance").target).toBe("/pricing");
    expect(resolveIntake("time", "product").target).toBe("/differentiate");
    expect(resolveIntake("time", "sales").target).toBe("/sales");
    expect(resolveIntake("time", "marketing").target).toBe("/wizard");
  });

  it("promises are unique per (need × pain) — no copy-paste collisions", () => {
    const seen = new Set<string>();
    for (const need of ALL_NEEDS) {
      for (const pain of ALL_PAINS) {
        const key = resolveIntake(need, pain).promise.headline.he;
        expect(seen.has(key), `duplicate headline at ${need}×${pain}`).toBe(false);
        seen.add(key);
      }
    }
  });

  it("time-need promises are shorter than money-need promises (tone invariant)", () => {
    // "time" users want speed → expectedMinutes should be <= the "money"
    // expectedMinutes for the same pain (money work is deeper, slower).
    for (const pain of ALL_PAINS) {
      const t = resolveIntake("time", pain).promise.expectedMinutes;
      const m = resolveIntake("money", pain).promise.expectedMinutes;
      expect(t, `time should be <= money for ${pain}`).toBeLessThanOrEqual(m);
    }
  });
});
