import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentRunner } from "../agentRunner";
import { Blackboard } from "../blackboardStore";

vi.mock("../ontologicalVerifier", () => ({
  verifyWrite: vi.fn(() => ({ ok: true })),
}));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

function makeAgent(name: string, deps: string[] = [], run = vi.fn()) {
  return { name, dependencies: deps, writes: [] as any, run };
}

describe("AgentRunner", () => {
  let runner: AgentRunner;
  let board: Blackboard;

  beforeEach(() => {
    runner = new AgentRunner();
    board = new Blackboard();
  });

  // ── register ──────────────────────────────────

  it("registers an agent and lists it", () => {
    runner.register(makeAgent("a"));
    expect(runner.getRegisteredAgents()).toContain("a");
  });

  it("re-registration replaces existing agent (no duplicates)", () => {
    runner.register(makeAgent("a"));
    runner.register(makeAgent("a"));
    expect(runner.getRegisteredAgents().filter((n) => n === "a")).toHaveLength(1);
  });

  // ── getExecutionOrder ─────────────────────────

  it("returns dependency-respecting execution order", () => {
    runner.register(makeAgent("b", ["a"]));
    runner.register(makeAgent("a"));
    const order = runner.getExecutionOrder();
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"));
  });

  it("throws on circular dependency", () => {
    runner.register(makeAgent("a", ["b"]));
    runner.register(makeAgent("b", ["a"]));
    expect(() => runner.getExecutionOrder()).toThrow(/[Cc]ircular/);
  });

  it("independent agents appear in registration order", () => {
    runner.register(makeAgent("x"));
    runner.register(makeAgent("y"));
    const order = runner.getExecutionOrder();
    expect(order).toContain("x");
    expect(order).toContain("y");
  });

  // ── runAll ────────────────────────────────────

  it("calls each agent's run function once", () => {
    const runA = vi.fn();
    const runB = vi.fn();
    runner.register(makeAgent("a", [], runA));
    runner.register(makeAgent("b", ["a"], runB));
    runner.runAll(board);
    expect(runA).toHaveBeenCalledOnce();
    expect(runB).toHaveBeenCalledOnce();
  });

  it("marks agents complete in the board", () => {
    runner.register(makeAgent("a"));
    runner.runAll(board);
    expect(board.getState().completedAgents).toContain("a");
  });

  it("records error in board when agent throws, and continues", () => {
    runner.register(makeAgent("bad", [], vi.fn(() => { throw new Error("boom"); })));
    runner.register(makeAgent("good"));
    runner.runAll(board);
    expect(board.getState().errors[0]).toMatchObject({ agent: "bad", error: "boom" });
    expect(board.getState().completedAgents).toContain("good");
  });

  it("returns the final board state", () => {
    runner.register(makeAgent("a"));
    const state = runner.runAll(board);
    expect(state.completedAgents).toContain("a");
  });

  // ── runOne ────────────────────────────────────

  it("throws when agent not found", () => {
    expect(() => runner.runOne("missing", board)).toThrow(/not found/);
  });

  it("throws when dependency not yet completed", () => {
    runner.register(makeAgent("child", ["parent"]));
    expect(() => runner.runOne("child", board)).toThrow(/requires.*parent/);
  });

  it("runs agent when dependencies are satisfied", () => {
    const run = vi.fn();
    runner.register(makeAgent("parent"));
    runner.register(makeAgent("child", ["parent"], run));
    board.markAgentComplete("parent");
    runner.runOne("child", board);
    expect(run).toHaveBeenCalledOnce();
  });

  it("re-throws on agent error and records it", () => {
    runner.register(makeAgent("bad", [], vi.fn(() => { throw new Error("oops"); })));
    expect(() => runner.runOne("bad", board)).toThrow("oops");
    expect(board.getState().errors[0]).toMatchObject({ agent: "bad", error: "oops" });
  });
});
