import { describe, it, expect, vi, beforeEach } from "vitest";
import { Blackboard } from "../blackboard";
import type { QAFinding } from "@/types/qa";
import type { FormData } from "@/types/funnel";

// Mock global fetch — debugSwarm calls fetch("/api/growth/agent-executor")
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after global stub
import { runDebugSwarm } from "../blackboard/agents/debugSwarm";
import type { DebugSwarmResult } from "../blackboard/agents/debugSwarm";

function makeBoard(): Blackboard {
  const board = new Blackboard();
  board.set("formData", {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45],
    interests: "marketing",
    productDescription: "SaaS platform for marketing automation",
    averagePrice: 200,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook"],
    experienceLevel: "intermediate",
  } as FormData);
  return board;
}

function makeFinding(overrides: Partial<QAFinding> = {}): QAFinding {
  return {
    id: "test-1",
    category: "budget",
    severity: "warning",
    message: { he: "בעיה", en: "Budget issue" },
    autoFixable: false,
    ...overrides,
  };
}

function makeFetchResponse(body: Record<string, unknown>): Response {
  return {
    ok: true,
    json: async () => body,
    status: 200,
    statusText: "OK",
  } as unknown as Response;
}

// Simulate LLM responses for the three agents (analyzer → proposer → critique cycle)
function mockLLMResponses(
  analysis: Record<string, unknown> = {},
  proposal: Record<string, unknown> = {},
  critique: Record<string, unknown> = {}
) {
  let callCount = 0;
  mockFetch.mockImplementation(async () => {
    callCount++;
    const phase = ((callCount - 1) % 3) + 1;

    if (phase === 1) {
      return makeFetchResponse({
        text: JSON.stringify({
          findingId: "test-1",
          rootCause: "Budget percentages don't sum to 100%",
          affectedSections: ["stages"],
          complexity: "trivial",
          ...analysis,
        }),
      });
    } else if (phase === 2) {
      return makeFetchResponse({
        text: JSON.stringify({
          findingId: "test-1",
          description: { he: "תיקון תקציב", en: "Fix budget" },
          changes: [
            {
              target: "stages[0].budgetPercent",
              action: "update",
              proposedValue: "50",
              rationale: "Rebalance budget",
            },
          ],
          confidence: 0.85,
          ...proposal,
        }),
      });
    } else {
      return makeFetchResponse({
        text: JSON.stringify({
          findingId: "test-1",
          approved: true,
          confidence: 0.9,
          concerns: [],
          verdict: "Fix is correct and minimal",
          ...critique,
        }),
      });
    }
  });
}

// ═══════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════

