import { describe, it, expect } from "vitest";
import { buildExecutiveBrief } from "../executiveBriefEngine";
import { buildUserKnowledgeGraph } from "../userKnowledgeGraph";
import { FormData, FunnelResult } from "@/types/funnel";

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2b",
    ageRange: [25, 45],
    interests: "software",
    productDescription: "SaaS analytics platform",
    averagePrice: 299,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook", "email"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

function makeFunnelResult(formData: FormData): FunnelResult {
  return {
    id: "test-result",
    funnelName: { he: "תוכנית בדיקה", en: "Test Plan" },
    stages: [
      {
        id: "awareness",
        name: { he: "מודעות", en: "Awareness" },
        budgetPercent: 40,
        channels: [],
        description: { he: "שלב מודעות", en: "Awareness stage" },
      },
    ],
    totalBudget: { min: 5000, max: 10000 },
    overallTips: [],
    hookTips: [],
    copyLab: {
      readerProfile: {
        level: 2,
        name: { he: "פרופיל", en: "Profile" },
        description: { he: "תיאור", en: "Description" },
        copyArchitecture: { he: "ארכיטקטורה", en: "Architecture" },
        principles: [],
      },
      formulas: [],
      writingTechniques: [],
    },
    kpis: [],
    createdAt: new Date().toISOString(),
    formData,
  };
}

describe("buildExecutiveBrief", () => {
  it("returns a complete brief with all required fields", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const result = makeFunnelResult(formData);
    const brief = buildExecutiveBrief({ result, ukg });

    expect(brief.id).toBeTruthy();
    expect(brief.generatedAt).toBeTruthy();
    expect(brief.healthScore).toBeDefined();
    expect(brief.healthTier).toBeDefined();
    expect(brief.healthLight).toBeDefined();
    expect(brief.topRisks).toBeDefined();
    expect(brief.nrrScenarios).toBeDefined();
    expect(brief.actionChecklist).toBeDefined();
    expect(brief.executiveSummary).toBeDefined();
  });

  it("always has exactly 3 top risks", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const result = makeFunnelResult(formData);
    const brief = buildExecutiveBrief({ result, ukg });

    expect(brief.topRisks).toHaveLength(3);
  });

  it("always has exactly 3 NRR scenarios", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const result = makeFunnelResult(formData);
    const brief = buildExecutiveBrief({ result, ukg });

    expect(brief.nrrScenarios).toHaveLength(3);
  });

  it("NRR scenarios are ordered pessimistic < baseline < optimistic", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const result = makeFunnelResult(formData);
    const brief = buildExecutiveBrief({ result, ukg });

    const [pessimistic, baseline, optimistic] = brief.nrrScenarios;
    expect(pessimistic.nrr).toBeLessThanOrEqual(baseline.nrr);
    expect(baseline.nrr).toBeLessThanOrEqual(optimistic.nrr);
  });

  it("health light is green when health score >= 70", () => {
    const formData = makeFormData({
      mainGoal: "sales",
      businessField: "tech",
      existingChannels: ["facebook", "email", "google"],
      experienceLevel: "advanced",
    });
    const ukg = buildUserKnowledgeGraph(formData);
    const result = makeFunnelResult(formData);
    const brief = buildExecutiveBrief({ result, ukg });

    if (brief.healthScore >= 70) {
      expect(brief.healthLight).toBe("green");
    } else if (brief.healthScore >= 40) {
      expect(brief.healthLight).toBe("amber");
    } else {
      expect(brief.healthLight).toBe("red");
    }
  });

  it("executive summary is bilingual", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const result = makeFunnelResult(formData);
    const brief = buildExecutiveBrief({ result, ukg });

    expect(brief.executiveSummary.he).toBeTruthy();
    expect(brief.executiveSummary.en).toBeTruthy();
  });

  it("each risk has bilingual title, description and mitigation", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const result = makeFunnelResult(formData);
    const brief = buildExecutiveBrief({ result, ukg });

    for (const risk of brief.topRisks) {
      expect(risk.title.he).toBeTruthy();
      expect(risk.title.en).toBeTruthy();
      expect(risk.description.he).toBeTruthy();
      expect(risk.description.en).toBeTruthy();
      expect(risk.mitigationAction.he).toBeTruthy();
      expect(risk.mitigationAction.en).toBeTruthy();
    }
  });

  it("action checklist has at least 1 item", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const result = makeFunnelResult(formData);
    const brief = buildExecutiveBrief({ result, ukg });

    expect(brief.actionChecklist.length).toBeGreaterThan(0);
  });

  it("action items are sorted by priority", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const result = makeFunnelResult(formData);
    const brief = buildExecutiveBrief({ result, ukg });

    for (let i = 0; i < brief.actionChecklist.length - 1; i++) {
      expect(brief.actionChecklist[i].priority).toBeLessThanOrEqual(brief.actionChecklist[i + 1].priority);
    }
  });

  it("brief id is derived from result id", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const result = makeFunnelResult(formData);
    const brief = buildExecutiveBrief({ result, ukg });

    expect(brief.id).toContain(result.id);
  });

  it("risks have valid severity traffic lights", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const result = makeFunnelResult(formData);
    const brief = buildExecutiveBrief({ result, ukg });

    const validLights = new Set(["green", "amber", "red"]);
    for (const risk of brief.topRisks) {
      expect(validLights.has(risk.severity)).toBe(true);
    }
  });

  // Smoke test across all business fields
  const fields: FormData["businessField"][] = [
    "fashion", "tech", "food", "services", "education", "health", "realEstate", "tourism", "personalBrand", "other",
  ];
  fields.forEach((field) => {
    it(`generates valid brief for ${field}`, () => {
      const formData = makeFormData({ businessField: field });
      const ukg = buildUserKnowledgeGraph(formData);
      const result = makeFunnelResult(formData);
      const brief = buildExecutiveBrief({ result, ukg });

      expect(brief.topRisks).toHaveLength(3);
      expect(brief.healthScore).toBeGreaterThanOrEqual(0);
      expect(brief.healthScore).toBeLessThanOrEqual(100);
    });
  });
});
