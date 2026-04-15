// ═══════════════════════════════════════════════
// Referral Engine — AARRR Phase 5 unit tests
// ═══════════════════════════════════════════════

import { describe, it, expect, beforeEach } from "vitest";
import {
  generateReferralCode,
  getReferralData,
  recordReferral,
  markReferralConverted,
  getReferralLink,
  getReferralStats,
  REFERRAL_REWARDS,
} from "../referralEngine";

const USER_ID = "test-user-abc";

// Clear localStorage before each test
beforeEach(() => {
  localStorage.clear();
});

describe("generateReferralCode", () => {
  it("returns an uppercase non-empty string", () => {
    const code = generateReferralCode(USER_ID);
    expect(code).toBeTruthy();
    expect(code).toBe(code.toUpperCase());
  });

  it("produces different codes for different users", () => {
    const c1 = generateReferralCode("user-1");
    const c2 = generateReferralCode("user-2");
    expect(c1).not.toBe(c2);
  });
});

describe("getReferralData", () => {
  it("creates new referral data when none exists", () => {
    const data = getReferralData(USER_ID);
    expect(data.userId).toBe(USER_ID);
    expect(data.referrals).toEqual([]);
    expect(data.code).toBeTruthy();
    expect(data.createdAt).toBeTruthy();
  });

  it("returns existing data for the same user", () => {
    const first = getReferralData(USER_ID);
    const second = getReferralData(USER_ID);
    expect(first.code).toBe(second.code);
  });
});

describe("recordReferral", () => {
  it("adds a referee to the referral list", () => {
    const data = recordReferral(USER_ID, "friend@example.com");
    expect(data.referrals).toHaveLength(1);
    expect(data.referrals[0].refereeEmail).toBe("friend@example.com");
    expect(data.referrals[0].convertedAt).toBeNull();
    expect(data.referrals[0].rewardClaimed).toBe(false);
  });

  it("does not duplicate existing referees", () => {
    recordReferral(USER_ID, "friend@example.com");
    const data = recordReferral(USER_ID, "friend@example.com");
    expect(data.referrals).toHaveLength(1);
  });

  it("accumulates multiple unique referees", () => {
    recordReferral(USER_ID, "a@example.com");
    recordReferral(USER_ID, "b@example.com");
    const data = getReferralData(USER_ID);
    expect(data.referrals).toHaveLength(2);
  });
});

describe("markReferralConverted", () => {
  it("marks a referral as converted with a timestamp", () => {
    recordReferral(USER_ID, "friend@example.com");
    const data = markReferralConverted(USER_ID, "friend@example.com");
    expect(data.referrals[0].convertedAt).toBeTruthy();
    const ts = new Date(data.referrals[0].convertedAt!);
    expect(ts.getTime()).toBeGreaterThan(0);
  });

  it("does nothing for unknown referee", () => {
    const data = markReferralConverted(USER_ID, "nobody@example.com");
    expect(data.referrals).toHaveLength(0);
  });

  it("does not overwrite an existing convertedAt", () => {
    recordReferral(USER_ID, "friend@example.com");
    const first = markReferralConverted(USER_ID, "friend@example.com");
    const firstTs = first.referrals[0].convertedAt;
    const second = markReferralConverted(USER_ID, "friend@example.com");
    expect(second.referrals[0].convertedAt).toBe(firstTs);
  });
});

describe("getReferralStats", () => {
  it("reports correct totals", () => {
    recordReferral(USER_ID, "a@example.com");
    recordReferral(USER_ID, "b@example.com");
    markReferralConverted(USER_ID, "a@example.com");

    const stats = getReferralStats(USER_ID);
    expect(stats.totalReferred).toBe(2);
    expect(stats.totalConverted).toBe(1);
    expect(stats.rewardsEarned).toBe(0); // none claimed yet
  });

  it("returns zero stats for new user", () => {
    const stats = getReferralStats(USER_ID);
    expect(stats.totalReferred).toBe(0);
    expect(stats.totalConverted).toBe(0);
  });
});

describe("getReferralLink", () => {
  it("returns a URL containing the referral code", () => {
    const link = getReferralLink(USER_ID);
    expect(link).toContain("?ref=");
    expect(link.startsWith("http")).toBe(true);
  });
});

describe("REFERRAL_REWARDS", () => {
  it("has both referrer and referee rewards", () => {
    expect(REFERRAL_REWARDS.referrer.forRole).toBe("referrer");
    expect(REFERRAL_REWARDS.referee.forRole).toBe("referee");
    expect(REFERRAL_REWARDS.referrer.durationDays).toBeGreaterThan(0);
    expect(REFERRAL_REWARDS.referee.durationDays).toBeGreaterThan(0);
  });
});
