import { describe, it, expect, vi } from "vitest";
import { createBlackboard } from "../blackboardFactory";
import { Blackboard } from "../blackboardStore";

vi.mock("../ontologicalVerifier", () => ({
  verifyWrite: vi.fn(() => ({ ok: true })),
}));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

describe("createBlackboard", () => {
  it("returns a Blackboard instance", () => {
    expect(createBlackboard()).toBeInstanceOf(Blackboard);
  });

  it("each call returns a fresh independent instance", () => {
    const a = createBlackboard();
    const b = createBlackboard();
    expect(a).not.toBe(b);
    a.set("formData", { businessField: "tech" } as any);
    expect(b.get("formData")).toBeNull();
  });

  it("new board starts with all sections null", () => {
    const board = createBlackboard();
    const state = board.getState();
    expect(state.formData).toBeNull();
    expect(state.funnelResult).toBeNull();
    expect(state.completedAgents).toEqual([]);
    expect(state.errors).toEqual([]);
  });
});
