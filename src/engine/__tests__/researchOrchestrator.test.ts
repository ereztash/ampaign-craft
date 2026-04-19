import { describe, it, expect, vi, beforeEach } from "vitest";
import { runResearch, ENGINE_MANIFEST } from "../researchOrchestrator";
import type { ResearchQuery, ResearchSession, ResearchFinding, SubQuery } from "@/types/research";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../research/researchOrchestrator", () => ({
  runResearch: vi.fn(),
}));

vi.mock("../blackboard/contract", () => ({
  writeContext: vi.fn(async () => {}),
  conceptKey: vi.fn((ns: string, type: string, id: string) => `${ns}-${type}-${id}`),
}));

import { runResearch as runResearchImpl } from "../research/researchOrchestrator";
import { writeContext } from "../blackboard/contract";

const mockRunResearchImpl = runResearchImpl as ReturnType<typeof vi.fn>;
const mockWriteContext    = writeContext as ReturnType<typeof vi.fn>;

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeQuery(overrides: Partial<ResearchQuery> = {}): ResearchQuery {
  return {
    id: "q-123",
    question: "What is the competitive landscape for SaaS marketing tools in Israel?",
    domain: "market",
    context: {
      industry: "tech",
      audienceType: "b2b",
      mainGoal: "sales",
      country: "IL",
    },
    priority: "high",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeSubQuery(overrides: Partial<SubQuery> = {}): SubQuery {
  return {
    id: "sq-1",
    parentId: "q-123",
    domain: "market",
    question: "Who are the main competitors?",
    keywords: ["saas", "marketing", "Israel"],
    ...overrides,
  };
}

function makeFinding(overrides: Partial<ResearchFinding> = {}): ResearchFinding {
  return {
    id: "f-1",
    subQueryId: "sq-1",
    domain: "market",
    insight: { he: "תחרות גבוהה", en: "High competition" },
    evidence: "Multiple players in the market",
    sources: [],
    confidence: 0.85,
    actionable: true,
    ...overrides,
  };
}

function makeSession(overrides: Partial<ResearchSession> = {}): ResearchSession {
  return {
    query: makeQuery(),
    subQueries: [makeSubQuery()],
    findings: [makeFinding()],
    synthesis: null,
    status: "complete",
    progress: 100,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════
// ENGINE_MANIFEST
// ═══════════════════════════════════════════════

describe("ENGINE_MANIFEST", () => {
  it("has the correct name", () => {
    expect(ENGINE_MANIFEST.name).toBe("researchOrchestrator");
  });

  it("reads from USER-research-* keys", () => {
    expect(ENGINE_MANIFEST.reads).toContain("USER-research-*");
  });

  it("writes to USER-research-* keys", () => {
    expect(ENGINE_MANIFEST.writes).toContain("USER-research-*");
  });

  it("stage is diagnose", () => {
    expect(ENGINE_MANIFEST.stage).toBe("diagnose");
  });

  it("isLive is true", () => {
    expect(ENGINE_MANIFEST.isLive).toBe(true);
  });

  it("parameters array is non-empty", () => {
    expect(ENGINE_MANIFEST.parameters.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════
// runResearch — Core delegation
// ═══════════════════════════════════════════════

describe("runResearch — delegation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to the underlying runResearch implementation", async () => {
    const session = makeSession();
    mockRunResearchImpl.mockResolvedValue(session);
    const result = await runResearch(makeQuery());
    expect(mockRunResearchImpl).toHaveBeenCalledTimes(1);
    expect(result).toBe(session);
  });

  it("passes the query to the implementation", async () => {
    const query = makeQuery({ id: "q-abc" });
    mockRunResearchImpl.mockResolvedValue(makeSession());
    await runResearch(query);
    expect(mockRunResearchImpl).toHaveBeenCalledWith(query, undefined);
  });

  it("passes the onProgress callback to the implementation", async () => {
    const onProgress = vi.fn();
    mockRunResearchImpl.mockResolvedValue(makeSession());
    await runResearch(makeQuery(), onProgress);
    expect(mockRunResearchImpl).toHaveBeenCalledWith(expect.anything(), onProgress);
  });

  it("returns the session returned by the implementation", async () => {
    const session = makeSession({ status: "complete", findings: [] });
    mockRunResearchImpl.mockResolvedValue(session);
    const result = await runResearch(makeQuery());
    expect(result.status).toBe("complete");
    expect(result.findings).toEqual([]);
  });

  it("propagates errors thrown by the underlying implementation", async () => {
    mockRunResearchImpl.mockRejectedValue(new Error("Research failed"));
    await expect(runResearch(makeQuery())).rejects.toThrow("Research failed");
  });

  it("handles session with multiple sub-queries and findings", async () => {
    const session = makeSession({
      subQueries: [makeSubQuery(), makeSubQuery({ id: "sq-2" })],
      findings: [makeFinding(), makeFinding({ id: "f-2" }), makeFinding({ id: "f-3" })],
    });
    mockRunResearchImpl.mockResolvedValue(session);
    const result = await runResearch(makeQuery());
    expect(result.subQueries.length).toBe(2);
    expect(result.findings.length).toBe(3);
  });
});

// ═══════════════════════════════════════════════
// runResearch — Blackboard integration
// ═══════════════════════════════════════════════

describe("runResearch — blackboard integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does NOT call writeContext when no blackboardCtx provided", async () => {
    mockRunResearchImpl.mockResolvedValue(makeSession());
    await runResearch(makeQuery());
    await new Promise((r) => setTimeout(r, 0));
    expect(mockWriteContext).not.toHaveBeenCalled();
  });

  it("calls writeContext when blackboardCtx is provided", async () => {
    const session = makeSession();
    mockRunResearchImpl.mockResolvedValue(session);
    const ctx = { userId: "u-1", planId: "p-1" };
    await runResearch(makeQuery(), undefined, ctx);
    await new Promise((r) => setTimeout(r, 0));
    expect(mockWriteContext).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u-1",
        planId: "p-1",
        writtenBy: ENGINE_MANIFEST.name,
        stage: "diagnose",
      }),
    );
  });

  it("writes queryId, subQueryCount, findingCount, status to the blackboard payload", async () => {
    const session = makeSession({
      query: makeQuery({ id: "q-xyz" }),
      subQueries: [makeSubQuery(), makeSubQuery({ id: "sq-2" })],
      findings: [makeFinding(), makeFinding({ id: "f-2" }), makeFinding({ id: "f-3" })],
      status: "complete",
    });
    mockRunResearchImpl.mockResolvedValue(session);
    await runResearch(makeQuery({ id: "q-xyz" }), undefined, { userId: "u-2", planId: "p-2" });
    await new Promise((r) => setTimeout(r, 0));
    expect(mockWriteContext).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          queryId: "q-xyz",
          subQueryCount: 2,
          findingCount: 3,
          status: "complete",
        }),
      }),
    );
  });

  it("still returns the session even if writeContext rejects", async () => {
    const session = makeSession();
    mockRunResearchImpl.mockResolvedValue(session);
    mockWriteContext.mockRejectedValueOnce(new Error("blackboard error"));
    const ctx = { userId: "u-3", planId: "p-3" };
    const result = await runResearch(makeQuery(), undefined, ctx);
    expect(result).toBe(session);
  });

  it("uses planId in the blackboard context", async () => {
    mockRunResearchImpl.mockResolvedValue(makeSession());
    const ctx = { userId: "u-4", planId: "plan-42" };
    await runResearch(makeQuery({ id: "q-99" }), undefined, ctx);
    await new Promise((r) => setTimeout(r, 0));
    expect(mockWriteContext).toHaveBeenCalledWith(
      expect.objectContaining({ planId: "plan-42" }),
    );
  });
});

