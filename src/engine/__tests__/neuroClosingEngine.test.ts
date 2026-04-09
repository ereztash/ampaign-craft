import { describe, it, expect } from "vitest";
import { generateClosingStrategy } from "../neuroClosingEngine";
import { inferDISCProfile, DISCProfile } from "../discProfileEngine";
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
    existingChannels: ["facebook", "instagram", "whatsapp"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

function makeProfile(primary: "D" | "I" | "S" | "C"): DISCProfile {
  const formData = makeFormData();
  const profile = inferDISCProfile(formData);
  // Override primary for testing
  return { ...profile, primary };
}

describe("Neuro-Closing Engine", () => {
  // ═══════════════════════════════════════════════
  // BASIC STRUCTURE
  // ═══════════════════════════════════════════════

  it("returns all required fields", () => {
    const profile = inferDISCProfile(makeFormData());
    const strategy = generateClosingStrategy(profile, makeFormData());
    expect(strategy.closingStyle).toBeDefined();
    expect(strategy.objectionHandlers).toBeDefined();
    expect(strategy.pricePresentation).toBeDefined();
    expect(strategy.followUpSequence).toBeDefined();
    expect(strategy.urgencyTactics).toBeDefined();
    expect(strategy.trustSignals).toBeDefined();
  });

  it("objection handlers are bilingual", () => {
    const profile = inferDISCProfile(makeFormData());
    const strategy = generateClosingStrategy(profile, makeFormData());
    expect(strategy.objectionHandlers.length).toBeGreaterThanOrEqual(3);
    for (const handler of strategy.objectionHandlers) {
      expect(handler.objection.he.length).toBeGreaterThan(0);
      expect(handler.objection.en.length).toBeGreaterThan(0);
      expect(handler.response.he.length).toBeGreaterThan(0);
      expect(handler.response.en.length).toBeGreaterThan(0);
      expect(handler.technique.length).toBeGreaterThan(0);
    }
  });

  it("price presentation is bilingual", () => {
    const profile = inferDISCProfile(makeFormData());
    const strategy = generateClosingStrategy(profile, makeFormData());
    expect(strategy.pricePresentation.strategy.he.length).toBeGreaterThan(0);
    expect(strategy.pricePresentation.strategy.en.length).toBeGreaterThan(0);
    expect(strategy.pricePresentation.anchor.he.length).toBeGreaterThan(0);
    expect(strategy.pricePresentation.framing.he.length).toBeGreaterThan(0);
  });

  it("follow-up sequence has at least 3 steps", () => {
    const profile = inferDISCProfile(makeFormData());
    const strategy = generateClosingStrategy(profile, makeFormData());
    expect(strategy.followUpSequence.length).toBeGreaterThanOrEqual(3);
    for (const step of strategy.followUpSequence) {
      expect(step.day).toBeGreaterThanOrEqual(0);
      expect(step.channel.length).toBeGreaterThan(0);
      expect(step.action.he.length).toBeGreaterThan(0);
      expect(step.template.he.length).toBeGreaterThan(0);
    }
  });

  // ═══════════════════════════════════════════════
  // DISC-SPECIFIC STRATEGIES
  // ═══════════════════════════════════════════════

  it("D profile gets ROI-focused objection handlers", () => {
    const strategy = generateClosingStrategy(makeProfile("D"), makeFormData());
    const techniques = strategy.objectionHandlers.map((h) => h.technique);
    expect(techniques).toContain("cost-of-inaction");
  });

  it("I profile gets story-based objection handlers", () => {
    const strategy = generateClosingStrategy(makeProfile("I"), makeFormData());
    const techniques = strategy.objectionHandlers.map((h) => h.technique);
    expect(techniques).toContain("social-proof-story");
  });

  it("S profile gets risk-reduction objection handlers", () => {
    const strategy = generateClosingStrategy(makeProfile("S"), makeFormData());
    const techniques = strategy.objectionHandlers.map((h) => h.technique);
    expect(techniques).toContain("reduce-risk");
  });

  it("C profile gets data-driven objection handlers", () => {
    const strategy = generateClosingStrategy(makeProfile("C"), makeFormData());
    const techniques = strategy.objectionHandlers.map((h) => h.technique);
    expect(techniques).toContain("data-dump");
  });

  // ═══════════════════════════════════════════════
  // PRICE PRESENTATION VARIES BY TYPE
  // ═══════════════════════════════════════════════

  it("different DISC types get different price strategies", () => {
    const strategies = (["D", "I", "S", "C"] as const).map((type) =>
      generateClosingStrategy(makeProfile(type), makeFormData()).pricePresentation.strategy.en
    );
    const uniqueStrategies = new Set(strategies);
    expect(uniqueStrategies.size).toBe(4);
  });

  // ═══════════════════════════════════════════════
  // FOLLOW-UP CHANNEL ADAPTATION
  // ═══════════════════════════════════════════════

  it("uses WhatsApp when available in channels", () => {
    const profile = makeProfile("S");
    const strategy = generateClosingStrategy(profile, makeFormData({ existingChannels: ["whatsapp", "email"] }));
    const channels = strategy.followUpSequence.map((s) => s.channel);
    expect(channels).toContain("whatsapp");
  });

  it("falls back to email when WhatsApp not available", () => {
    const profile = makeProfile("C");
    const strategy = generateClosingStrategy(profile, makeFormData({ existingChannels: ["facebook"] }));
    const channels = strategy.followUpSequence.map((s) => s.channel);
    expect(channels).toContain("email");
  });

  // ═══════════════════════════════════════════════
  // TRUST SIGNALS
  // ═══════════════════════════════════════════════

  it("all profiles include guarantee trust signal", () => {
    for (const type of ["D", "I", "S", "C"] as const) {
      const strategy = generateClosingStrategy(makeProfile(type), makeFormData());
      const hasGuarantee = strategy.trustSignals.some((s) =>
        s.en.toLowerCase().includes("guarantee") || s.en.toLowerCase().includes("satisfaction")
      );
      expect(hasGuarantee).toBe(true);
    }
  });

  it("S profile has most trust signals", () => {
    const sStrategy = generateClosingStrategy(makeProfile("S"), makeFormData());
    const dStrategy = generateClosingStrategy(makeProfile("D"), makeFormData());
    expect(sStrategy.trustSignals.length).toBeGreaterThanOrEqual(dStrategy.trustSignals.length);
  });

  // ═══════════════════════════════════════════════
  // URGENCY TACTICS
  // ═══════════════════════════════════════════════

  it("urgency tactics are bilingual", () => {
    const profile = inferDISCProfile(makeFormData());
    const strategy = generateClosingStrategy(profile, makeFormData());
    expect(strategy.urgencyTactics.length).toBeGreaterThan(0);
    for (const tactic of strategy.urgencyTactics) {
      expect(tactic.he.length).toBeGreaterThan(0);
      expect(tactic.en.length).toBeGreaterThan(0);
    }
  });

  // ═══════════════════════════════════════════════
  // SMOKE TESTS
  // ═══════════════════════════════════════════════

  const fields = ["fashion", "tech", "food", "services", "education", "health", "realEstate", "tourism", "personalBrand", "other"] as const;
  fields.forEach((field) => {
    it(`generates valid strategy for ${field}`, () => {
      const fd = makeFormData({ businessField: field });
      const profile = inferDISCProfile(fd);
      const strategy = generateClosingStrategy(profile, fd);
      expect(strategy.objectionHandlers.length).toBeGreaterThanOrEqual(3);
      expect(strategy.followUpSequence.length).toBeGreaterThanOrEqual(3);
      expect(strategy.trustSignals.length).toBeGreaterThan(0);
    });
  });
});
