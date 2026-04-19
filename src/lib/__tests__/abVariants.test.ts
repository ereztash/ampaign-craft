import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock analytics before importing abVariants
vi.mock("../analytics", () => ({
  track: vi.fn().mockResolvedValue(undefined),
}));

import { getVariant, trackVariantExposure, useVariant, getExperimentOverrides } from "../abVariants";
import { track } from "../analytics";

describe("abVariants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear ENV overrides between tests
    // (import.meta.env is a plain object in vitest jsdom)
    delete (import.meta.env as Record<string, string>).VITE_AB_LANDING_CTA;
    delete (import.meta.env as Record<string, string>).VITE_AB_ONBOARDING_FLOW;
    delete (import.meta.env as Record<string, string>).VITE_AB_PRICING_DISPLAY;
  });

  // ── getVariant ────────────────────────────────────────────────────────

  describe("getVariant", () => {
    it("returns 'control' when no userId is provided", () => {
      const variant = getVariant("landing_cta");
      expect(variant).toBe("control");
    });

    it("returns 'control' for an unknown experimentId", () => {
      const variant = getVariant("unknown_experiment", "user-123");
      expect(variant).toBe("control");
    });

    it("returns ENV override when set", () => {
      (import.meta.env as Record<string, string>).VITE_AB_LANDING_CTA = "challenger";
      const variant = getVariant("landing_cta", "any-user");
      expect(variant).toBe("challenger");
    });

    it("returns a valid variant from the experiment config", () => {
      const variant = getVariant("landing_cta", "user-abc");
      expect(["control", "challenger"]).toContain(variant);
    });

    it("returns consistent result for the same userId + experimentId (deterministic hash)", () => {
      const v1 = getVariant("onboarding_flow", "user-stable");
      const v2 = getVariant("onboarding_flow", "user-stable");
      expect(v1).toBe(v2);
    });

    it("returns valid variant for pricing_display", () => {
      const variant = getVariant("pricing_display", "user-xyz");
      expect(["control", "value_focused"]).toContain(variant);
    });

    it("replaces dashes with underscores in ENV key lookup", () => {
      (import.meta.env as Record<string, string>).VITE_AB_LANDING_CTA = "challenger";
      // "landing-cta" → VITE_AB_LANDING_CTA
      const variant = getVariant("landing-cta", "user-1");
      expect(variant).toBe("challenger");
    });
  });

  // ── trackVariantExposure ──────────────────────────────────────────────

  describe("trackVariantExposure", () => {
    it("calls track with ab_exposure event on first call", () => {
      trackVariantExposure("landing_cta", "control", "user-test-track");
      expect(track).toHaveBeenCalledWith(
        "aarrr.activation.aha_moment",
        expect.objectContaining({
          trigger: "ab_exposure:landing_cta",
          variant: "control",
          experiment: "landing_cta",
        }),
        expect.objectContaining({ userId: "user-test-track" }),
      );
    });

    it("does not call track a second time for the same key", () => {
      // Use a unique experiment+variant+user combo to avoid Set collision with other tests
      trackVariantExposure("onboarding_flow", "short", "user-dedup");
      trackVariantExposure("onboarding_flow", "short", "user-dedup");
      expect(track).toHaveBeenCalledTimes(1);
    });

    it("fires separately for different users", () => {
      trackVariantExposure("pricing_display", "control", "user-A-unique");
      trackVariantExposure("pricing_display", "control", "user-B-unique");
      expect(track).toHaveBeenCalledTimes(2);
    });

    it("fires separately for different variants", () => {
      trackVariantExposure("landing_cta", "control", "user-cv1");
      trackVariantExposure("landing_cta", "challenger", "user-cv1");
      expect(track).toHaveBeenCalledTimes(2);
    });
  });

  // ── useVariant ────────────────────────────────────────────────────────

  describe("useVariant", () => {
    it("returns a valid variant string", () => {
      const variant = useVariant("landing_cta", "user-uv1");
      expect(typeof variant).toBe("string");
      expect(variant.length).toBeGreaterThan(0);
    });

    it("tracks exposure on call", () => {
      useVariant("pricing_display", "user-uv-track");
      expect(track).toHaveBeenCalled();
    });
  });

  // ── getExperimentOverrides ────────────────────────────────────────────

  describe("getExperimentOverrides", () => {
    it("returns an object with all known experiment ids as keys", () => {
      const overrides = getExperimentOverrides();
      expect("landing_cta" in overrides).toBe(true);
      expect("onboarding_flow" in overrides).toBe(true);
      expect("pricing_display" in overrides).toBe(true);
    });

    it("returns undefined for experiments without ENV override", () => {
      const overrides = getExperimentOverrides();
      expect(overrides.landing_cta).toBeUndefined();
    });

    it("returns the ENV override value when set", () => {
      (import.meta.env as Record<string, string>).VITE_AB_LANDING_CTA = "challenger";
      const overrides = getExperimentOverrides();
      expect(overrides.landing_cta).toBe("challenger");
    });
  });
});