// ═══════════════════════════════════════════════
// runResearch — Edge cases
// ═══════════════════════════════════════════════

describe("runResearch — edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles a session with no subQueries and no findings", async () => {
    const session = makeSession({ subQueries: [], findings: [] });
    mockRunResearchImpl.mockResolvedValue(session);
    const result = await runResearch(makeQuery());
    expect(result.subQueries.length).toBe(0);
    expect(result.findings.length).toBe(0);
  });

  it("handles error status session", async () => {
    const session = makeSession({ status: "error", error: "LLM timeout", progress: 50 });
    mockRunResearchImpl.mockResolvedValue(session);
    const result = await runResearch(makeQuery());
    expect(result.status).toBe("error");
  });

  it("handles regulatory domain query", async () => {
    const query = makeQuery({ domain: "regulatory" });
    const session = makeSession({ query });
    mockRunResearchImpl.mockResolvedValue(session);
    const result = await runResearch(query);
    expect(result.query.domain).toBe("regulatory");
  });

  it("handles marketing domain query", async () => {
    const query = makeQuery({ domain: "marketing" });
    const session = makeSession({ query });
    mockRunResearchImpl.mockResolvedValue(session);
    const result = await runResearch(query);
    expect(result.query.domain).toBe("marketing");
  });

  it("low-priority query is still processed", async () => {
    const query = makeQuery({ priority: "low" });
    mockRunResearchImpl.mockResolvedValue(makeSession({ query }));
    const result = await runResearch(query);
    expect(result.query.priority).toBe("low");
  });
});
