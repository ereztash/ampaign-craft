import { describe, it, expect } from "vitest";
import { buildUserKnowledgeGraph } from "../userKnowledgeGraph";
import { FormData } from "@/types/funnel";

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "fashion", audienceType: "b2c", ageRange: [25, 40],
    interests: "אופנה", productDescription: "חנות בגדים אונליין", averagePrice: 149,
    salesModel: "oneTime", budgetRange: "medium", mainGoal: "sales",
    existingChannels: ["facebook", "instagram"], experienceLevel: "intermediate", ...overrides,
  };
}

describe("buildUserKnowledgeGraph", () => {
  it("builds complete graph from FormData only", () => {
    const graph = buildUserKnowledgeGraph(makeFormData());
    expect(graph.business.field).toBe("fashion");
    expect(graph.business.price).toBe(149);
    expect(graph.business.product).toBe("חנות בגדים אונליין");
    expect(graph.differentiation).toBeNull();
    expect(graph.voice).toBeNull();
  });

  it("derives identity statement from form data", () => {
    const graph = buildUserKnowledgeGraph(makeFormData());
    expect(graph.derived.identityStatement.he).toContain("אופנה");
    expect(graph.derived.identityStatement.he.length).toBeGreaterThan(5);
  });

  it("derives industry pain points", () => {
    const graph = buildUserKnowledgeGraph(makeFormData({ businessField: "tech" }));
    expect(graph.derived.industryPainPoints.length).toBeGreaterThanOrEqual(3);
    expect(graph.derived.industryPainPoints[0].he).toBeTruthy();
    expect(graph.derived.industryPainPoints[0].en).toBeTruthy();
  });

  it("derives framing preference — loss for beginner + low budget", () => {
    const graph = buildUserKnowledgeGraph(makeFormData({ experienceLevel: "beginner", budgetRange: "low" }));
    expect(graph.derived.framingPreference).toBe("loss");
  });

  it("derives framing preference — gain for advanced + high budget + tech", () => {
    const graph = buildUserKnowledgeGraph(makeFormData({ experienceLevel: "advanced", budgetRange: "high", businessField: "tech" }));
    expect(graph.derived.framingPreference).toBe("gain");
  });

  it("derives complexity level from experience", () => {
    expect(buildUserKnowledgeGraph(makeFormData({ experienceLevel: "beginner" })).derived.complexityLevel).toBe("simple");
    expect(buildUserKnowledgeGraph(makeFormData({ experienceLevel: "advanced" })).derived.complexityLevel).toBe("advanced");
    expect(buildUserKnowledgeGraph(makeFormData({ experienceLevel: "intermediate" })).derived.complexityLevel).toBe("standard");
  });

  it("derives price context", () => {
    const graph = buildUserKnowledgeGraph(makeFormData({ averagePrice: 5000, audienceType: "b2b" }));
    expect(graph.derived.priceContext.formatted).toBe("₪5,000");
    expect(graph.derived.priceContext.isHighTicket).toBe(true);
  });

  it("detects stage of change from behavior", () => {
    const newUser = buildUserKnowledgeGraph(makeFormData(), null, null, { visitCount: 1 });
    expect(newUser.behavior.stageOfChange).toBe("precontemplation");

    const returning = buildUserKnowledgeGraph(makeFormData(), null, null, { visitCount: 5, mastery: 40 });
    expect(returning.behavior.stageOfChange).toBe("action");

    const veteran = buildUserKnowledgeGraph(makeFormData(), null, null, { visitCount: 20, mastery: 70, streak: 8 });
    expect(veteran.behavior.stageOfChange).toBe("maintenance");
  });

  it("includes voice when provided", () => {
    const voice = { register: "casual" as const, dugriScore: 0.8, cognitiveStyle: "concrete" as const, emotionalIntensity: "high" as const, codeMixingIndex: 25 };
    const graph = buildUserKnowledgeGraph(makeFormData(), null, voice);
    expect(graph.voice).not.toBeNull();
    expect(graph.voice?.dugriScore).toBe(0.8);
  });

  it("has pain points for all business fields", () => {
    const fields = ["fashion", "tech", "food", "services", "education", "health", "realEstate", "tourism", "personalBrand", "other"];
    for (const field of fields) {
      const graph = buildUserKnowledgeGraph(makeFormData({ businessField: field as FormData["businessField"] }));
      expect(graph.derived.industryPainPoints.length).toBeGreaterThanOrEqual(3);
    }
  });
});
