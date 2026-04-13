import { describe, it, expect } from "vitest";
import {
  buildUserKnowledgeGraph,
  type ChatInsights,
  type MetaSignals,
} from "../userKnowledgeGraph";
import { generateGuidance } from "../guidanceEngine";
import { initProfileWithContext } from "../optimization/daplProfile";
import { FormData, type FunnelResult } from "@/types/funnel";

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "fashion", audienceType: "b2c", ageRange: [25, 40],
    interests: "אופנה", productDescription: "חנות בגדים אונליין", averagePrice: 149,
    salesModel: "oneTime", budgetRange: "medium", mainGoal: "sales",
    existingChannels: ["facebook", "instagram"], experienceLevel: "intermediate", ...overrides,
  };
}

describe("coldStartMode detection", () => {
  it("returns true for brand-new user with no external data", () => {
    const graph = buildUserKnowledgeGraph(makeFormData(), null, null, { visitCount: 1 });
    expect(graph.derived.coldStartMode).toBe(true);
  });

  it("returns true for second visit with no external data", () => {
    const graph = buildUserKnowledgeGraph(makeFormData(), null, null, { visitCount: 2 });
    expect(graph.derived.coldStartMode).toBe(true);
  });

  it("returns false for third visit (no longer cold start)", () => {
    const graph = buildUserKnowledgeGraph(makeFormData(), null, null, { visitCount: 3 });
    expect(graph.derived.coldStartMode).toBe(false);
  });

  it("returns false when stylome voice is provided", () => {
    const voice = { register: "casual" as const, dugriScore: 0.5, cognitiveStyle: "concrete" as const, emotionalIntensity: "medium" as const, codeMixingIndex: 10 };
    const graph = buildUserKnowledgeGraph(makeFormData(), null, voice, { visitCount: 1 });
    expect(graph.derived.coldStartMode).toBe(false);
  });

  it("returns false when chat insights are provided", () => {
    const chat: ChatInsights = {
      mentionedObjections: [], expressedPainPoints: [], requestedTopics: [],
      engagementLevel: "low", goalClarity: 10, readinessSignal: "exploring",
    };
    const graph = buildUserKnowledgeGraph(makeFormData(), null, null, { visitCount: 1 }, undefined, { chatInsights: chat });
    expect(graph.derived.coldStartMode).toBe(false);
  });

  it("returns false when Meta is connected", () => {
    const meta: MetaSignals = { connected: true, spend: 100, cpl: 10, ctr: 2, cvr: 3, trendDirection: "stable" };
    const graph = buildUserKnowledgeGraph(makeFormData(), null, null, { visitCount: 1 }, undefined, { metaSignals: meta });
    expect(graph.derived.coldStartMode).toBe(false);
  });
});

describe("cold-start guidance", () => {
  it("returns educational items for cold-start user with no gaps", () => {
    const graph = buildUserKnowledgeGraph(makeFormData(), null, null, { visitCount: 1 });
    const items = generateGuidance([], {} as unknown as FunnelResult, undefined, graph);
    expect(items.length).toBe(3);
    expect(items[0].metric).toBe("profile");
    expect(items[1].metric).toBe("funnel");
    expect(items[2].metric).toBe("coach");
    expect(items[0].area.he).toBeTruthy();
    expect(items[0].area.en).toBeTruthy();
  });

  it("returns normal KPI guidance for returning user", () => {
    const graph = buildUserKnowledgeGraph(makeFormData(), null, null, { visitCount: 5, mastery: 30 });
    // With no gaps and non-cold-start user, returns empty
    const items = generateGuidance([], {} as unknown as FunnelResult, undefined, graph);
    expect(items.length).toBe(0);
  });
});

describe("initProfileWithContext", () => {
  it("sets tech industry priors", () => {
    const profile = initProfileWithContext("tech", "intermediate", "sales");
    expect(profile.data_literacy).toBe(0.7);
    expect(profile.strategic_depth).toBe(0.6);
    expect(profile.updated_at).toBe(0);
  });

  it("sets beginner experience overrides", () => {
    const profile = initProfileWithContext("tech", "beginner", "sales");
    expect(profile.risk_tolerance).toBe(0.3);
    expect(profile.data_literacy).toBe(0.3);
    expect(profile.detail_orientation).toBe(0.3);
  });

  it("sets advanced experience overrides", () => {
    const profile = initProfileWithContext("fashion", "advanced", "loyalty");
    expect(profile.risk_tolerance).toBe(0.7);
    expect(profile.strategic_depth).toBe(0.8);
    expect(profile.data_literacy).toBe(0.7);
  });

  it("falls back to neutral 0.5 for unknown industry", () => {
    const profile = initProfileWithContext("unknown", "intermediate", "sales");
    expect(profile.risk_tolerance).toBe(0.5);
    expect(profile.brand_maturity).toBe(0.5);
  });

  it("applies goal-based overrides", () => {
    const profile = initProfileWithContext("food", "intermediate", "loyalty");
    expect(profile.strategic_depth).toBe(0.7); // loyalty → strategic_depth ≥ 0.7
  });
});
