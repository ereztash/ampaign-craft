import { describe, it, expect, vi } from "vitest";
import { runMarketResearch } from "../marketAgent";
import type { SubQuery } from "@/types/research";

// ── Helpers ───────────────────────────────────────────────────────────────
function makeSubQuery(overrides: Partial<SubQuery> = {}): SubQuery {
  return {
    id: "sq-market-1",
    parentId: "q-1",
    domain: "market",
    question: "What are the main competitors in Israeli SaaS marketing tools?",
    keywords: ["SaaS", "Israel", "marketing", "competitors"],
    ...overrides,
  };
}

function makeInvokeLLM(response: unknown) {
  return vi.fn(() => Promise.resolve(JSON.stringify(response)));
}

describe("runMarketResearch", () => {
  // ── Happy path ────────────────────────────────────────────────────────────
  describe("Successful execution", () => {
    it("returns an array of MarketFindings", async () => {
      const invokeLLM = makeInvokeLLM([
        {
          insight_he: "המתחרים העיקריים הם X ו-Y",
          insight_en: "Main competitors are X and Y",
          evidence: "Market report 2024",
          sources: [{ title: "Market Report", type: "report", reliability: "medium" }],
          confidence: 0.8,
          actionable: true,
          recommendation_he: "בדל את עצמך",
          recommendation_en: "Differentiate yourself",
          marketAspect: "competitor",
        },
      ]);

      const findings = await runMarketResearch(makeSubQuery(), invokeLLM);

      expect(Array.isArray(findings)).toBe(true);
      expect(findings.length).toBeGreaterThan(0);
    });

    it("domain is always 'market'", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.7, actionable: false },
      ]);

      const findings = await runMarketResearch(makeSubQuery(), invokeLLM);

      for (const finding of findings) {
        expect(finding.domain).toBe("market");
      }
    });

    it("finding ID is prefixed with 'mkt-'", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.7, actionable: false },
      ]);

      const findings = await runMarketResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].id).toMatch(/^mkt-/);
    });

    it("subQueryId matches the input subQuery id", async () => {
      const subQuery = makeSubQuery({ id: "sq-market-99" });
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.7, actionable: false },
      ]);

      const findings = await runMarketResearch(subQuery, invokeLLM);

      expect(findings[0].subQueryId).toBe("sq-market-99");
    });

    it("each finding has all required fields", async () => {
      const invokeLLM = makeInvokeLLM([
        {
          insight_he: "תובנה",
          insight_en: "Insight",
          evidence: "Evidence",
          sources: [],
          confidence: 0.8,
          actionable: false,
          marketAspect: "trend",
        },
      ]);

      const findings = await runMarketResearch(makeSubQuery(), invokeLLM);

      for (const finding of findings) {
        expect(finding).toHaveProperty("id");
        expect(finding).toHaveProperty("subQueryId");
        expect(finding).toHaveProperty("domain");
        expect(finding.insight).toHaveProperty("he");
        expect(finding.insight).toHaveProperty("en");
        expect(finding).toHaveProperty("evidence");
        expect(finding).toHaveProperty("sources");
        expect(finding).toHaveProperty("confidence");
        expect(finding).toHaveProperty("actionable");
        expect(finding).toHaveProperty("marketAspect");
      }
    });

    it("marketAspect defaults to 'trend' when missing", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.7, actionable: false },
      ]);

      const findings = await runMarketResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].marketAspect).toBe("trend");
    });

    it("includes valid marketAspect values", async () => {
      const aspects = ["competitor", "pricing", "trend", "benchmark"] as const;
      for (const marketAspect of aspects) {
        const invokeLLM = makeInvokeLLM([
          { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.7, actionable: false, marketAspect },
        ]);

        const findings = await runMarketResearch(makeSubQuery(), invokeLLM);
        expect(findings[0].marketAspect).toBe(marketAspect);
      }
    });

    it("confidence is clamped between 0 and 1", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 999, actionable: false },
      ]);

      const findings = await runMarketResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].confidence).toBeLessThanOrEqual(1);
    });

    it("confidence defaults to 0.5 when not provided", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], actionable: false },
      ]);

      const findings = await runMarketResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].confidence).toBe(0.5);
    });

    it("recommendation is set when actionable is true", async () => {
      const invokeLLM = makeInvokeLLM([
        {
          insight_he: "",
          insight_en: "",
          evidence: "",
          sources: [],
          confidence: 0.8,
          actionable: true,
          recommendation_he: "המלצה",
          recommendation_en: "Recommendation",
        },
      ]);

      const findings = await runMarketResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].recommendation).toBeDefined();
      expect(findings[0].recommendation?.he).toBe("המלצה");
    });

    it("recommendation is undefined when actionable is false", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.7, actionable: false },
      ]);

      const findings = await runMarketResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].recommendation).toBeUndefined();
    });

    it("handles markdown-wrapped JSON response", async () => {
      const invokeLLM = vi.fn(() =>
        Promise.resolve("```json\n[{\"insight_he\":\"\",\"insight_en\":\"\",\"evidence\":\"\",\"sources\":[],\"confidence\":0.7,\"actionable\":false}]\n```")
      );

      const findings = await runMarketResearch(makeSubQuery(), invokeLLM);

      expect(findings.length).toBeGreaterThan(0);
    });
  });

  // ── Error handling ────────────────────────────────────────────────────────
  describe("Error handling", () => {
    it("returns empty array when LLM throws", async () => {
      const invokeLLM = vi.fn(() => Promise.reject(new Error("Network error")));

      const findings = await runMarketResearch(makeSubQuery(), invokeLLM);

      expect(findings).toEqual([]);
    });

    it("returns empty array when LLM returns unparseable text", async () => {
      const invokeLLM = vi.fn(() => Promise.resolve("I cannot help with that request."));

      const findings = await runMarketResearch(makeSubQuery(), invokeLLM);

      expect(findings).toEqual([]);
    });

    it("includes subQuery question in user prompt", async () => {
      const question = "What are market trends in Israeli EdTech?";
      const invokeLLM = makeInvokeLLM([]);
      const subQuery = makeSubQuery({ question });

      await runMarketResearch(subQuery, invokeLLM);

      const [, userPrompt] = invokeLLM.mock.calls[0] as [string, string];
      expect(userPrompt).toContain(question);
    });

    it("includes subQuery keywords in user prompt", async () => {
      const keywords = ["EdTech", "Israel", "LMS"];
      const invokeLLM = makeInvokeLLM([]);
      const subQuery = makeSubQuery({ keywords });

      await runMarketResearch(subQuery, invokeLLM);

      const [, userPrompt] = invokeLLM.mock.calls[0] as [string, string];
      expect(userPrompt).toContain("EdTech");
    });
  });

  // ── Multiple findings ──────────────────────────────────────────────────────
  describe("Multiple findings", () => {
    it("returns all findings from array response", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "1", insight_en: "", evidence: "", sources: [], confidence: 0.8, actionable: false },
        { insight_he: "2", insight_en: "", evidence: "", sources: [], confidence: 0.7, actionable: false },
      ]);

      const findings = await runMarketResearch(makeSubQuery(), invokeLLM);

      expect(findings).toHaveLength(2);
    });

    it("assigns unique IDs per finding", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.8, actionable: false },
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.7, actionable: false },
      ]);

      const findings = await runMarketResearch(makeSubQuery(), invokeLLM);

      const ids = findings.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
