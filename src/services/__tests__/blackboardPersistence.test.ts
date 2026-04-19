import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Supabase mock ─────────────────────────────────────────────────────────

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();
const mockGte = vi.fn();

// Chain builder helpers
function chainFrom() {
  return {
    insert: mockInsert,
    select: mockSelect,
    eq: mockEq,
  };
}

vi.mock("@/integrations/supabase/loose", () => ({
  supabaseLoose: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
          single: mockSingle,
          gte: vi.fn(() => ({
            eq: vi.fn(() => ({
              // data placeholder
            })),
          })),
        })),
      })),
    })),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Module under test ─────────────────────────────────────────────────────

import {
  saveBlackboardSnapshot,
  loadBlackboardSnapshot,
  enqueueAgentTask,
  getAgentTaskStatus,
  logAgentEvent,
  getMonthlyAgentCost,
} from "../blackboardPersistence";
import { supabaseLoose as supabase } from "@/integrations/supabase/loose";
import { logger } from "@/lib/logger";

// Helpers to control the supabase mock chain
function mockSupabaseFrom(returnValue: { data?: unknown; error?: unknown }) {
  const singleFn = vi.fn().mockResolvedValue(returnValue);

  const insertSpy = vi.fn(() => ({
    select: vi.fn(() => ({ single: singleFn })),
  }));

  const selectSpy = vi.fn(() => ({
    eq: vi.fn(() => ({
      order: vi.fn(() => ({ limit: vi.fn(() => ({ single: singleFn })) })),
      single: singleFn,
      gte: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue(returnValue),
      })),
    })),
  }));

  vi.mocked(supabase.from).mockReturnValue({
    insert: insertSpy,
    select: selectSpy,
  } as never);

  return { singleFn, insertSpy, selectSpy };
}

