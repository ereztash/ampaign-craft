import { describe, it, expect } from "vitest";
import { generateWeeklyPulse } from "../pulseEngine";
import { SavedPlan } from "@/types/funnel";
import { generateFunnel } from "../funnelEngine";

function makePlan(overrides: Partial<SavedPlan> = {}): SavedPlan {
  const result = generateFunnel({
    businessField: "tech", audienceType: "b2c", ageRange: [25, 45],
    interests: "", productDescription: "test", averagePrice: 100,
    salesModel: "subscription", budgetRange: "medium", mainGoal: "sales",
    existingChannels: ["facebook"], experienceLevel: "intermediate",
  });
  return { id: "test-1", name: "Test Plan", result, savedAt: new Date().toISOString(), ...overrides };
}

describe("generateWeeklyPulse", () => {
  it("returns null for empty plans", () => {
    expect(generateWeeklyPulse([])).toBeNull();
  });

  it("returns valid pulse for non-empty plans", () => {
    const pulse = generateWeeklyPulse([makePlan()]);
    expect(pulse).not.toBeNull();
    expect(pulse!.weekNumber).toBeGreaterThan(0);
    expect(pulse!.planCount).toBe(1);
    expect(pulse!.actions.length).toBeGreaterThan(0);
  });

  it("has bilingual greeting", () => {
    const pulse = generateWeeklyPulse([makePlan()])!;
    expect(pulse.greeting.he).toContain("שבוע");
    expect(pulse.greeting.en).toContain("Week");
  });

  it("includes loss-framed messages", () => {
    const pulse = generateWeeklyPulse([makePlan(), makePlan({ id: "test-2" })])!;
    expect(pulse.lossFramedMessages.length).toBeGreaterThan(0);
    expect(["loss", "endowment", "ikea"]).toContain(pulse.lossFramedMessages[0].type);
  });

  it("each action has bilingual content", () => {
    const pulse = generateWeeklyPulse([makePlan()])!;
    for (const action of pulse.actions) {
      expect(action.action.he).toBeTruthy();
      expect(action.action.en).toBeTruthy();
      expect(action.emoji).toBeTruthy();
    }
  });

  it("insight of the week is bilingual", () => {
    const pulse = generateWeeklyPulse([makePlan()])!;
    expect(pulse.insightOfTheWeek.he).toBeTruthy();
    expect(pulse.insightOfTheWeek.en).toBeTruthy();
  });
});
