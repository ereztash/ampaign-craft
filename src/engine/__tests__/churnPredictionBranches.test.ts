// ═══════════════════════════════════════════════
// churnPredictionBranches.test.ts
// Branch-coverage additions: UKG, calibration, risk-signal paths
// ═══════════════════════════════════════════════

import { describe, it, expect, beforeEach } from "vitest";
import {
  assessChurnRisk,
  applyCalibrationUpdate,
  getChurnCalibration,
} from "../churnPredictionEngine";
import { FormData } from "@/types/funnel";
import type { UserKnowledgeGraph } from "../userKnowledgeGraph";

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45],
    interests: "marketing",
    productDescription: "SaaS platform",
    averagePrice: 200,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook", "email"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

function makeUKG(
  primary: "D" | "I" | "S" | "C",
  urgencySignal: "acute" | "mild" | "stable" = "stable",
): Partial<UserKnowledgeGraph> {
  return {
    discProfile: { primary, distribution: { D: 0.4, I: 0.3, S: 0.2, C: 0.1 } },
    derived: {
      urgencySignal,
      discCommunicationStyle: "balanced",
      realMetrics: { avgCPL: 50, avgOrderValue: 200, monthlyLeads: 20, conversionRate: 0.1, revenueMonthly: 4000 },
    },
  } as unknown as UserKnowledgeGraph;
}

beforeEach(() => {
  localStorage.clear();
});

describe("assessChurnRisk — UKG DISC profile branches", () => {
  it("S-profile reduces risk score by 5", () => {
    const withoutUKG = assessChurnRisk(makeFormData());
    const withS = assessChurnRisk(makeFormData(), makeUKG("S", "stable") as UserKnowledgeGraph);
    expect(withS.riskScore).toBe(withoutUKG.riskScore - 5);
  });

  it("S-profile adds disc-s signal", () => {
    const result = assessChurnRisk(makeFormData(), makeUKG("S", "stable") as UserKnowledgeGraph);
    expect(result.signals.some((s) => s.signal === "disc-s")).toBe(true);
  });

  it("D-profile increases risk score by 5", () => {
    const withoutUKG = assessChurnRisk(makeFormData());
    const withD = assessChurnRisk(makeFormData(), makeUKG("D", "stable") as UserKnowledgeGraph);
    expect(withD.riskScore).toBe(withoutUKG.riskScore + 5);
  });

  it("D-profile adds disc-d signal", () => {
    const result = assessChurnRisk(makeFormData(), makeUKG("D", "stable") as UserKnowledgeGraph);
    expect(result.signals.some((s) => s.signal === "disc-d")).toBe(true);
  });

  it("I-profile does not add DISC signal (neither D nor S)", () => {
    const result = assessChurnRisk(makeFormData(), makeUKG("I", "stable") as UserKnowledgeGraph);
    expect(result.signals.some((s) => s.signal === "disc-s" || s.signal === "disc-d")).toBe(false);
  });

  it("C-profile does not add DISC signal", () => {
    const result = assessChurnRisk(makeFormData(), makeUKG("C", "stable") as UserKnowledgeGraph);
    expect(result.signals.some((s) => s.signal === "disc-s" || s.signal === "disc-d")).toBe(false);
  });
});

describe("assessChurnRisk — UKG urgencySignal branches", () => {
  it("acute urgency adds 8 to risk score", () => {
    const base = assessChurnRisk(makeFormData());
    const acute = assessChurnRisk(makeFormData(), makeUKG("I", "acute") as UserKnowledgeGraph);
    expect(acute.riskScore).toBe(Math.min(base.riskScore + 8, 100));
  });

  it("acute urgency adds data-decline signal", () => {
    const result = assessChurnRisk(makeFormData(), makeUKG("I", "acute") as UserKnowledgeGraph);
    expect(result.signals.some((s) => s.signal === "data-decline")).toBe(true);
  });

  it("mild urgency adds 3 to risk score (no signal added)", () => {
    const base = assessChurnRisk(makeFormData());
    const mild = assessChurnRisk(makeFormData(), makeUKG("I", "mild") as UserKnowledgeGraph);
    expect(mild.riskScore).toBe(base.riskScore + 3);
    expect(mild.signals.some((s) => s.signal === "data-decline")).toBe(false);
  });

  it("stable urgency adds no risk delta from urgency branch", () => {
    const base = assessChurnRisk(makeFormData());
    const stable = assessChurnRisk(makeFormData(), makeUKG("I", "stable") as UserKnowledgeGraph);
    expect(stable.riskScore).toBe(base.riskScore);
  });
});

