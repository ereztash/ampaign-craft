import { describe, it, expect } from "vitest";
import { assessChurnRisk } from "../churnPredictionEngine";
import { FormData } from "@/types/funnel";

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
    existingChannels: ["facebook", "instagram", "email"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

describe("Churn Prediction Engine", () => {
  // ═══════════════════════════════════════════════
  // BASIC STRUCTURE
  // ═══════════════════════════════════════════════

  it("returns all required fields", () => {
    const result = assessChurnRisk(makeFormData());
    expect(result.riskScore).toBeDefined();
    expect(result.riskTier).toBeDefined();
    expect(result.signals).toBeDefined();
    expect(result.interventions).toBeDefined();
    expect(result.nrrProjection).toBeDefined();
    expect(result.retentionPlaybook).toBeDefined();
  });

  it("risk score is between 0 and 100", () => {
    const result = assessChurnRisk(makeFormData());
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  it("risk tier is valid", () => {
    const result = assessChurnRisk(makeFormData());
    expect(["healthy", "watch", "at-risk", "critical"]).toContain(result.riskTier);
  });

  it("signals have bilingual descriptions", () => {
    const result = assessChurnRisk(makeFormData());
    for (const signal of result.signals) {
      expect(signal.signal.length).toBeGreaterThan(0);
      expect(["high", "medium", "low"]).toContain(signal.severity);
      expect(signal.description.he.length).toBeGreaterThan(0);
      expect(signal.description.en.length).toBeGreaterThan(0);
    }
  });

  // ═══════════════════════════════════════════════
  // RISK SCORING
  // ═══════════════════════════════════════════════

  it("one-time sales have higher risk than subscription", () => {
    const oneTime = assessChurnRisk(makeFormData({ salesModel: "oneTime" }));
    const subscription = assessChurnRisk(makeFormData({ salesModel: "subscription" }));
    expect(oneTime.riskScore).toBeGreaterThan(subscription.riskScore);
  });

  it("beginner has higher risk than advanced", () => {
    const beginner = assessChurnRisk(makeFormData({ experienceLevel: "beginner" }));
    const advanced = assessChurnRisk(makeFormData({ experienceLevel: "advanced" }));
    expect(beginner.riskScore).toBeGreaterThan(advanced.riskScore);
  });

  it("no direct channels increases risk", () => {
    const withEmail = assessChurnRisk(makeFormData({ existingChannels: ["email", "facebook"] }));
    const noEmail = assessChurnRisk(makeFormData({ existingChannels: ["facebook", "instagram"] }));
    expect(noEmail.riskScore).toBeGreaterThan(withEmail.riskScore);
  });

  it("low budget increases risk", () => {
    const low = assessChurnRisk(makeFormData({ budgetRange: "low" }));
    const high = assessChurnRisk(makeFormData({ budgetRange: "high" }));
    expect(low.riskScore).toBeGreaterThan(high.riskScore);
  });

  it("high-churn industries score higher risk", () => {
    const education = assessChurnRisk(makeFormData({ businessField: "education" }));
    const realEstate = assessChurnRisk(makeFormData({ businessField: "realEstate" }));
    expect(education.riskScore).toBeGreaterThan(realEstate.riskScore);
  });

  // ═══════════════════════════════════════════════
  // INTERVENTIONS
  // ═══════════════════════════════════════════════

  it("interventions cover all 3 stages", () => {
    const result = assessChurnRisk(makeFormData());
    const stages = new Set(result.interventions.map((i) => i.stage));
    expect(stages.has(1)).toBe(true); // Active
    expect(stages.has(2)).toBe(true); // Disengaging
    expect(stages.has(3)).toBe(true); // Silent
  });

  it("interventions are bilingual", () => {
    const result = assessChurnRisk(makeFormData());
    for (const intervention of result.interventions) {
      expect(intervention.action.he.length).toBeGreaterThan(0);
      expect(intervention.action.en.length).toBeGreaterThan(0);
      expect(intervention.template.he.length).toBeGreaterThan(0);
      expect(intervention.template.en.length).toBeGreaterThan(0);
    }
  });

  it("uses WhatsApp channel when available", () => {
    const result = assessChurnRisk(makeFormData({ existingChannels: ["whatsapp", "facebook"] }));
    const channels = result.interventions.map((i) => i.channel);
    expect(channels).toContain("whatsapp");
  });

  it("falls back to email when WhatsApp not available", () => {
    const result = assessChurnRisk(makeFormData({ existingChannels: ["facebook", "instagram"] }));
    const channels = result.interventions.map((i) => i.channel);
    expect(channels).toContain("email");
  });

  // ═══════════════════════════════════════════════
  // NRR PROJECTION
  // ═══════════════════════════════════════════════

  it("NRR with intervention is higher than current", () => {
    const result = assessChurnRisk(makeFormData());
    expect(result.nrrProjection.withIntervention).toBeGreaterThan(result.nrrProjection.current);
    expect(result.nrrProjection.improvement).toBeGreaterThan(0);
  });

  it("subscription has higher NRR improvement", () => {
    const subscription = assessChurnRisk(makeFormData({ salesModel: "subscription" }));
    const oneTime = assessChurnRisk(makeFormData({ salesModel: "oneTime" }));
    expect(subscription.nrrProjection.improvement).toBeGreaterThan(oneTime.nrrProjection.improvement);
  });

  it("NRR values are in reasonable range", () => {
    const result = assessChurnRisk(makeFormData());
    expect(result.nrrProjection.current).toBeGreaterThanOrEqual(50);
    expect(result.nrrProjection.current).toBeLessThanOrEqual(120);
    expect(result.nrrProjection.withIntervention).toBeLessThanOrEqual(120);
  });

  // ═══════════════════════════════════════════════
  // RETENTION PLAYBOOK
  // ═══════════════════════════════════════════════

  it("playbook has bilingual tips", () => {
    const result = assessChurnRisk(makeFormData());
    expect(result.retentionPlaybook.length).toBeGreaterThan(0);
    for (const tip of result.retentionPlaybook) {
      expect(tip.he.length).toBeGreaterThan(0);
      expect(tip.en.length).toBeGreaterThan(0);
    }
  });

  it("subscription playbook includes usage tracking", () => {
    const result = assessChurnRisk(makeFormData({ salesModel: "subscription" }));
    const hasUsageTracking = result.retentionPlaybook.some((t) =>
      t.en.toLowerCase().includes("usage") || t.en.toLowerCase().includes("milestone")
    );
    expect(hasUsageTracking).toBe(true);
  });

  it("one-time playbook includes loyalty program", () => {
    const result = assessChurnRisk(makeFormData({ salesModel: "oneTime" }));
    const hasLoyalty = result.retentionPlaybook.some((t) =>
      t.en.toLowerCase().includes("loyalty") || t.en.toLowerCase().includes("reorder")
    );
    expect(hasLoyalty).toBe(true);
  });

  // ═══════════════════════════════════════════════
  // SMOKE TESTS
  // ═══════════════════════════════════════════════

  const fields = ["fashion", "tech", "food", "services", "education", "health", "realEstate", "tourism", "personalBrand", "other"] as const;
  fields.forEach((field) => {
    it(`produces valid assessment for ${field}`, () => {
      const result = assessChurnRisk(makeFormData({ businessField: field }));
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(result.interventions.length).toBeGreaterThanOrEqual(5);
      expect(result.retentionPlaybook.length).toBeGreaterThan(0);
    });
  });
});
