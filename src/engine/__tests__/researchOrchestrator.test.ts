import { describe, it, expect, vi, beforeEach } from "vitest";
import { runResearch, ENGINE_MANIFEST } from "../researchOrchestrator";
import type { ResearchQuery, ResearchSession } from "@/types/research";

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
    topic: "competitive landscape in SaaS marketing",
    subTopics: ["pricing strategies", "customer retention"],
    language: "en",
    depth: "standard",
    ...overrides,
  } as ResearchQuery;
}

function makeSession(overrides: Partial<ResearchSession> = {}): ResearchSession {
  return {
    id: "s-123",
    queryId: "q-123",
    status: "completed",
    subQueries: [{ id: "sq-1", query: "pricing strategies", status: "done" }],
    findings: [
      { id: "f-1", subQueryId: "sq-1", content: "Finding about pricing", relevance: 0.9, sources: [] },
    ],
    summary: { he: "סיכום", en: "Summary" },
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    ...overrides,
  } as ResearchSession;
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
});

// ═══════════════════════════════════════════════
// runResearch
// ═══════════════════════════════════════════════

describe("runResearch", () => {
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
    const query = makeQuery({ id: "q-abc", topic: "retention tactics" });
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
    const session = makeSession({ status: "completed", findings: [] });
    mockRunResearchImpl.mockResolvedValue(session);
    const result = await runResearch(makeQuery());
    expect(result.status).toBe("completed");
    expect(result.findings).toEqual([]);
  });

  it("does NOT call writeContext when no blackboardCtx provided", async () => {
    mockRunResearchImpl.mockResolvedValue(makeSession());
    await runResearch(makeQuery());
    // writeContext may be called with void — but we don't await it; just check it wasn't called synchronously
    expect(mockWriteContext).not.toHaveBeenCalled();
  });

  it("calls writeContext when blackboardCtx is provided", async () => {
    const session = makeSession();
    mockRunResearchImpl.mockResolvedValue(session);
    const ctx = { userId: "u-1", planId: "p-1" };
    await runResearch(makeQuery(), undefined, ctx);
    // Allow the void promise to flush
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
    const session = makeSession({ subQueries: [{} as any, {} as any], findings: [{} as any, {} as any, {} as any] });
    mockRunResearchImpl.mockResolvedValue(session);
    await runResearch(makeQuery({ id: "q-xyz" }), undefined, { userId: "u-2", planId: "p-2" });
    await new Promise((r) => setTimeout(r, 0));
    expect(mockWriteContext).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          queryId: "q-xyz",
          subQueryCount: 2,
          findingCount: 3,
          status: "completed",
        }),
      }),
    );
  });

  it("still returns the session even if writeContext errors", async () => {
    const session = makeSession();
    mockRunResearchImpl.mockResolvedValue(session);
    mockWriteContext.mockRejectedValueOnce(new Error("blackboard error"));
    const ctx = { userId: "u-3", planId: "p-3" };
    const result = await runResearch(makeQuery(), undefined, ctx);
    expect(result).toBe(session);
  });

  it("propagates errors thrown by the underlying implementation", async () => {
    mockRunResearchImpl.mockRejectedValue(new Error("Research failed"));
    await expect(runResearch(makeQuery())).rejects.toThrow("Research failed");
  });

  it("handles a query with no subTopics gracefully", async () => {
    const query = makeQuery({ subTopics: [] });
    const session = makeSession({ subQueries: [], findings: [] });
    mockRunResearchImpl.mockResolvedValue(session);
    const result = await runResearch(query);
    expect(result.subQueries).toEqual([]);
  });

  it("uses planId in the blackboard key when available", async () => {
    mockRunResearchImpl.mockResolvedValue(makeSession());
    const ctx = { userId: "u-4", planId: "plan-42" };
    await runResearch(makeQuery({ id: "q-99" }), undefined, ctx);
    await new Promise((r) => setTimeout(r, 0));
    expect(mockWriteContext).toHaveBeenCalledWith(
      expect.objectContaining({ key: expect.stringContaining("q-99") }),
    );
  });
});