describe("assessChurnRisk — risk signal branches", () => {
  it("high-churn industry (education ≥40%) triggers high_industry_churn signal", () => {
    const result = assessChurnRisk(makeFormData({ businessField: "education" }));
    expect(result.signals.some((s) => s.signal === "high_industry_churn")).toBe(true);
  });

  it("low-churn industry (realEstate <40%) does NOT trigger high_industry_churn signal", () => {
    const result = assessChurnRisk(makeFormData({ businessField: "realEstate" }));
    expect(result.signals.some((s) => s.signal === "high_industry_churn")).toBe(false);
  });

  it("leads salesModel gets neither subscription bonus nor oneTime penalty", () => {
    const leads = assessChurnRisk(makeFormData({ salesModel: "leads" }));
    const subscription = assessChurnRisk(makeFormData({ salesModel: "subscription" }));
    const oneTime = assessChurnRisk(makeFormData({ salesModel: "oneTime" }));
    expect(leads.riskScore).toBeGreaterThan(subscription.riskScore);
    expect(leads.riskScore).toBeLessThan(oneTime.riskScore);
  });

  it("b2b audienceType does not add the b2c risk score", () => {
    const b2b = assessChurnRisk(makeFormData({ audienceType: "b2b" }));
    const b2c = assessChurnRisk(makeFormData({ audienceType: "b2c" }));
    expect(b2b.riskScore).toBeLessThan(b2c.riskScore);
  });

  it("mainGoal=awareness adds awareness_over_retention signal", () => {
    const result = assessChurnRisk(makeFormData({ mainGoal: "awareness" }));
    expect(result.signals.some((s) => s.signal === "awareness_over_retention")).toBe(true);
  });

  it("mainGoal=loyalty does NOT add awareness signal", () => {
    const result = assessChurnRisk(makeFormData({ mainGoal: "loyalty" }));
    expect(result.signals.some((s) => s.signal === "awareness_over_retention")).toBe(false);
  });

  it("low price + non-subscription adds low_switching_cost signal", () => {
    const result = assessChurnRisk(makeFormData({ averagePrice: 50, salesModel: "oneTime" }));
    expect(result.signals.some((s) => s.signal === "low_switching_cost")).toBe(true);
  });

  it("low price + subscription does NOT add low_switching_cost", () => {
    const result = assessChurnRisk(makeFormData({ averagePrice: 50, salesModel: "subscription" }));
    expect(result.signals.some((s) => s.signal === "low_switching_cost")).toBe(false);
  });

  it("price ≥ 100 does NOT add low_switching_cost", () => {
    const result = assessChurnRisk(makeFormData({ averagePrice: 100, salesModel: "oneTime" }));
    expect(result.signals.some((s) => s.signal === "low_switching_cost")).toBe(false);
  });
});

describe("assessChurnRisk — riskTier thresholds", () => {
  it("high-risk config produces critical or at-risk tier", () => {
    const result = assessChurnRisk(
      makeFormData({
        salesModel: "oneTime",
        experienceLevel: "beginner",
        budgetRange: "low",
        mainGoal: "awareness",
        existingChannels: ["facebook"],
        businessField: "education",
        averagePrice: 50,
      })
    );
    expect(["critical", "at-risk"]).toContain(result.riskTier);
  });

  it("low-risk config produces healthy or watch tier", () => {
    const result = assessChurnRisk(
      makeFormData({
        salesModel: "subscription",
        experienceLevel: "advanced",
        budgetRange: "high",
        mainGoal: "loyalty",
        existingChannels: ["email", "whatsapp"],
        businessField: "realEstate",
      })
    );
    expect(["healthy", "watch"]).toContain(result.riskTier);
  });
});

