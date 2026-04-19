import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Supabase mock ─────────────────────────────────────────────────────────

const mockInvoke = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
      update: mockUpdate,
    })),
    functions: {
      invoke: mockInvoke,
    },
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock("./logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

// ── Module under test ─────────────────────────────────────────────────────

import { runAgent, buildCopyPrompt } from "../agentOrchestrator";
import type { RunAgentParams } from "../agentOrchestrator";

// ── Helpers ───────────────────────────────────────────────────────────────

function makeParams(overrides: Partial<RunAgentParams> = {}): RunAgentParams {
  return {
    userId: "user-1",
    planId: "plan-1",
    prompt: "Write a headline",
    ...overrides,
  };
}

/**
 * Set up a fake Realtime channel that fires CHANNEL_ERROR immediately
 * so waitForCompletionEvent resolves without a real timeout.
 */
function mockChannelError() {
  mockChannel.mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((cb: (status: string) => void) => {
      cb("CHANNEL_ERROR");
      return { unsubscribe: vi.fn() };
    }),
  });
  mockRemoveChannel.mockResolvedValue(undefined);
}

/**
 * Set up the agent_tasks insert chain to return taskId or null.
 */
function mockInsertTask(taskId: string | null, error = false) {
  const maybeSingle = vi.fn().mockResolvedValue(
    error
      ? { data: null, error: { message: "insert failed" } }
      : { data: taskId ? { id: taskId } : null, error: null },
  );
  mockInsert.mockReturnValue({
    select: vi.fn(() => ({ maybeSingle })),
  });

  // Also mock update chain
  mockUpdate.mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
}

describe("agentOrchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChannelError(); // default: Realtime not available
  });

  // ── buildCopyPrompt ───────────────────────────────────────────────────

  describe("buildCopyPrompt", () => {
    it("includes product description when provided", () => {
      const prompt = buildCopyPrompt({ productDescription: "A cool SaaS tool" });
      expect(prompt).toContain("Product: A cool SaaS tool");
    });

    it("includes main goal when provided", () => {
      const prompt = buildCopyPrompt({ mainGoal: "leads" });
      expect(prompt).toContain("Goal: leads");
    });

    it("includes business field when provided", () => {
      const prompt = buildCopyPrompt({ businessField: "tech" });
      expect(prompt).toContain("Industry: tech");
    });

    it("always ends with the Hebrew headline instruction", () => {
      const prompt = buildCopyPrompt({});
      expect(prompt).toContain("Hebrew");
    });

    it("handles all fields together", () => {
      const prompt = buildCopyPrompt({
        productDescription: "My product",
        mainGoal: "sales",
        businessField: "fashion",
      });
      expect(prompt).toContain("Product: My product");
      expect(prompt).toContain("Goal: sales");
      expect(prompt).toContain("Industry: fashion");
    });

    it("omits empty fields", () => {
      const prompt = buildCopyPrompt({ productDescription: "" });
      expect(prompt).not.toContain("Product:");
    });
  });

  // ── runAgent ──────────────────────────────────────────────────────────

  describe("runAgent", () => {
    it("returns completed status with output on success", async () => {
      mockInsertTask("task-abc");
      mockInvoke.mockResolvedValue({ data: { output: "Generated headline" }, error: null });

      const result = await runAgent(makeParams());

      expect(result.status).toBe("completed");
      expect(result.output).toBe("Generated headline");
      expect(result.taskId).toBe("task-abc");
    });

    it("falls back to data.text when output is missing", async () => {
      mockInsertTask("task-text");
      mockInvoke.mockResolvedValue({ data: { text: "Text output" }, error: null });

      const result = await runAgent(makeParams());
      expect(result.output).toBe("Text output");
    });

    it("returns failed status when invoke errors", async () => {
      mockInsertTask("task-fail");
      mockInvoke.mockResolvedValue({ data: null, error: { message: "agent failed" } });

      const result = await runAgent(makeParams());
      expect(result.status).toBe("failed");
      expect(result.error).toBe("agent failed");
      expect(result.output).toBe("");
    });

    it("returns failed status when invoke throws", async () => {
      mockInsertTask("task-throw");
      mockInvoke.mockRejectedValue(new Error("network error"));

      const result = await runAgent(makeParams());
      expect(result.status).toBe("failed");
      expect(result.error).toBe("network error");
    });

    it("still returns a result when task insertion fails (null taskId)", async () => {
      mockInsertTask(null);
      mockInvoke.mockResolvedValue({ data: { output: "ok" }, error: null });

      const result = await runAgent(makeParams());
      expect(result.status).toBe("completed");
      expect(result.output).toBe("ok");
    });

    it("invokes agent-executor with correct default parameters", async () => {
      mockInsertTask("task-defaults");
      mockInvoke.mockResolvedValue({ data: { output: "out" }, error: null });

      await runAgent(makeParams({ model: undefined, maxTokens: undefined }));

      expect(mockInvoke).toHaveBeenCalledWith("agent-executor", expect.objectContaining({
        body: expect.objectContaining({
          model: "claude-sonnet-4-6",
          maxTokens: 1024,
          temperature: 0.7,
        }),
      }));
    });

    it("passes custom model and maxTokens to invoke", async () => {
      mockInsertTask("task-custom");
      mockInvoke.mockResolvedValue({ data: { output: "out" }, error: null });

      await runAgent(makeParams({ model: "claude-opus-4", maxTokens: 2048, temperature: 0.5 }));

      expect(mockInvoke).toHaveBeenCalledWith("agent-executor", expect.objectContaining({
        body: expect.objectContaining({
          model: "claude-opus-4",
          maxTokens: 2048,
          temperature: 0.5,
        }),
      }));
    });

    it("timeout status when both eventOutput and directOutput are falsy", async () => {
      // The channel error causes waitForCompletionEvent to resolve null
      // and invoke returns empty output
      mockInsertTask("task-timeout");
      mockInvoke.mockResolvedValue({ data: { output: "" }, error: null });

      const result = await runAgent(makeParams());
      expect(result.status).toBe("timeout");
    });
  });
});
