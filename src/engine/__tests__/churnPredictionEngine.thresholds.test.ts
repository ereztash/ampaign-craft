// ═══════════════════════════════════════════════
// Threshold-locking tests — Loop 4: Churn Self-Calibration
//
// Behavioral thresholds locked here:
//   CALIBRATION_BLEND_START = 10  — blend starts at this sample count
//   CALIBRATION_BLEND_FULL  = 50  — full observed weight at this count
//
// See: README.md "Weighted blend at N ≥ 10, full weight at N ≥ 50"
// ═══════════════════════════════════════════════

import { describe, it, expect, beforeEach } from "vitest";
import { applyCalibrationUpdate, assessChurnRisk } from "../churnPredictionEngine";
import type { FormData } from "@/types/funnel";

function makeTechFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2b",
    ageRange: [25, 45],
    interests: "marketing",
    productDescription: "SaaS platform",
    averagePrice: 500,
    salesModel: "subscription",
    budgetRange: "high",
    mainGoal: "sales",
    existingChannels: ["email", "whatsapp"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

// ── CALIBRATION_BLEND_START = 10 ──────────────────────────────────────────────

describe("churn calibration — CALIBRATION_BLEND_START = 10 boundary", () => {
  it("risk score is unchanged before CALIBRATION_BLEND_START = 10 observations", () => {
    const baseline = assessChurnRisk(makeTechFormData()).riskScore;

    // Apply 9 observations with very low churn (below CALIBRATION_BLEND_START = 10)
    for (let i = 0; i < 9; i++) {
      applyCalibrationUpdate("tech", 0.01, 99);
    }

    // With sampleN = 9 < 10, blendCalibrated returns static value — score unchanged
    const calibrated = assessChurnRisk(makeTechFormData()).riskScore;
    expect(calibrated).toBe(baseline);
  });

  it("risk score changes after reaching CALIBRATION_BLEND_START = 10 observations", () => {
    const baseline = assessChurnRisk(makeTechFormData()).riskScore;

    // Apply exactly CALIBRATION_BLEND_START = 10 observations with very low churn
    for (let i = 0; i < 10; i++) {
      applyCalibrationUpdate("tech", 0.01, 99);
    }

    // At N=10, blending starts (weight = 0 at exactly 10, but 11 would have weight 1/40)
    // Apply one more to confirm blend is taking effect
    applyCalibrationUpdate("tech", 0.01, 99);

    const calibrated = assessChurnRisk(makeTechFormData()).riskScore;
    // Score should have decreased since observed churn (0.01) < static (0.25)
    expect(calibrated).toBeLessThan(baseline);
  });
});

// ── CALIBRATION_BLEND_FULL = 50 ───────────────────────────────────────────────

describe("churn calibration — CALIBRATION_BLEND_FULL = 50 full-weight boundary", () => {
  it("risk score reaches maximum blend effect at CALIBRATION_BLEND_FULL = 50", () => {
    // Apply CALIBRATION_BLEND_FULL = 50 observations with minimal churn
    for (let i = 0; i < 50; i++) {
      applyCalibrationUpdate("tech", 0.01, 99);
    }
    const score50 = assessChurnRisk(makeTechFormData()).riskScore;

    // Reset and apply 49 observations
    localStorage.clear();
    for (let i = 0; i < 49; i++) {
      applyCalibrationUpdate("tech", 0.01, 99);
    }
    const score49 = assessChurnRisk(makeTechFormData()).riskScore;

    // At N=50 the observed data has full weight; N=49 still has partial weight.
    // Both should be lower than baseline, and N=50 should be ≤ N=49.
    expect(score50).toBeLessThanOrEqual(score49);
  });

  it("observations beyond CALIBRATION_BLEND_FULL = 50 do not further reduce score (weight clamped to 1)", () => {
    // Build up to exactly 50
    for (let i = 0; i < 50; i++) {
      applyCalibrationUpdate("tech", 0.01, 99);
    }
    const score50 = assessChurnRisk(makeTechFormData()).riskScore;

    // Add 20 more (weight stays clamped at 1)
    for (let i = 0; i < 20; i++) {
      applyCalibrationUpdate("tech", 0.01, 99);
    }
    const score70 = assessChurnRisk(makeTechFormData()).riskScore;

    // Score should be the same since weight is already clamped at 1
    expect(score70).toBe(score50);
  });
});
