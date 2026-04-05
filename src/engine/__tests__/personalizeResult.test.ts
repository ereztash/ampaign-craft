import { describe, it, expect } from "vitest";
import { generateFunnel, personalizeResult } from "../funnelEngine";
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

describe("personalizeResult — Copy Lab", () => {
  it("PAS example mentions the user's industry", () => {
    const formData = makeFormData({ businessField: "fashion" });
    const result = generateFunnel(formData);
    const graph = buildUserKnowledgeGraph(formData);
    const personalized = personalizeResult(result, graph);

    const pas = personalized.copyLab.formulas.find((f) => f.origin?.includes("Schwartz") || f.origin?.includes("Kennedy"));
    expect(pas).toBeDefined();
    // Should contain fashion-specific pain point or price, not "manual reports"
    expect(pas!.example.he).not.toContain("דוחות ידניים");
    expect(pas!.example.he).toContain("₪");
  });

  it("AIDA example uses the actual business field", () => {
    const formData = makeFormData({ businessField: "tech", audienceType: "b2b", averagePrice: 5000 });
    const result = generateFunnel(formData);
    const graph = buildUserKnowledgeGraph(formData);
    const personalized = personalizeResult(result, graph);

    const aida = personalized.copyLab.formulas.find((f) => f.origin?.includes("Lewis") || f.origin?.includes("1898"));
    expect(aida).toBeDefined();
    expect(aida!.example.he).toContain("טכנולוגיה");
    expect(aida!.example.he).toContain("₪");
  });

  it("BAB example uses product description", () => {
    const formData = makeFormData({ productDescription: "מערכת ניהול הזמנות" });
    const result = generateFunnel(formData);
    const graph = buildUserKnowledgeGraph(formData);
    const personalized = personalizeResult(result, graph);

    const bab = personalized.copyLab.formulas.find((f) => f.origin?.includes("Collier"));
    expect(bab).toBeDefined();
    expect(bab!.example.he).toContain("מערכת ניהול הזמנות");
  });

  it("personalized result preserves original structure", () => {
    const formData = makeFormData();
    const result = generateFunnel(formData);
    const graph = buildUserKnowledgeGraph(formData);
    const personalized = personalizeResult(result, graph);

    // Same number of formulas
    expect(personalized.copyLab.formulas.length).toBe(result.copyLab.formulas.length);
    // Same reader profile
    expect(personalized.copyLab.readerProfile).toEqual(result.copyLab.readerProfile);
    // Same stages
    expect(personalized.stages).toEqual(result.stages);
    // Same ID
    expect(personalized.id).toBe(result.id);
  });
});

describe("personalizeResult — Hook Tips", () => {
  it("loss aversion hook uses actual monthly cost", () => {
    const formData = makeFormData({ audienceType: "b2c", averagePrice: 200 });
    const result = generateFunnel(formData);
    const graph = buildUserKnowledgeGraph(formData);
    const personalized = personalizeResult(result, graph);

    const lossHook = personalized.hookTips.find((h) => h.law === "lossAversion");
    if (lossHook) {
      expect(lossHook.example.he).toContain("₪");
      expect(lossHook.example.he).not.toContain("₪4,200"); // should use actual calc, not hardcoded
    }
  });

  it("curiosity gap hook mentions the industry", () => {
    const formData = makeFormData({ businessField: "health", audienceType: "b2b" });
    const result = generateFunnel(formData);
    const graph = buildUserKnowledgeGraph(formData);
    const personalized = personalizeResult(result, graph);

    const curiosityHook = personalized.hookTips.find((h) => h.law === "curiosityGap");
    if (curiosityHook) {
      expect(curiosityHook.example.he).toContain("בריאות");
    }
  });

  it("identity boundary hook uses industry", () => {
    const formData = makeFormData({ businessField: "tech", audienceType: "b2b", experienceLevel: "advanced" });
    const result = generateFunnel(formData);
    const graph = buildUserKnowledgeGraph(formData);
    const personalized = personalizeResult(result, graph);

    const identityHook = personalized.hookTips.find((h) => h.law === "identityBoundary");
    if (identityHook) {
      expect(identityHook.example.he).toContain("טכנולוגיה");
    }
  });

  it("same number of hooks before and after personalization", () => {
    const formData = makeFormData();
    const result = generateFunnel(formData);
    const graph = buildUserKnowledgeGraph(formData);
    const personalized = personalizeResult(result, graph);

    expect(personalized.hookTips.length).toBe(result.hookTips.length);
  });
});

describe("personalizeResult — different industries produce different examples", () => {
  it("fashion vs tech produce different PAS examples", () => {
    const fashionResult = personalizeResult(generateFunnel(makeFormData({ businessField: "fashion" })), buildUserKnowledgeGraph(makeFormData({ businessField: "fashion" })));
    const techResult = personalizeResult(generateFunnel(makeFormData({ businessField: "tech", audienceType: "b2b", averagePrice: 5000 })), buildUserKnowledgeGraph(makeFormData({ businessField: "tech", audienceType: "b2b", averagePrice: 5000 })));

    const fashionPas = fashionResult.copyLab.formulas[0].example.he;
    const techPas = techResult.copyLab.formulas[0].example.he;

    expect(fashionPas).not.toBe(techPas);
  });
});