describe("assessChurnRisk — NRR projection salesModel branches", () => {
  it("leads salesModel gets lower improvement than subscription", () => {
    const sub = assessChurnRisk(makeFormData({ salesModel: "subscription" }));
    const leads = assessChurnRisk(makeFormData({ salesModel: "leads" }));
    expect(sub.nrrProjection.improvement).toBeGreaterThan(leads.nrrProjection.improvement);
  });

  it("oneTime salesModel gets lower improvement than leads", () => {
    const leads = assessChurnRisk(makeFormData({ salesModel: "leads" }));
    const oneTime = assessChurnRisk(makeFormData({ salesModel: "oneTime" }));
    expect(leads.nrrProjection.improvement).toBeGreaterThan(oneTime.nrrProjection.improvement);
  });
});

describe("assessChurnRisk — playbook branches", () => {
  it("b2b audience adds QBR tip", () => {
    const result = assessChurnRisk(makeFormData({ audienceType: "b2b" }));
    expect(result.retentionPlaybook.some((t) => t.en.includes("QBR"))).toBe(true);
  });

  it("b2c audience does NOT add QBR tip", () => {
    const result = assessChurnRisk(makeFormData({ audienceType: "b2c" }));
    expect(result.retentionPlaybook.some((t) => t.en.includes("QBR"))).toBe(false);
  });

  it("critical tier adds NPS survey tip", () => {
    const result = assessChurnRisk(
      makeFormData({
        salesModel: "oneTime",
        experienceLevel: "beginner",
        budgetRange: "low",
        mainGoal: "awareness",
        existingChannels: ["facebook"],
        businessField: "education",
        averagePrice: 50,
      })
    );
    if (result.riskTier === "critical" || result.riskTier === "at-risk") {
      expect(result.retentionPlaybook.some((t) => t.en.includes("NPS"))).toBe(true);
    }
  });
});

describe("applyCalibrationUpdate — calibration branches", () => {
  it("first update creates new entry with sampleN=1", () => {
    applyCalibrationUpdate("tech", 0.22, 92);
    const cal = getChurnCalibration();
    expect(cal["tech"]).toBeDefined();
    expect(cal["tech"].sampleN).toBe(1);
    expect(cal["tech"].observedChurnRate).toBe(0.22);
    expect(cal["tech"].observedNRR).toBe(92);
  });

  it("second update increments sampleN and blends rates", () => {
    applyCalibrationUpdate("tech", 0.20, 90);
    applyCalibrationUpdate("tech", 0.30, 95);
    const cal = getChurnCalibration();
    expect(cal["tech"].sampleN).toBe(2);
    expect(cal["tech"].observedChurnRate).toBeCloseTo(0.25, 5);
    expect(cal["tech"].observedNRR).toBeCloseTo(92.5, 5);
  });

  it("different fields don't interfere", () => {
    applyCalibrationUpdate("tech", 0.22, 92);
    applyCalibrationUpdate("food", 0.35, 85);
    const cal = getChurnCalibration();
    expect(cal["tech"].observedChurnRate).toBe(0.22);
    expect(cal["food"].observedChurnRate).toBe(0.35);
  });

  it("calibration affects risk score after enough samples (blend threshold)", () => {
    for (let i = 0; i < 15; i++) {
      applyCalibrationUpdate("tech", 0.01, 99);
    }
    const blended = assessChurnRisk(makeFormData({ businessField: "tech" }));
    const fresh = (() => {
      const savedCal = localStorage.getItem("funnelforge-churn-calibration");
      localStorage.removeItem("funnelforge-churn-calibration");
      const result = assessChurnRisk(makeFormData({ businessField: "tech" }));
      if (savedCal) localStorage.setItem("funnelforge-churn-calibration", savedCal);
      return result;
    })();
    // With very low observed churn, blended score should be lower
    expect(blended.riskScore).toBeLessThan(fresh.riskScore);
  });
});
