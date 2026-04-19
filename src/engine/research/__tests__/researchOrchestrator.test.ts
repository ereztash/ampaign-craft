import { describe, it, expect, vi, beforeEach } from "vitest";
import { runResearch } from "../researchOrchestrator";
import type { ResearchQuery, ResearchSession } from "@/types/research";

// ── Mock Supabase ─────────────────────────────────────────────────────────
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));

// ── Mock sub-agents ───────────────────────────────────────────────────────
vi.mock("../subAgents/regulatoryAgent", () => ({
  runRegulatoryResearch: vi.fn(async (subQuery) => [
    {
      id: `reg-${subQuery.id}-1`,
      subQueryId: subQuery.id,
      domain: "regulatory",
      insight: { he: "ממצא רגולטורי", en: "Regulatory finding" },
      evidence: "Israeli law section 5",
      sources: [],
      confidence: 0.85,
      actionable: true,
      recommendation: { he: "המלצה", en: "Recommendation" },
      regulationType: "advertising",
      complianceLevel: "compliant",
    },
  ]),
}));

vi.mock("../subAgents/marketAgent", () => ({
  runMarketResearch: vi.fn(async (subQuery) => [
    {
      id: `mkt-${subQuery.id}-1`,
      subQueryId: subQuery.id,
      domain: "market",
      insight: { he: "ממצא שוק", en: "Market finding" },
      evidence: "Market data",
      sources: [],
      confidence: 0.75,
      actionable: false,
      marketAspect: "trend",
    },
  ]),
}));

vi.mock("../subAgents/marketingAgent", () => ({
  runMarketingResearch: vi.fn(async (subQuery) => [
    {
      id: `mrk-${subQuery.id}-1`,
      subQueryId: subQuery.id,
      domain: "marketing",
      insight: { he: "ממצא שיווקי", en: "Marketing finding" },
      evidence: "Best practice data",
      sources: [],
      confidence: 0.8,
      actionable: true,
      recommendation: { he: "המלצה", en: "Recommendation" },
      marketingAspect: "channel",
    },
  ]),
}));

// ── Mock parseLLMJson ─────────────────────────────────────────────────────
vi.mock("@/engine/blackboard/llmAgent", () => ({
  parseLLMJson: vi.fn((raw: string) => JSON.parse(raw)),
}));

// ── Mock fetch (for LLM calls in orchestrator) ────────────────────────────
const mockDecompositionResponse = [
  { domain: "regulatory", question: "What are Israeli advertising regulations?", keywords: ["regulation", "advertising"] },
  { domain: "market", question: "Who are the main competitors?", keywords: ["competitors", "market"] },
  { domain: "marketing", question: "Which channels are most effective?", keywords: ["channels", "digital"] },
];

const mockSynthesisResponse = {
  summary_he: "סיכום כולל",
  summary_en: "Overall summary of findings",
  crossDomainInsights: [
    { he: "תובנה חוצת תחומים", en: "Cross-domain insight" },
  ],
  strategicRecommendations: [
    {
      priority: "high",
      recommendation_he: "המלצה בעדיפות גבוהה",
      recommendation_en: "High priority recommendation",
    },
  ],
  overallConfidence: 0.8,
};

vi.stubGlobal("fetch", vi.fn()
  .mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ text: JSON.stringify(mockDecompositionResponse) }),
  })
  .mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ text: JSON.stringify(mockSynthesisResponse) }),
  })
);

