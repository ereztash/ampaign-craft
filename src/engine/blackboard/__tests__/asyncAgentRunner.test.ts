import { describe, it, expect, vi, beforeEach } from "vitest";
import { AsyncAgentRunner, wrapSyncAgent } from "../asyncAgentRunner";
import { Blackboard } from "../blackboardStore";

vi.mock("../blackboardStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../blackboardStore")>();
  return actual;
});

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock("../ontologicalVerifier", () => ({
  verifyWrite: vi.fn(() => ({ ok: true })),
}));

vi.mock("../sentinelRail", () => ({
  SentinelRail: vi.fn().mockImplementation(() => ({
    record: vi.fn(),
  })),
}));

function makeAgent(name: string, deps: string[] = [], fn: () => Promise<void> = async () => {}) {
  return { name, dependencies: deps, writes: [] as any, run: fn };
}

describe("AsyncAgentRunner", () => {
  let runner: AsyncAgentRunner;
  let board: Blackboard;

  beforeEach(() => {
    runner = new AsyncAgentRunner(50);
    board = new Blackboard();
  });

  describe("register / getRegisteredAgents", () => {
    it("registers agents", () => {
      runner.register(makeAgent("a"));
      runner.register(makeAgent("b"));
      expect(runner.getRegisteredAgents()).toContain("a");
      expect(runner.getRegisteredAgents()).toContain("b");
    });

    it("re-registration replaces existing agent", () => {
      runner.register(makeAgent("a"));
      runner.register(makeAgent("a"));
      expect(runner.getRegisteredAgents().filter((n) => n === "a")).toHaveLength(1);
    });

    it("registerSync wraps a sync agent", () => {
      const syncAgent = { name: "sync-a", dependencies: [], writes: [] as any, run: vi.fn() };
      runner.registerSync(syncAgent);
      expect(runner.getRegisteredAgents()).toContain("sync-a");
    });
  });

  describe("getExecutionOrder", () => {
    it("respects dependencies (dep comes before dependent)", () => {
      runner.register(makeAgent("b", ["a"]));
      runner.register(makeAgent("a", []));
      const order = runner.getExecutionOrder();
      expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"));
    });

    it("throws on circular dependency", () => {
      runner.register(makeAgent("a", ["b"]));
      runner.register(makeAgent("b", ["a"]));
      expect(() => runner.getExecutionOrder()).toThrow(/[Cc]ircular/);
    });
  });

  describe("getExecutionLayers", () => {
    it("independent agents are in the same layer", () => {
      runner.register(makeAgent("a"));
      runner.register(makeAgent("b"));
      const layers = runner.getExecutionLayers();
      expect(layers[0]).toContain("a");
      expect(layers[0]).toContain("b");
    });

    it("dependent agent is in a later layer", () => {
      runner.register(makeAgent("root"));
      runner.register(makeAgent("child", ["root"]));
      const layers = runner.getExecutionLayers();
      expect(layers[0]).toContain("root");
      expect(layers[1]).toContain("child");
    });
  });

  describe("runAllAsync", () => {
    it("completes all agents and returns result", async () => {
      runner.register(makeAgent("a"));
      runner.register(makeAgent("b"));
      const result = await runner.runAllAsync(board);
      expect(result.completedAgents).toContain("a");
      expect(result.completedAgents).toContain("b");
      expect(result.failedAgents).toHaveLength(0);
    });

    it("marks agent as failed when run throws", async () => {
      runner.register(makeAgent("bad", [], async () => { throw new Error("boom"); }));
      const result = await runner.runAllAsync(board);
      expect(result.failedAgents).toContain("bad");
      expect(result.completedAgents).not.toContain("bad");
    });

    it("retries on failure (up to maxRetries)", async () => {
      let calls = 0;
      const flaky = {
        ...makeAgent("flaky", [], async () => {
          calls++;
          if (calls < 3) throw new Error("not yet");
        }),
        maxRetries: 2,
        timeout: 5000,
      };
      runner.register(flaky);
      const result = await runner.runAllAsync(board);
      expect(result.completedAgents).toContain("flaky");
      expect(calls).toBe(3);
    }, 15000);

    it("returns durationMs > 0", async () => {
      runner.register(makeAgent("a"));
      const result = await runner.runAllAsync(board);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("trackCost", () => {
    it("accumulates total cost", () => {
      runner.trackCost("agent-a", 1000, 2.5);
      runner.trackCost("agent-b", 500, 1.5);
      expect(runner.getCostTracker().totalCostNIS).toBeCloseTo(4.0);
      expect(runner.getCostTracker().totalTokensUsed).toBe(1500);
    });

    it("sets isOverBudget when cap is reached", () => {
      const r = new AsyncAgentRunner(5);
      r.trackCost("a", 0, 5);
      expect(r.getCostTracker().isOverBudget).toBe(true);
    });
  });
});

describe("wrapSyncAgent", () => {
  it("wraps a sync agent into an async-compatible definition", async () => {
    const run = vi.fn();
    const sync = { name: "s", dependencies: [], writes: [] as any, run };
    const wrapped = wrapSyncAgent(sync);
    expect(wrapped.name).toBe("s");
    await wrapped.run(null as any);
    expect(run).toHaveBeenCalledOnce();
  });
});