describe("blackboardPersistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── saveBlackboardSnapshot ────────────────────────────────────────────

  describe("saveBlackboardSnapshot", () => {
    it("returns the id on success", async () => {
      mockSupabaseFrom({ data: { id: "snap-123" }, error: null });

      const id = await saveBlackboardSnapshot("plan-1", { completedAgents: [], errors: [] } as never);
      expect(id).toBe("snap-123");
    });

    it("returns null and logs on error", async () => {
      mockSupabaseFrom({ data: null, error: { message: "DB error" } });

      const id = await saveBlackboardSnapshot("plan-1", { completedAgents: [], errors: [] } as never);
      expect(id).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "blackboardPersistence.saveSnapshot",
        expect.anything(),
      );
    });

    it("passes executionResult fields when provided", async () => {
      const { insertSpy } = mockSupabaseFrom({ data: { id: "snap-456" }, error: null });

      await saveBlackboardSnapshot(
        "plan-2",
        { completedAgents: ["a"], errors: [] } as never,
        { totalTokensUsed: 100, totalCostNIS: 0.5, durationMs: 2000 } as never,
      );

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          total_tokens_used: 100,
          total_cost_nis: 0.5,
          duration_ms: 2000,
        }),
      );
    });

    it("defaults numeric fields to 0 when executionResult is absent", async () => {
      const { insertSpy } = mockSupabaseFrom({ data: { id: "snap-789" }, error: null });

      await saveBlackboardSnapshot("plan-3", { completedAgents: [], errors: [] } as never);

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          total_tokens_used: 0,
          total_cost_nis: 0,
        }),
      );
    });
  });

  // ── loadBlackboardSnapshot ────────────────────────────────────────────

  describe("loadBlackboardSnapshot", () => {
    it("returns mapped snapshot on success", async () => {
      const row = {
        id: "snap-1",
        plan_id: "plan-A",
        state: {},
        completed_agents: ["agentX"],
        errors: [],
        execution_meta: null,
        total_tokens_used: 42,
        total_cost_nis: 1.5,
        duration_ms: 3000,
        created_at: "2024-01-01T00:00:00.000Z",
      };
      mockSupabaseFrom({ data: row, error: null });

      const snap = await loadBlackboardSnapshot("plan-A");
      expect(snap).not.toBeNull();
      expect(snap!.id).toBe("snap-1");
      expect(snap!.planId).toBe("plan-A");
      expect(snap!.completedAgents).toEqual(["agentX"]);
      expect(snap!.totalTokensUsed).toBe(42);
    });

    it("returns null when there is an error", async () => {
      mockSupabaseFrom({ data: null, error: { message: "not found" } });

      const snap = await loadBlackboardSnapshot("missing-plan");
      expect(snap).toBeNull();
    });

    it("returns null when data is null", async () => {
      mockSupabaseFrom({ data: null, error: null });

      const snap = await loadBlackboardSnapshot("plan-B");
      expect(snap).toBeNull();
    });
  });

  // ── enqueueAgentTask ─────────────────────────────────────────────────

  describe("enqueueAgentTask", () => {
    it("returns the task id on success", async () => {
      mockSupabaseFrom({ data: { id: "task-999" }, error: null });

      const id = await enqueueAgentTask("myAgent", { key: "val" }, "user-1");
      expect(id).toBe("task-999");
    });

    it("returns null and logs on error", async () => {
      mockSupabaseFrom({ data: null, error: { message: "insert failed" } });

      const id = await enqueueAgentTask("myAgent", {}, "user-1");
      expect(id).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "blackboardPersistence.enqueueTask",
        expect.anything(),
      );
    });

    it("includes planId in the inserted row when provided", async () => {
      const { insertSpy } = mockSupabaseFrom({ data: { id: "task-1" }, error: null });

      await enqueueAgentTask("agent", {}, "user-X", "plan-Z");

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ plan_id: "plan-Z" }),
      );
    });

    it("passes null for plan_id when planId is omitted", async () => {
      const { insertSpy } = mockSupabaseFrom({ data: { id: "task-2" }, error: null });

      await enqueueAgentTask("agent", {}, "user-X");

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ plan_id: null }),
      );
    });
  });

  // ── getAgentTaskStatus ────────────────────────────────────────────────

  describe("getAgentTaskStatus", () => {
    it("returns mapped task on success", async () => {
      const row = {
        id: "task-111",
        agent_name: "testAgent",
        status: "completed",
        input: { x: 1 },
        output: { y: 2 },
        error: null,
        confidence: 0.9,
        tokens_used: 50,
        cost_nis: 0.1,
        retry_count: 0,
        created_at: "2024-01-01T00:00:00.000Z",
      };
      mockSupabaseFrom({ data: row, error: null });

      const task = await getAgentTaskStatus("task-111");
      expect(task).not.toBeNull();
      expect(task!.id).toBe("task-111");
      expect(task!.agentName).toBe("testAgent");
      expect(task!.status).toBe("completed");
      expect(task!.confidence).toBe(0.9);
    });

    it("returns null when there is an error", async () => {
      mockSupabaseFrom({ data: null, error: { message: "not found" } });

      const task = await getAgentTaskStatus("missing-task");
      expect(task).toBeNull();
    });
  });

  // ── logAgentEvent ─────────────────────────────────────────────────────

  describe("logAgentEvent", () => {
    it("does not throw on successful insert", async () => {
      // Mock the insert chain for event log
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      } as never);

      await expect(
        logAgentEvent("task-1", "session-1", "myAgent", "started"),
      ).resolves.toBeUndefined();
    });

    it("logs error when insert fails", async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: { message: "write failed" } }),
      } as never);

      await logAgentEvent("task-1", "session-1", "myAgent", "failed");

      expect(logger.error).toHaveBeenCalledWith(
        "blackboardPersistence.logAgentEvent",
        expect.anything(),
      );
    });

    it("accepts null taskId", async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      } as never);

      await expect(
        logAgentEvent(null, "session-1", "myAgent", "completed"),
      ).resolves.toBeUndefined();
    });
  });

  // ── getMonthlyAgentCost ───────────────────────────────────────────────

  describe("getMonthlyAgentCost", () => {
    it("sums cost_nis values for the user", async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [{ cost_nis: 1.5 }, { cost_nis: 2.0 }],
                error: null,
              }),
            })),
          })),
        })),
      } as never);

      const cost = await getMonthlyAgentCost("user-1");
      expect(cost).toBeCloseTo(3.5);
    });

    it("returns 0 on error", async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null, error: { message: "err" } }),
            })),
          })),
        })),
      } as never);

      const cost = await getMonthlyAgentCost("user-1");
      expect(cost).toBe(0);
    });

    it("returns 0 when data is empty array", async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
        })),
      } as never);

      const cost = await getMonthlyAgentCost("user-1");
      expect(cost).toBe(0);
    });
  });
});
