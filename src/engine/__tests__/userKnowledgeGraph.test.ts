import { describe, it, expect } from "vitest";
import {
  buildUserKnowledgeGraph,
  extractChatInsights,
  type ChatInsights,
  type ImportedDataSignals,
  type MetaSignals,
} from "../userKnowledgeGraph";
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

  // ═══ Cross-domain derived fields ═══

  it("cross-domain: dataConfidence is rich when both CSV and Meta present", () => {
    const imported: ImportedDataSignals = {
      datasetType: "campaign_performance", overallDirection: "improving", confidence: 0.8,
      metricHighlights: [{ metric: "ctr", direction: "up", changePct: 15 }], rowCount: 100,
    };
    const meta: MetaSignals = { connected: true, spend: 500, cpl: 12, ctr: 2.5, cvr: 3, trendDirection: "improving" };
    const graph = buildUserKnowledgeGraph(makeFormData({ businessField: "tech" }), null, null, undefined, undefined, { importedData: imported, metaSignals: meta });
    expect(graph.derived.dataConfidence).toBe("rich");
    expect(graph.derived.realMetrics.avgCPL).toBe(12);
    expect(graph.derived.realMetrics.avgCTR).toBe(2.5);
  });

  it("cross-domain: urgencySignal is acute on declining data with multiple drops", () => {
    const imported: ImportedDataSignals = {
      datasetType: "campaign_performance", overallDirection: "declining", confidence: 0.7,
      metricHighlights: [
        { metric: "ctr", direction: "down", changePct: -25 },
        { metric: "cvr", direction: "down", changePct: -18 },
      ],
      rowCount: 50,
    };
    const graph = buildUserKnowledgeGraph(makeFormData(), null, null, undefined, undefined, { importedData: imported });
    expect(graph.derived.urgencySignal).toBe("acute");
  });

  it("cross-domain: chatDerivedPain populates from coach objections", () => {
    const chat: ChatInsights = {
      mentionedObjections: ["too expensive"], expressedPainPoints: [], requestedTopics: [],
      engagementLevel: "medium", goalClarity: 50, readinessSignal: "exploring",
    };
    const graph = buildUserKnowledgeGraph(makeFormData(), null, null, undefined, undefined, { chatInsights: chat });
    expect(graph.derived.chatDerivedPain).not.toBeNull();
    expect(graph.derived.chatDerivedPain?.en).toContain("too expensive");
  });

  it("cross-domain: discCommunicationStyle is system1 for dugri voice", () => {
    const graph = buildUserKnowledgeGraph(
      makeFormData(), null,
      { register: "casual", dugriScore: 0.85, cognitiveStyle: "concrete", emotionalIntensity: "high", codeMixingIndex: 40 },
    );
    expect(graph.derived.discCommunicationStyle).toBe("system1");
  });

  it("cross-domain: voiceCalibration defaults to formal for b2b tech", () => {
    const graph = buildUserKnowledgeGraph(makeFormData({ businessField: "tech", audienceType: "b2b" }));
    expect(graph.derived.voiceCalibration).toBe("formal");
  });

  it("cross-domain: safe defaults when crossDomain is undefined", () => {
    const graph = buildUserKnowledgeGraph(makeFormData());
    expect(graph.derived.dataConfidence).toBe("no_data");
    expect(graph.derived.urgencySignal).toBe("none");
    expect(graph.derived.chatDerivedPain).toBeNull();
    expect(graph.derived.realMetrics.avgCPL).toBeNull();
    expect(graph.chatInsights).toBeNull();
    expect(graph.importedData).toBeNull();
    expect(graph.metaSignals).toBeNull();
  });
});

describe("extractChatInsights", () => {
  it("returns low engagement for empty messages", () => {
    const result = extractChatInsights([]);
    expect(result.engagementLevel).toBe("low");
    expect(result.goalClarity).toBe(0);
    expect(result.mentionedObjections).toHaveLength(0);
  });

  it("detects English objections", () => {
    const messages = [
      { role: "user", content: "The price is too expensive for my budget" },
      { role: "assistant", content: "I understand." },
    ];
    const result = extractChatInsights(messages);
    expect(result.mentionedObjections.length).toBeGreaterThanOrEqual(1);
  });

  it("detects Hebrew objections", () => {
    const result = extractChatInsights([{ role: "user", content: "זה יקר מדי בשבילי" }]);
    expect(result.mentionedObjections.length).toBeGreaterThanOrEqual(1);
  });

  it("detects pain points", () => {
    const result = extractChatInsights([{ role: "user", content: "My customers leave after one month" }]);
    expect(result.expressedPainPoints.length).toBeGreaterThanOrEqual(1);
  });

  it("detects topics", () => {
    const result = extractChatInsights([{ role: "user", content: "I need help with Facebook ads pricing" }]);
    expect(result.requestedTopics).toContain("facebook");
    expect(result.requestedTopics).toContain("pricing");
  });

  it("computes engagement levels", () => {
    expect(extractChatInsights([{ role: "user", content: "hi" }]).engagementLevel).toBe("low");
    expect(extractChatInsights(Array.from({ length: 5 }, () => ({ role: "user", content: "msg" }))).engagementLevel).toBe("medium");
    expect(extractChatInsights(Array.from({ length: 12 }, () => ({ role: "user", content: "msg" }))).engagementLevel).toBe("high");
  });

  it("detects readiness: ready", () => {
    expect(extractChatInsights([{ role: "user", content: "I'm ready to start implementing" }]).readinessSignal).toBe("ready");
  });

  it("detects readiness: stuck", () => {
    expect(extractChatInsights([{ role: "user", content: "I'm confused don't know what to do" }]).readinessSignal).toBe("stuck");
  });
});