// ── Helpers ───────────────────────────────────────────────────────────────
function makeResearchQuery(overrides: Partial<ResearchQuery> = {}): ResearchQuery {
  return {
    id: "q-test-1",
    question: "How should I market my SaaS product in Israel?",
    domain: "marketing",
    context: {
      industry: "tech",
      audienceType: "b2c",
      mainGoal: "sales",
      country: "IL",
    },
    priority: "high",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("runResearch", () => {
  beforeEach(() => {
    vi.mocked(fetch).mockClear();
  });

  // ── Session structure ─────────────────────────────────────────────────────
  describe("Session structure", () => {
    it("returns a ResearchSession object", async () => {
      // Re-setup mocks for each test
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: JSON.stringify(mockDecompositionResponse) }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: JSON.stringify(mockSynthesisResponse) }),
        } as any);

      const session = await runResearch(makeResearchQuery());

      expect(session).toBeDefined();
      expect(session.query).toBeDefined();
    });

    it("session has required top-level fields", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: JSON.stringify(mockDecompositionResponse) }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: JSON.stringify(mockSynthesisResponse) }),
        } as any);

      const session = await runResearch(makeResearchQuery());

      expect(session).toHaveProperty("query");
      expect(session).toHaveProperty("subQueries");
      expect(session).toHaveProperty("findings");
      expect(session).toHaveProperty("synthesis");
      expect(session).toHaveProperty("status");
      expect(session).toHaveProperty("progress");
      expect(session).toHaveProperty("startedAt");
    });

    it("session.query matches the input query", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: JSON.stringify(mockDecompositionResponse) }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: JSON.stringify(mockSynthesisResponse) }),
        } as any);

      const query = makeResearchQuery();
      const session = await runResearch(query);

      expect(session.query.id).toBe(query.id);
      expect(session.query.question).toBe(query.question);
    });
  });

  // ── Status progression ────────────────────────────────────────────────────
  describe("Status progression", () => {
    it("completes with status 'complete' on success", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: JSON.stringify(mockDecompositionResponse) }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: JSON.stringify(mockSynthesisResponse) }),
        } as any);

      const session = await runResearch(makeResearchQuery());

      expect(session.status).toBe("complete");
    });

    it("progress is 100 on successful completion", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: JSON.stringify(mockDecompositionResponse) }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: JSON.stringify(mockSynthesisResponse) }),
        } as any);

      const session = await runResearch(makeResearchQuery());

      expect(session.progress).toBe(100);
    });

    it("completedAt is set on success", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: JSON.stringify(mockDecompositionResponse) }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: JSON.stringify(mockSynthesisResponse) }),
        } as any);

      const session = await runResearch(makeResearchQuery());

      expect(session.completedAt).toBeDefined();
      expect(session.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ── Progress callback ─────────────────────────────────────────────────────
  describe("Progress callback", () => {
    it("calls onProgress multiple times during pipeline", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: JSON.stringify(mockDecompositionResponse) }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: JSON.stringify(mockSynthesisResponse) }),
        } as any);

      const progressCallback = vi.fn();
      await runResearch(makeResearchQuery(), progressCallback);

      expect(progressCallback).toHaveBeenCalledTimes(expect.any(Number));
      expect(progressCallback.mock.calls.length).toBeGreaterThan(2);
    });

    it("final callback has status 'complete'", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: JSON.stringify(mockDecompositionResponse) }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: JSON.stringify(mockSynthesisResponse) }),
        } as any);

      const progressSessions: ResearchSession[] = [];
      await runResearch(makeResearchQuery(), (s) => progressSessions.push(s));

      const finalSession = progressSessions[progressSessions.length - 1];
      expect(finalSession.status).toBe("complete");
    });

    it("first callback has status 'decomposing'", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: JSON.stringify(mockDecompositionResponse) }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: JSON.stringify(mockSynthesisResponse) }),
        } as any);

      const progressSessions: ResearchSession[] = [];
      await runResearch(makeResearchQuery(), (s) => progressSessions.push(s));

      const firstSession = progressSessions[0];
      expect(firstSession.status).toBe("decomposing");
    });
  });

  // ── Error handling ────────────────────────────────────────────────────────
  describe("Error handling", () => {
    it("sets status to 'error' when LLM fetch fails", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network failure"));

      const session = await runResearch(makeResearchQuery());

      expect(session.status).toBe("error");
    });

    it("sets error message on failure", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("LLM unavailable"));

      const session = await runResearch(makeResearchQuery());

      expect(session.error).toBeDefined();
      expect(typeof session.error).toBe("string");
    });

    it("sets status to 'error' when fetch returns non-ok response", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
        json: () => Promise.resolve({ error: "Bad request" }),
      } as any);

      const session = await runResearch(makeResearchQuery());

      expect(session.status).toBe("error");
    });
  });

  // ── startedAt ────────────────────────────────────────────────────────────
  describe("Session timestamps", () => {
    it("startedAt is an ISO timestamp string", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: JSON.stringify(mockDecompositionResponse) }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: JSON.stringify(mockSynthesisResponse) }),
        } as any);

      const session = await runResearch(makeResearchQuery());

      expect(session.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