describe("debugSwarm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes a single finding through all three agents", async () => {
    const board = makeBoard();
    mockLLMResponses();

    const findings = [makeFinding()];
    const result = await runDebugSwarm(board, findings);

    expect(result.totalIterations).toBe(1);
    expect(result.iterations).toHaveLength(1);
    expect(result.resolvedFindings).toContain("test-1");

    const iter = result.iterations[0];
    expect(iter.analysis.rootCause).toBeTruthy();
    expect(iter.proposal.changes.length).toBeGreaterThan(0);
    expect(iter.critique.approved).toBe(true);
    expect(iter.resolved).toBe(true);

    // 3 fetch calls: analyzer + proposer + critique
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("marks finding as unresolved when critique rejects proposal", async () => {
    const board = makeBoard();
    mockLLMResponses({}, {}, { approved: false, confidence: 0.4 });

    const findings = [makeFinding()];
    const result = await runDebugSwarm(board, findings);

    expect(result.unresolvedFindings).toContain("test-1");
    expect(result.resolvedFindings).toHaveLength(0);
  });

  it("skips info-severity findings", async () => {
    const board = makeBoard();
    mockLLMResponses();

    const findings = [
      makeFinding({ id: "info-1", severity: "info" }),
      makeFinding({ id: "warn-1", severity: "warning" }),
    ];
    const result = await runDebugSwarm(board, findings);

    // Only the warning should be processed
    expect(result.totalIterations).toBe(1);
    expect(result.iterations[0].findingId).toBe("warn-1");
  });

  it("processes multiple findings sequentially", async () => {
    const board = makeBoard();
    let callCount = 0;
    mockFetch.mockImplementation(async () => {
      callCount++;
      const findingNum = Math.ceil(callCount / 3);
      const phase = ((callCount - 1) % 3) + 1;
      const fid = `finding-${findingNum}`;

      if (phase === 1) {
        return makeFetchResponse({ text: JSON.stringify({ findingId: fid, rootCause: "cause", affectedSections: [], complexity: "trivial" }) });
      } else if (phase === 2) {
        return makeFetchResponse({ text: JSON.stringify({ findingId: fid, description: { he: "x", en: "x" }, changes: [{ target: "a", action: "update", proposedValue: "b", rationale: "c" }], confidence: 0.9 }) });
      } else {
        return makeFetchResponse({ text: JSON.stringify({ findingId: fid, approved: true, confidence: 0.9, concerns: [], verdict: "ok" }) });
      }
    });

    const findings = [
      makeFinding({ id: "finding-1", severity: "critical" }),
      makeFinding({ id: "finding-2", severity: "warning" }),
    ];
    const result = await runDebugSwarm(board, findings);

    expect(result.totalIterations).toBe(2);
    expect(result.resolvedFindings).toHaveLength(2);
    expect(mockFetch).toHaveBeenCalledTimes(6); // 3 calls per finding
  });

  it("respects circuit breaker max iterations", async () => {
    const board = makeBoard();
    mockLLMResponses();

    const findings = Array.from({ length: 10 }, (_, i) =>
      makeFinding({ id: `f-${i}`, severity: "warning" })
    );

    const result = await runDebugSwarm(board, findings, { maxIterations: 3 });

    // Should stop after 3 iterations due to circuit breaker
    expect(result.totalIterations).toBeLessThanOrEqual(3);
    expect(result.unresolvedFindings.length).toBeGreaterThan(0);
  });

  it("trips circuit breaker on consecutive failures", async () => {
    const board = makeBoard();
    mockFetch.mockRejectedValue(new Error("LLM unavailable"));

    const findings = [
      makeFinding({ id: "f-1", severity: "critical" }),
      makeFinding({ id: "f-2", severity: "critical" }),
      makeFinding({ id: "f-3", severity: "critical" }),
      makeFinding({ id: "f-4", severity: "critical" }),
    ];

    const result = await runDebugSwarm(board, findings);

    expect(result.circuitTripped).toBe(true);
    expect(result.unresolvedFindings.length).toBeGreaterThanOrEqual(1);
  });

  it("handles fetch errors gracefully", async () => {
    const board = makeBoard();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "API rate limit exceeded" }),
      status: 429,
      statusText: "Too Many Requests",
    } as unknown as Response);

    const findings = [makeFinding()];
    const result = await runDebugSwarm(board, findings);

    expect(result.unresolvedFindings).toContain("test-1");
    expect(result.resolvedFindings).toHaveLength(0);
  });

  it("returns empty result for empty findings", async () => {
    const board = makeBoard();
    const result = await runDebugSwarm(board, []);

    expect(result.totalIterations).toBe(0);
    expect(result.resolvedFindings).toHaveLength(0);
    expect(result.unresolvedFindings).toHaveLength(0);
    expect(result.circuitTripped).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns empty result for info-only findings", async () => {
    const board = makeBoard();
    const findings = [
      makeFinding({ id: "i1", severity: "info" }),
      makeFinding({ id: "i2", severity: "info" }),
    ];
    const result = await runDebugSwarm(board, findings);

    expect(result.totalIterations).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("clamps confidence values to 0-1 range", async () => {
    const board = makeBoard();
    mockLLMResponses({}, { confidence: 1.5 }, { confidence: -0.3, approved: true });

    const findings = [makeFinding()];
    const result = await runDebugSwarm(board, findings);

    const iter = result.iterations[0];
    expect(iter.proposal.confidence).toBeLessThanOrEqual(1);
    expect(iter.proposal.confidence).toBeGreaterThanOrEqual(0);
    expect(iter.critique.confidence).toBeLessThanOrEqual(1);
    expect(iter.critique.confidence).toBeGreaterThanOrEqual(0);
  });

  it("provides structured iteration data", async () => {
    const board = makeBoard();
    mockLLMResponses();

    const findings = [makeFinding({ id: "structured-test", severity: "critical" })];
    const result = await runDebugSwarm(board, findings);

    const iter = result.iterations[0];
    expect(iter).toMatchObject({
      iteration: 1,
      findingId: "structured-test",
      analysis: expect.objectContaining({
        findingId: expect.any(String),
        rootCause: expect.any(String),
        affectedSections: expect.any(Array),
        complexity: expect.stringMatching(/trivial|moderate|complex/),
      }),
      proposal: expect.objectContaining({
        findingId: expect.any(String),
        description: expect.objectContaining({ he: expect.any(String), en: expect.any(String) }),
        changes: expect.any(Array),
        confidence: expect.any(Number),
      }),
      critique: expect.objectContaining({
        findingId: expect.any(String),
        approved: expect.any(Boolean),
        confidence: expect.any(Number),
        concerns: expect.any(Array),
        verdict: expect.any(String),
      }),
    });
  });
});
