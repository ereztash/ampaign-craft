import { describe, it, expect, beforeEach } from "vitest";
import { loadSharedPlan, revokeShareLink, getMySharedPlans } from "@/services/shareService";
import { generateReferralCode, getReferralData, recordReferral, getReferralStats } from "@/engine/referralEngine";

describe("Share service", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loadSharedPlan returns null for non-existent shareId", () => {
    expect(loadSharedPlan("nonexistent")).toBeNull();
  });

  it("getMySharedPlans returns empty when no shares exist", () => {
    expect(getMySharedPlans()).toEqual([]);
  });

  it("revokeShareLink removes a share", () => {
    // Manually add a share to localStorage
    const share = {
      shareId: "test123",
      planId: "plan1",
      planName: "Test Plan",
      result: {},
      formData: {},
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      viewCount: 0,
    };
    localStorage.setItem("funnelforge-shared-plans", JSON.stringify([share]));

    revokeShareLink("test123");
    expect(getMySharedPlans()).toEqual([]);
  });

  it("loadSharedPlan returns null for expired shares", () => {
    const share = {
      shareId: "expired123",
      planId: "plan1",
      planName: "Test Plan",
      result: {},
      formData: {},
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(), // expired
      viewCount: 0,
    };
    localStorage.setItem("funnelforge-shared-plans", JSON.stringify([share]));

    expect(loadSharedPlan("expired123")).toBeNull();
  });

  it("loadSharedPlan increments view count", () => {
    const share = {
      shareId: "view123",
      planId: "plan1",
      planName: "Test Plan",
      result: {},
      formData: {},
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      viewCount: 5,
    };
    localStorage.setItem("funnelforge-shared-plans", JSON.stringify([share]));

    const loaded = loadSharedPlan("view123");
    expect(loaded?.viewCount).toBe(6);
  });
});

describe("Referral engine", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("generates 8-character referral codes", () => {
    const code = generateReferralCode("user1");
    expect(code).toBeTruthy();
    expect(code.length).toBe(8);
    // Code starts with first 4 chars of userId (uppercased)
    expect(code.startsWith("USER")).toBe(true);
  });

  it("creates and retrieves referral data", () => {
    const data = getReferralData("user1");
    expect(data.userId).toBe("user1");
    expect(data.code.length).toBe(8);
    expect(data.referrals).toEqual([]);
  });

  it("records referrals", () => {
    const data = recordReferral("user1", "friend@example.com");
    expect(data.referrals.length).toBe(1);
    expect(data.referrals[0].refereeEmail).toBe("friend@example.com");
    expect(data.referrals[0].convertedAt).toBeNull();
  });

  it("prevents duplicate referrals", () => {
    recordReferral("user1", "friend@example.com");
    const data = recordReferral("user1", "friend@example.com");
    expect(data.referrals.length).toBe(1);
  });

  it("computes referral stats", () => {
    recordReferral("user1", "a@ex.com");
    recordReferral("user1", "b@ex.com");
    const stats = getReferralStats("user1");
    expect(stats.totalReferred).toBe(2);
    expect(stats.totalConverted).toBe(0);
  });
});
