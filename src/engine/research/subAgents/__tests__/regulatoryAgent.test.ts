import { describe, it, expect, vi } from "vitest";
import { runRegulatoryResearch } from "../regulatoryAgent";
import type { SubQuery } from "@/types/research";

// ── Helpers ───────────────────────────────────────────────────────────────
function makeSubQuery(overrides: Partial<SubQuery> = {}): SubQuery {
  return {
    id: "sq-1",
    parentId: "q-1",
    domain: "regulatory",
    question: "What are the Israeli advertising regulations for SaaS products?",
    keywords: ["advertising", "Israel", "SaaS", "regulation"],
    ...overrides,
  };
}

function makeInvokeLLM(response: unknown) {
  return vi.fn(() => Promise.resolve(JSON.stringify(response)));
}

describe("runRegulatoryResearch", () => {
  // ── Happy path ────────────────────────────────────────────────────────────
  describe("Successful execution", () => {
    it("returns an array of RegulatoryFindings", async () => {
      const invokeLLM = makeInvokeLLM([
        {
          insight_he: "חוק הגנת הצרכן חל על פרסום",
          insight_en: "Consumer Protection Law applies to advertising",
          evidence: "Section 5 of Consumer Protection Law 1981",
          sources: [{ title: "Consumer Protection Law", type: "regulation", reliability: "high" }],
          confidence: 0.9,
          actionable: true,
          recommendation_he: "ציין מחירים בעברית",
          recommendation_en: "Display prices in Hebrew",
          regulationType: "advertising",
          complianceLevel: "compliant",
        },
      ]);

      const findings = await runRegulatoryResearch(makeSubQuery(), invokeLLM);

      expect(Array.isArray(findings)).toBe(true);
      expect(findings.length).toBeGreaterThan(0);
    });

    it("each finding has required fields", async () => {
      const invokeLLM = makeInvokeLLM([
        {
          insight_he: "תובנה",
          insight_en: "Insight",
          evidence: "Evidence text",
          sources: [],
          confidence: 0.8,
          actionable: false,
          regulationType: "data-protection",
          complianceLevel: "needs-review",
        },
      ]);

      const findings = await runRegulatoryResearch(makeSubQuery(), invokeLLM);

      for (const finding of findings) {
        expect(finding).toHaveProperty("id");
        expect(finding).toHaveProperty("subQueryId");
        expect(finding).toHaveProperty("domain");
        expect(finding).toHaveProperty("insight");
        expect(finding.insight).toHaveProperty("he");
        expect(finding.insight).toHaveProperty("en");
        expect(finding).toHaveProperty("evidence");
        expect(finding).toHaveProperty("sources");
        expect(finding).toHaveProperty("confidence");
        expect(finding).toHaveProperty("actionable");
        expect(finding).toHaveProperty("regulationType");
        expect(finding).toHaveProperty("complianceLevel");
      }
    });

    it("domain is always 'regulatory'", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.7, actionable: false },
      ]);

      const findings = await runRegulatoryResearch(makeSubQuery(), invokeLLM);

      for (const finding of findings) {
        expect(finding.domain).toBe("regulatory");
      }
    });

    it("finding ID is prefixed with 'reg-'", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.8, actionable: false },
      ]);

      const findings = await runRegulatoryResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].id).toMatch(/^reg-/);
    });

    it("subQueryId matches the input subQuery id", async () => {
      const subQuery = makeSubQuery({ id: "sq-test-42" });
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.8, actionable: false },
      ]);

      const findings = await runRegulatoryResearch(subQuery, invokeLLM);

      expect(findings[0].subQueryId).toBe("sq-test-42");
    });

    it("confidence is clamped between 0 and 1", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 1.5, actionable: false },
      ]);

      const findings = await runRegulatoryResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].confidence).toBeLessThanOrEqual(1);
      expect(findings[0].confidence).toBeGreaterThanOrEqual(0);
    });

    it("includes recommendation when actionable is true", async () => {
      const invokeLLM = makeInvokeLLM([
        {
          insight_he: "תובנה",
          insight_en: "Insight",
          evidence: "",
          sources: [],
          confidence: 0.8,
          actionable: true,
          recommendation_he: "המלצה בעברית",
          recommendation_en: "Recommendation in English",
          regulationType: "advertising",
          complianceLevel: "compliant",
        },
      ]);

      const findings = await runRegulatoryResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].recommendation).toBeDefined();
      expect(findings[0].recommendation?.he).toBe("המלצה בעברית");
      expect(findings[0].recommendation?.en).toBe("Recommendation in English");
    });

    it("recommendation is undefined when actionable is false", async () => {
      const invokeLLM = makeInvokeLLM([
        {
          insight_he: "",
          insight_en: "",
          evidence: "",
          sources: [],
          confidence: 0.7,
          actionable: false,
        },
      ]);

      const findings = await runRegulatoryResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].recommendation).toBeUndefined();
    });

    it("handles markdown-wrapped JSON response", async () => {
      const invokeLLM = vi.fn(() => Promise.resolve(
        "```json\n[{\"insight_he\":\"\",\"insight_en\":\"\",\"evidence\":\"\",\"sources\":[],\"confidence\":0.7,\"actionable\":false}]\n```"
      ));

      const findings = await runRegulatoryResearch(makeSubQuery(), invokeLLM);

      expect(Array.isArray(findings)).toBe(true);
      expect(findings.length).toBeGreaterThan(0);
    });

    it("regulationType defaults to 'advertising' when missing from response", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.7, actionable: false },
      ]);

      const findings = await runRegulatoryResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].regulationType).toBe("advertising");
    });

    it("complianceLevel defaults to 'needs-review' when missing from response", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.7, actionable: false },
      ]);

      const findings = await runRegulatoryResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].complianceLevel).toBe("needs-review");
    });

    it("confidence defaults to 0.6 when not provided in response", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], actionable: false },
      ]);

      const findings = await runRegulatoryResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].confidence).toBe(0.6);
    });
  });

  // ── Source normalization ───────────────────────────────────────────────────
  describe("Source normalization", () => {
    it("normalizes source citations with title, type, reliability", async () => {
      const invokeLLM = makeInvokeLLM([
        {
          insight_he: "",
          insight_en: "",
          evidence: "",
          sources: [
            { title: "Consumer Protection Law", type: "regulation", reliability: "high" },
          ],
          confidence: 0.8,
          actionable: false,
        },
      ]);

      const findings = await runRegulatoryResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].sources[0]).toEqual({
        title: "Consumer Protection Law",
        url: undefined,
        type: "regulation",
        reliability: "high",
      });
    });

    it("handles missing sources gracefully", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: null, confidence: 0.7, actionable: false },
      ]);

      const findings = await runRegulatoryResearch(makeSubQuery(), invokeLLM);

      expect(Array.isArray(findings[0].sources)).toBe(true);
      expect(findings[0].sources).toHaveLength(0);
    });
  });

  // ── Error handling ────────────────────────────────────────────────────────
  describe("Error handling", () => {
    it("returns empty array when LLM throws", async () => {
      const invokeLLM = vi.fn(() => Promise.reject(new Error("LLM timeout")));

      const findings = await runRegulatoryResearch(makeSubQuery(), invokeLLM);

      expect(findings).toEqual([]);
    });

    it("returns empty array when LLM returns invalid JSON", async () => {
      const invokeLLM = vi.fn(() => Promise.resolve("this is not json at all!"));

      const findings = await runRegulatoryResearch(makeSubQuery(), invokeLLM);

      expect(findings).toEqual([]);
    });

    it("invokeLLM is called with subQuery question in prompt", async () => {
      const question = "What are Israeli GDPR-equivalent rules?";
      const subQuery = makeSubQuery({ question });
      const invokeLLM = makeInvokeLLM([]);

      await runRegulatoryResearch(subQuery, invokeLLM);

      const [, userPrompt] = invokeLLM.mock.calls[0] as [string, string];
      expect(userPrompt).toContain(question);
    });

    it("invokeLLM is called with subQuery keywords in prompt", async () => {
      const keywords = ["GDPR", "privacy", "Israel"];
      const subQuery = makeSubQuery({ keywords });
      const invokeLLM = makeInvokeLLM([]);

      await runRegulatoryResearch(subQuery, invokeLLM);

      const [, userPrompt] = invokeLLM.mock.calls[0] as [string, string];
      expect(userPrompt).toContain("GDPR");
      expect(userPrompt).toContain("privacy");
    });
  });

  // ── Multiple findings ──────────────────────────────────────────────────────
  describe("Multiple findings", () => {
    it("returns all findings from the LLM response", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "1", insight_en: "Finding 1", evidence: "", sources: [], confidence: 0.8, actionable: false },
        { insight_he: "2", insight_en: "Finding 2", evidence: "", sources: [], confidence: 0.7, actionable: false },
        { insight_he: "3", insight_en: "Finding 3", evidence: "", sources: [], confidence: 0.9, actionable: false },
      ]);

      const findings = await runRegulatoryResearch(makeSubQuery(), invokeLLM);

      expect(findings).toHaveLength(3);
    });

    it("each finding gets a unique ID", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.8, actionable: false },
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.7, actionable: false },
      ]);

      const findings = await runRegulatoryResearch(makeSubQuery(), invokeLLM);

      const ids = findings.map((f) => f.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });
});
