import { describe, it, expect } from "vitest";
import {
  initProfile,
  updateProfile,
  topNPrinciples,
  toBlackboardPayload,
  type ProfileEvent,
  type UserProfileVector,
} from "../daplProfile";

// ───────────────────────────────────────────────
// initProfile
// ───────────────────────────────────────────────

describe("initProfile", () => {
  it("returns all 7 dimensions at 0.5 and updated_at=0", () => {
    const p = initProfile();
    expect(p.risk_tolerance).toBe(0.5);
    expect(p.speed_preference).toBe(0.5);
    expect(p.detail_orientation).toBe(0.5);
    expect(p.strategic_depth).toBe(0.5);
    expect(p.channel_confidence).toBe(0.5);
    expect(p.brand_maturity).toBe(0.5);
    expect(p.data_literacy).toBe(0.5);
    expect(p.updated_at).toBe(0);
  });
});

// ───────────────────────────────────────────────
// updateProfile
// ───────────────────────────────────────────────

describe("updateProfile", () => {
  it("applies budgetRange=high to risk_tolerance and bumps updated_at", () => {
    const event: ProfileEvent = { field: "budgetRange", value: "high", ts: 1_700_000_000_000 };
    const next = updateProfile(initProfile(), event);
    expect(next.risk_tolerance).toBe(0.8);
    expect(next.updated_at).toBe(1_700_000_000_000);
    // Other dimensions untouched.
    expect(next.strategic_depth).toBe(0.5);
  });

  it("is idempotent: applying the same event twice yields the same state", () => {
    const event: ProfileEvent = { field: "budgetRange", value: "high", ts: 1_700_000_000_000 };
    const afterOnce = updateProfile(initProfile(), event);
    const afterTwice = updateProfile(afterOnce, event);
    expect(afterTwice).toEqual(afterOnce);
  });

  it("handles an unknown field by only bumping updated_at", () => {
    const start = initProfile();
    const event: ProfileEvent = { field: "unknownXyz", value: 42, ts: 1_700_000_123_000 };
    const next = updateProfile(start, event);
    expect(next.updated_at).toBe(1_700_000_123_000);
    // All dimensions identical to start.
    for (const key of Object.keys(start) as (keyof UserProfileVector)[]) {
      if (key === "updated_at") continue;
      expect(next[key]).toBe(start[key]);
    }
  });

  it("clamps scored values into [0,1] and handles invalid numbers", () => {
    // averagePrice with NaN → rule returns 0.5 (neutral default)
    const event: ProfileEvent = { field: "averagePrice", value: Number.NaN, ts: 1 };
    const next = updateProfile(initProfile(), event);
    expect(next.strategic_depth).toBe(0.5);
  });

  it("applies productDescription length rule deterministically", () => {
    const shortDesc = "a".repeat(60); // > 50, ≤ 100 → 0.4
    const longDesc = "a".repeat(250); // > 200 → 0.8
    const s1 = updateProfile(initProfile(), { field: "productDescription", value: shortDesc, ts: 10 });
    const s2 = updateProfile(initProfile(), { field: "productDescription", value: longDesc, ts: 20 });
    expect(s1.detail_orientation).toBe(0.4);
    expect(s2.detail_orientation).toBe(0.8);
  });

  it("handles a sequence of 3 different events independently (last-write-wins on a dimension)", () => {
    let p = initProfile();
    p = updateProfile(p, { field: "budgetRange", value: "low", ts: 1 });
    p = updateProfile(p, { field: "experienceLevel", value: "expert", ts: 2 });
    p = updateProfile(p, { field: "budgetRange", value: "high", ts: 3 });
    // budgetRange=high overrode budgetRange=low
    expect(p.risk_tolerance).toBe(0.8);
    // experienceLevel=expert still there
    expect(p.data_literacy).toBe(0.8);
    expect(p.updated_at).toBe(3);
  });

  it("does not regress updated_at when event.ts is non-finite", () => {
    const p = updateProfile(initProfile(), { field: "budgetRange", value: "high", ts: 100 });
    const next = updateProfile(p, { field: "budgetRange", value: "high", ts: Number.NaN });
    expect(next.updated_at).toBe(100);
  });
});

// ───────────────────────────────────────────────
// topNPrinciples
// ───────────────────────────────────────────────

describe("topNPrinciples", () => {
  it("returns n principle ids ordered by relevance desc", () => {
    // Build a profile where risk_tolerance is maximal and data_literacy is minimal.
    const p: UserProfileVector = {
      ...initProfile(),
      risk_tolerance: 1.0,
      data_literacy: 0.0,
    };
    const top3 = topNPrinciples(p, 3);
    expect(top3.length).toBe(3);
    // P02_RISK_APPETITE (high) and P12_DATA_LEARNING (low direction on data_literacy=0) both score 1.0.
    expect(top3).toContain("P02_RISK_APPETITE");
    expect(top3).toContain("P12_DATA_LEARNING");
  });

  it("returns [] when n <= 0", () => {
    expect(topNPrinciples(initProfile(), 0)).toEqual([]);
    expect(topNPrinciples(initProfile(), -1)).toEqual([]);
  });

  it("caps at 12 principles when n > 12", () => {
    const all = topNPrinciples(initProfile(), 100);
    expect(all.length).toBe(12);
    // All ids unique.
    expect(new Set(all).size).toBe(12);
  });

  it("uses declaration order as stable tie-breaker when all dimensions are 0.5", () => {
    // At 0.5 every principle relevance is exactly 0.5. Stable sort → declaration order.
    const first3 = topNPrinciples(initProfile(), 3);
    expect(first3).toEqual(["P01_RISK_CAUTION", "P02_RISK_APPETITE", "P03_DELIBERATE_PACE"]);
  });
});

// ───────────────────────────────────────────────
// toBlackboardPayload
// ───────────────────────────────────────────────

describe("toBlackboardPayload", () => {
  it("includes created_at set to updated_at when updated_at > 0", () => {
    const p = updateProfile(initProfile(), { field: "budgetRange", value: "high", ts: 1_700_000_000_000 });
    const payload = toBlackboardPayload(p);
    expect(payload.created_at).toBe(1_700_000_000_000);
    expect(payload.risk_tolerance).toBe(0.8);
  });
});
