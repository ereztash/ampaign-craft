import { describe, it, expect, vi, beforeEach } from "vitest";
import { Blackboard } from "../blackboardStore";

vi.mock("../ontologicalVerifier", () => ({
  verifyWrite: vi.fn(({ incoming, current, section }: any) => {
    if (section === "completedAgents") return { ok: false, reason: "restricted_section" };
    if (incoming === null && current !== null) return { ok: false, reason: "null_payload" };
    if (incoming !== null && typeof incoming === "object" && !Array.isArray(incoming) && Object.keys(incoming).length === 0)
      return { ok: false, reason: "empty_object" };
    return { ok: true };
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

describe("Blackboard", () => {
  let board: Blackboard;

  beforeEach(() => {
    board = new Blackboard();
  });

  it("starts with all sections null / empty arrays", () => {
    const state = board.getState();
    expect(state.formData).toBeNull();
    expect(state.funnelResult).toBeNull();
    expect(state.completedAgents).toEqual([]);
    expect(state.errors).toEqual([]);
  });

  it("set() writes to a section and triggers listeners", () => {
    const listener = vi.fn();
    board.onUpdate(listener);
    board.set("formData", { businessField: "tech" } as any);
    expect(board.get("formData")).toMatchObject({ businessField: "tech" });
    expect(listener).toHaveBeenCalledWith("formData", expect.any(Object));
  });

  it("get() returns the current value for a section", () => {
    board.set("funnelResult", { score: 90 } as any);
    expect(board.get("funnelResult")).toMatchObject({ score: 90 });
  });

  describe("verifiedSet()", () => {
    it("returns true and writes when verifier approves", () => {
      const ok = board.verifiedSet("discProfile", { primary: "D" } as any, { agentName: "agent-a" });
      expect(ok).toBe(true);
      expect(board.get("discProfile")).toMatchObject({ primary: "D" });
    });

    it("returns false and does NOT write when verifier rejects", () => {
      board.set("funnelResult", { score: 80 } as any);
      const ok = board.verifiedSet("funnelResult", null, { agentName: "agent-b" });
      expect(ok).toBe(false);
      expect(board.get("funnelResult")).toMatchObject({ score: 80 });
    });

    it("records rejection in rejectionLog", () => {
      board.set("funnelResult", { score: 80 } as any);
      board.verifiedSet("funnelResult", null, { agentName: "bad-agent" });
      const log = board.getRejectionLog();
      expect(log).toHaveLength(1);
      expect(log[0].agentName).toBe("bad-agent");
      expect(log[0].reason).toMatch(/null_payload/);
    });

    it("records success in successLog", () => {
      board.verifiedSet("discProfile", { primary: "D" } as any, { agentName: "good-agent" });
      const log = board.getSuccessLog();
      expect(log).toHaveLength(1);
      expect(log[0].agentName).toBe("good-agent");
      expect(log[0].wasOverwrite).toBe(false);
    });

    it("records halfLife when overwriting existing value", () => {
      board.verifiedSet("discProfile", { primary: "D" } as any, { agentName: "agent-1" });
      board.verifiedSet("discProfile", { primary: "C" } as any, { agentName: "agent-2" });
      const log = board.getHalfLifeLog();
      expect(log).toHaveLength(1);
      expect(log[0].conceptKey).toBe("discProfile");
      expect(log[0].survivalMs).toBeGreaterThanOrEqual(0);
    });

    it("marks wasOverwrite=true on second write", () => {
      board.verifiedSet("discProfile", { primary: "D" } as any, { agentName: "a1" });
      board.verifiedSet("discProfile", { primary: "C" } as any, { agentName: "a2" });
      const successes = board.getSuccessLog();
      expect(successes[1].wasOverwrite).toBe(true);
    });
  });

  describe("orchestration helpers", () => {
    it("markAgentComplete adds to completedAgents", () => {
      board.markAgentComplete("agent-x");
      expect(board.getState().completedAgents).toContain("agent-x");
    });

    it("recordError adds to errors array", () => {
      board.recordError("agent-y", "something went wrong");
      expect(board.getState().errors).toContainEqual({ agent: "agent-y", error: "something went wrong" });
    });
  });

  describe("pub/sub", () => {
    it("onUpdate returns an unsubscribe function", () => {
      const listener = vi.fn();
      const unsub = board.onUpdate(listener);
      unsub();
      board.set("formData", {} as any);
      expect(listener).not.toHaveBeenCalled();
    });

    it("multiple listeners all receive notifications", () => {
      const l1 = vi.fn();
      const l2 = vi.fn();
      board.onUpdate(l1);
      board.onUpdate(l2);
      board.set("metaMetrics", {} as any);
      expect(l1).toHaveBeenCalledOnce();
      expect(l2).toHaveBeenCalledOnce();
    });
  });

  describe("reset()", () => {
    it("clears state, logs, and listeners", () => {
      const listener = vi.fn();
      board.onUpdate(listener);
      board.set("formData", { businessField: "tech" } as any);
      board.markAgentComplete("a");
      board.reset();
      expect(board.getState().formData).toBeNull();
      expect(board.getState().completedAgents).toEqual([]);
      expect(board.getRejectionLog()).toHaveLength(0);
      board.set("formData", {} as any);
      expect(listener).toHaveBeenCalledTimes(1); // only before reset
    });
  });

  it("getCycleStartMs returns a reasonable timestamp", () => {
    const now = Date.now();
    expect(board.getCycleStartMs()).toBeGreaterThanOrEqual(now - 100);
    expect(board.getCycleStartMs()).toBeLessThanOrEqual(now + 100);
  });
});
