import { describe, it, expect, vi } from "vitest";
import { runMarketingResearch } from "../marketingAgent";
import type { SubQuery } from "@/types/research";

// ── Helpers ───────────────────────────────────────────────────────────────
function makeSubQuery(overrides: Partial<SubQuery> = {}): SubQuery {
  return {
    id: "sq-mrk-1",
    parentId: "q-1",
    domain: "marketing",
    question: "What are the most effective digital marketing channels in Israel?",
    keywords: ["digital marketing", "Israel", "Facebook", "Instagram"],
    ...overrides,
  };
}

function makeInvokeLLM(response: unknown) {
  return vi.fn(() => Promise.resolve(JSON.stringify(response)));
}

describe("runMarketingResearch", () => {
  // ── Happy path ────────────────────────────────────────────────────────────
  describe("Successful execution", () => {
    it("returns an array of MarketingFindings", async () => {
      const invokeLLM = makeInvokeLLM([
        {
          insight_he: "פייסבוק הוא הערוץ הפופולרי ביותר בישראל",
          insight_en: "Facebook is the most popular channel in Israel",
          evidence: "Meta advertising report 2024",
          sources: [{ title: "Meta Report", type: "report", reliability: "high" }],
          confidence: 0.85,
          actionable: true,
          recommendation_he: "השקע בפייסבוק פרסום",
          recommendation_en: "Invest in Facebook advertising",
          marketingAspect: "channel",
        },
      ]);

      const findings = await runMarketingResearch(makeSubQuery(), invokeLLM);

      expect(Array.isArray(findings)).toBe(true);
      expect(findings.length).toBeGreaterThan(0);
    });

    it("domain is always 'marketing'", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.7, actionable: false },
      ]);

      const findings = await runMarketingResearch(makeSubQuery(), invokeLLM);

      for (const finding of findings) {
        expect(finding.domain).toBe("marketing");
      }
    });

    it("finding ID is prefixed with 'mrk-'", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.7, actionable: false },
      ]);

      const findings = await runMarketingResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].id).toMatch(/^mrk-/);
    });

    it("subQueryId matches the input subQuery id", async () => {
      const subQuery = makeSubQuery({ id: "sq-mrk-42" });
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.7, actionable: false },
      ]);

      const findings = await runMarketingResearch(subQuery, invokeLLM);

      expect(findings[0].subQueryId).toBe("sq-mrk-42");
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
          marketingAspect: "channel",
        },
      ]);

      const findings = await runMarketingResearch(makeSubQuery(), invokeLLM);

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
        expect(finding).toHaveProperty("marketingAspect");
      }
    });

    it("marketingAspect defaults to 'channel' when missing", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.7, actionable: false },
      ]);

      const findings = await runMarketingResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].marketingAspect).toBe("channel");
    });

    it("handles all valid marketingAspect values", async () => {
      const aspects = ["channel", "content", "timing", "audience", "technology"] as const;
      for (const marketingAspect of aspects) {
        const invokeLLM = makeInvokeLLM([
          { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.7, actionable: false, marketingAspect },
        ]);

        const findings = await runMarketingResearch(makeSubQuery(), invokeLLM);
        expect(findings[0].marketingAspect).toBe(marketingAspect);
      }
    });

    it("confidence is clamped to max 1", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 1.5, actionable: false },
      ]);

      const findings = await runMarketingResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].confidence).toBeLessThanOrEqual(1);
    });

    it("confidence defaults to 0.5 when not provided", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], actionable: false },
      ]);

      const findings = await runMarketingResearch(makeSubQuery(), invokeLLM);

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
          recommendation_he: "השקע יותר",
          recommendation_en: "Invest more",
        },
      ]);

      const findings = await runMarketingResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].recommendation?.he).toBe("השקע יותר");
      expect(findings[0].recommendation?.en).toBe("Invest more");
    });

    it("recommendation is undefined when not actionable", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.7, actionable: false },
      ]);

      const findings = await runMarketingResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].recommendation).toBeUndefined();
    });

    it("handles markdown-wrapped JSON", async () => {
      const invokeLLM = vi.fn(() =>
        Promise.resolve("```json\n[{\"insight_he\":\"\",\"insight_en\":\"\",\"evidence\":\"\",\"sources\":[],\"confidence\":0.7,\"actionable\":false}]\n```")
      );

      const findings = await runMarketingResearch(makeSubQuery(), invokeLLM);

      expect(findings.length).toBeGreaterThan(0);
    });
  });

  // ── Source normalization ──────────────────────────────────────────────────
  describe("Source normalization", () => {
    it("normalizes source citations", async () => {
      const invokeLLM = makeInvokeLLM([
        {
          insight_he: "",
          insight_en: "",
          evidence: "",
          sources: [
            { title: "Marketing Study", url: "https://example.com", type: "article", reliability: "high" },
          ],
          confidence: 0.7,
          actionable: false,
        },
      ]);

      const findings = await runMarketingResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].sources[0].title).toBe("Marketing Study");
      expect(findings[0].sources[0].url).toBe("https://example.com");
      expect(findings[0].sources[0].type).toBe("article");
      expect(findings[0].sources[0].reliability).toBe("high");
    });

    it("defaults missing source fields gracefully", async () => {
      const invokeLLM = makeInvokeLLM([
        {
          insight_he: "",
          insight_en: "",
          evidence: "",
          sources: [{}],
          confidence: 0.7,
          actionable: false,
        },
      ]);

      const findings = await runMarketingResearch(makeSubQuery(), invokeLLM);

      expect(findings[0].sources[0].title).toBe("Unknown source");
      expect(findings[0].sources[0].type).toBe("article");
      expect(findings[0].sources[0].reliability).toBe("medium");
    });

    it("handles null sources gracefully", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: null, confidence: 0.7, actionable: false },
      ]);

      const findings = await runMarketingResearch(makeSubQuery(), invokeLLM);

      expect(Array.isArray(findings[0].sources)).toBe(true);
    });
  });

  // ── Error handling ────────────────────────────────────────────────────────
  describe("Error handling", () => {
    it("returns empty array when LLM throws", async () => {
      const invokeLLM = vi.fn(() => Promise.reject(new Error("API down")));

      const findings = await runMarketingResearch(makeSubQuery(), invokeLLM);

      expect(findings).toEqual([]);
    });

    it("returns empty array on unparseable LLM response", async () => {
      const invokeLLM = vi.fn(() => Promise.resolve("not valid json"));

      const findings = await runMarketingResearch(makeSubQuery(), invokeLLM);

      expect(findings).toEqual([]);
    });

    it("includes question in the user prompt", async () => {
      const question = "Which channels work best for Israeli millennials?";
      const invokeLLM = makeInvokeLLM([]);
      const subQuery = makeSubQuery({ question });

      await runMarketingResearch(subQuery, invokeLLM);

      const [, userPrompt] = invokeLLM.mock.calls[0] as [string, string];
      expect(userPrompt).toContain(question);
    });

    it("includes keywords in the user prompt", async () => {
      const keywords = ["TikTok", "WhatsApp Business", "RCS"];
      const invokeLLM = makeInvokeLLM([]);
      const subQuery = makeSubQuery({ keywords });

      await runMarketingResearch(subQuery, invokeLLM);

      const [, userPrompt] = invokeLLM.mock.calls[0] as [string, string];
      expect(userPrompt).toContain("TikTok");
    });
  });

  // ── Multiple findings ──────────────────────────────────────────────────────
  describe("Multiple findings", () => {
    it("returns all findings from the response", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "A", insight_en: "", evidence: "", sources: [], confidence: 0.8, actionable: false },
        { insight_he: "B", insight_en: "", evidence: "", sources: [], confidence: 0.7, actionable: false },
        { insight_he: "C", insight_en: "", evidence: "", sources: [], confidence: 0.9, actionable: false },
      ]);

      const findings = await runMarketingResearch(makeSubQuery(), invokeLLM);

      expect(findings).toHaveLength(3);
    });

    it("each finding has a unique ID", async () => {
      const invokeLLM = makeInvokeLLM([
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.8, actionable: false },
        { insight_he: "", insight_en: "", evidence: "", sources: [], confidence: 0.7, actionable: false },
      ]);

      const findings = await runMarketingResearch(makeSubQuery(), invokeLLM);

      const ids = findings.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
