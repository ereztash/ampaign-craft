import { describe, it, expect, vi } from "vitest";
import {
  Blackboard,
  AsyncAgentRunner,
  wrapSyncAgent,
  createDefaultAsyncPipeline,
  runFullPipelineAsync,
  CircuitBreaker,
  knowledgeGraphAgent,
  funnelAgent,
  retentionAgent,
} from "../blackboard";
import type { AsyncAgentDefinition } from "../blackboard";
import { FormData } from "@/types/funnel";
import {
  getFallbackTier,
  selectModelWithFallback,
  wouldExceedCostCap,
  calculateCostNIS,
} from "@/services/llmRouter";

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45],
    interests: "marketing",
    productDescription: "SaaS platform for marketing automation",
    averagePrice: 200,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook", "instagram", "email"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════
// ASYNC AGENT RUNNER
// ═══════════════════════════════════════════════

describe("AsyncAgentRunner", () => {
  it("registers async agents", () => {
    const runner = new AsyncAgentRunner();
    const agent: AsyncAgentDefinition = {
      name: "test",
      dependencies: [],
      writes: [],
      run: async () => {},
    };
    runner.register(agent);
    expect(runner.getRegisteredAgents()).toContain("test");
  });

  it("wraps and registers sync agents", () => {
    const runner = new AsyncAgentRunner();
    runner.registerSync(knowledgeGraphAgent);
    expect(runner.getRegisteredAgents()).toContain("knowledgeGraph");
  });

  it("computes execution order respecting dependencies", () => {
    const runner = new AsyncAgentRunner();
    runner.registerSync(knowledgeGraphAgent);
    runner.registerSync(funnelAgent);
    const order = runner.getExecutionOrder();
    expect(order.indexOf("knowledgeGraph")).toBeLessThan(order.indexOf("funnel"));
  });

  it("computes execution layers for parallel execution", () => {
    const runner = new AsyncAgentRunner();
    runner.registerSync(knowledgeGraphAgent);
    runner.registerSync(funnelAgent);
    runner.registerSync(retentionAgent);

    const layers = runner.getExecutionLayers();
    // knowledgeGraph and retention have no deps → same layer
    expect(layers[0]).toContain("knowledgeGraph");
    expect(layers[0]).toContain("retention");
    // funnel depends on knowledgeGraph → later layer
    const funnelLayerIdx = layers.findIndex((l) => l.includes("funnel"));
    expect(funnelLayerIdx).toBeGreaterThan(0);
  });

  it("detects circular dependencies", () => {
    const runner = new AsyncAgentRunner();
    runner.register({ name: "a", dependencies: ["b"], writes: [], run: async () => {} });
    runner.register({ name: "b", dependencies: ["a"], writes: [], run: async () => {} });
    expect(() => runner.getExecutionOrder()).toThrow("Circular dependency");
  });

  it("runs all agents asynchronously", async () => {
    const board = new Blackboard();
    board.set("formData", makeFormData());
    const runner = createDefaultAsyncPipeline();

    const result = await runner.runAllAsync(board);

    expect(result.completedAgents.length).toBe(8);
    expect(result.failedAgents).toEqual([]);
    expect(result.durationMs).toBeGreaterThan(0);
    expect(board.get("knowledgeGraph")).not.toBeNull();
    expect(board.get("funnelResult")).not.toBeNull();
  });

  it("runFullPipelineAsync produces identical results to sync", async () => {
    const fd = makeFormData();
    const { state } = await runFullPipelineAsync(fd);

    expect(state.funnelResult).not.toBeNull();
    expect(state.knowledgeGraph).not.toBeNull();
    expect(state.hormoziValue).not.toBeNull();
    expect(state.discProfile).not.toBeNull();
    expect(state.closingStrategy).not.toBeNull();
    expect(state.costOfInaction).not.toBeNull();
    expect(state.churnRisk).not.toBeNull();
    expect(state.healthScore).not.toBeNull();
    expect(state.retentionFlywheel).not.toBeNull();
    expect(state.errors).toEqual([]);
  });

  it("records errors without stopping pipeline", async () => {
    const runner = new AsyncAgentRunner();
    runner.register({
      name: "failing",
      dependencies: [],
      writes: [],
      maxRetries: 0,
      run: async () => { throw new Error("boom"); },
    });
    runner.registerSync(retentionAgent);

    const board = new Blackboard();
    board.set("formData", makeFormData());
    const result = await runner.runAllAsync(board);

    expect(result.failedAgents).toContain("failing");
    expect(result.completedAgents).toContain("retention");
  });

  it("retries on failure with exponential backoff", async () => {
    let attempts = 0;
    const runner = new AsyncAgentRunner();
    runner.register({
      name: "flaky",
      dependencies: [],
      writes: [],
      maxRetries: 2,
      run: async () => {
        attempts++;
        if (attempts < 3) throw new Error("transient");
      },
    });

    const board = new Blackboard();
    board.set("formData", makeFormData());
    const result = await runner.runAllAsync(board);

    expect(attempts).toBe(3); // initial + 2 retries
    expect(result.completedAgents).toContain("flaky");
  });

  it("times out slow agents", async () => {
    const runner = new AsyncAgentRunner();
    runner.register({
      name: "slow",
      dependencies: [],
      writes: [],
      timeout: 50, // 50ms timeout
      maxRetries: 0,
      run: async () => {
        await new Promise((r) => setTimeout(r, 200)); // 200ms work
      },
    });

    const board = new Blackboard();
    board.set("formData", makeFormData());
    const result = await runner.runAllAsync(board);

    expect(result.failedAgents).toContain("slow");
    const meta = result.executionMeta.find((m) => m.agentName === "slow");
    expect(meta?.status).toBe("timeout");
  });

  it("tracks cost and trips on cost cap", async () => {
    const runner = new AsyncAgentRunner(0.001); // Very low cap: 0.001 NIS

    runner.register({
      name: "cheap",
      dependencies: [],
      writes: [],
      run: async () => {
        runner.trackCost("cheap", 1000, 0.01); // Exceeds 0.001 cap
      },
    });
    runner.register({
      name: "blocked",
      dependencies: ["cheap"],
      writes: [],
      run: async () => {},
    });

    const board = new Blackboard();
    board.set("formData", makeFormData());
    const result = await runner.runAllAsync(board);

    expect(result.completedAgents).toContain("cheap");
    expect(result.trippedAgents).toContain("blocked");
    expect(runner.getCostTracker().isOverBudget).toBe(true);
  });

  it("executes independent agents in parallel", async () => {
    const executionLog: string[] = [];

    const runner = new AsyncAgentRunner();
    runner.register({
      name: "a",
      dependencies: [],
      writes: [],
      run: async () => {
        executionLog.push("a-start");
        await new Promise((r) => setTimeout(r, 30));
        executionLog.push("a-end");
      },
    });
    runner.register({
      name: "b",
      dependencies: [],
      writes: [],
      run: async () => {
        executionLog.push("b-start");
        await new Promise((r) => setTimeout(r, 30));
        executionLog.push("b-end");
      },
    });

    const board = new Blackboard();
    board.set("formData", makeFormData());
    await runner.runAllAsync(board);

    // Both should start before either ends (parallel execution)
    const aStart = executionLog.indexOf("a-start");
    const bStart = executionLog.indexOf("b-start");
    const aEnd = executionLog.indexOf("a-end");
    const bEnd = executionLog.indexOf("b-end");

    expect(aStart).toBeLessThan(aEnd);
    expect(bStart).toBeLessThan(bEnd);
    // Both start before any ends
    expect(Math.max(aStart, bStart)).toBeLessThan(Math.min(aEnd, bEnd));
  });
});

// ═══════════════════════════════════════════════
// CIRCUIT BREAKER
// ═══════════════════════════════════════════════

describe("CircuitBreaker", () => {
  it("starts in closed state", () => {
    const breaker = new CircuitBreaker();
    expect(breaker.getSnapshot().state).toBe("closed");
    expect(breaker.canContinue()).toBe(true);
  });

  it("trips after max iterations", () => {
    const breaker = new CircuitBreaker({ maxIterations: 3 });
    breaker.recordSuccess(1.0);
    breaker.recordSuccess(1.0);
    breaker.recordSuccess(1.0); // 3rd iteration triggers trip

    expect(breaker.getSnapshot().state).toBe("open");
    expect(breaker.canContinue()).toBe(false);
  });

  it("trips after consecutive failures", () => {
    const breaker = new CircuitBreaker({ consecutiveFailures: 2 });
    breaker.recordFailure("error 1");
    breaker.recordFailure("error 2");

    expect(breaker.getSnapshot().state).toBe("open");
    expect(breaker.getSnapshot().trippedReason).toContain("consecutive failures");
  });

  it("trips after consecutive low-confidence results", () => {
    const breaker = new CircuitBreaker({
      maxIterations: 10,
      minConfidence: 0.8,
      consecutiveFailures: 3,
    });
    breaker.recordSuccess(0.5); // below 0.8
    breaker.recordSuccess(0.6); // below 0.8
    breaker.recordSuccess(0.7); // below 0.8 → 3 consecutive

    expect(breaker.getSnapshot().state).toBe("open");
    expect(breaker.getSnapshot().trippedReason).toContain("low-confidence");
  });

  it("resets consecutive failures on success", () => {
    const breaker = new CircuitBreaker({ consecutiveFailures: 3 });
    breaker.recordFailure("err");
    breaker.recordFailure("err");
    breaker.recordSuccess(1.0); // resets counter
    breaker.recordFailure("err"); // only 1 consecutive

    expect(breaker.getSnapshot().state).toBe("closed");
  });

  it("enters half-open state after cooldown", async () => {
    const breaker = new CircuitBreaker({ consecutiveFailures: 1, cooldownMs: 50 });
    breaker.recordFailure("err");

    expect(breaker.canContinue()).toBe(false);

    await new Promise((r) => setTimeout(r, 60));
    expect(breaker.canContinue()).toBe(true);
    expect(breaker.getSnapshot().state).toBe("half-open");
  });

  it("closes from half-open on success", async () => {
    const breaker = new CircuitBreaker({ consecutiveFailures: 1, cooldownMs: 10 });
    breaker.recordFailure("err");

    await new Promise((r) => setTimeout(r, 20));
    breaker.canContinue(); // triggers half-open
    breaker.recordSuccess(0.95);

    expect(breaker.getSnapshot().state).toBe("closed");
  });

  it("re-opens from half-open on failure", async () => {
    const breaker = new CircuitBreaker({ consecutiveFailures: 1, cooldownMs: 10 });
    breaker.recordFailure("err");

    await new Promise((r) => setTimeout(r, 20));
    breaker.canContinue(); // half-open
    breaker.recordFailure("still broken");

    expect(breaker.getSnapshot().state).toBe("open");
  });

  it("resets to initial state", () => {
    const breaker = new CircuitBreaker({ consecutiveFailures: 1 });
    breaker.recordFailure("err");
    expect(breaker.getSnapshot().state).toBe("open");

    breaker.reset();
    expect(breaker.getSnapshot().state).toBe("closed");
    expect(breaker.getSnapshot().iteration).toBe(0);
  });
});

// ═══════════════════════════════════════════════
// LLM ROUTER EXTENSIONS
// ═══════════════════════════════════════════════

describe("LLM Router Extensions", () => {
  it("getFallbackTier returns correct fallback", () => {
    expect(getFallbackTier("deep")).toBe("standard");
    expect(getFallbackTier("standard")).toBe("fast");
    expect(getFallbackTier("fast")).toBeNull();
  });

  it("selectModelWithFallback downgrades on failed tiers", () => {
    const selection = selectModelWithFallback(
      { task: "deep-analysis", textLength: "medium", qualityPriority: "quality" },
      ["deep"]
    );
    expect(selection.tier).toBe("standard");
  });

  it("selectModelWithFallback falls to fast if both deep and standard fail", () => {
    const selection = selectModelWithFallback(
      { task: "deep-analysis", textLength: "medium", qualityPriority: "quality" },
      ["deep", "standard"]
    );
    expect(selection.tier).toBe("fast");
  });

  it("wouldExceedCostCap detects overspend", () => {
    expect(wouldExceedCostCap(5, 6, 10)).toBe(true);
    expect(wouldExceedCostCap(3, 6, 10)).toBe(false);
  });

  it("calculateCostNIS computes correctly", () => {
    const cost = calculateCostNIS(1000, "fast");
    // 1000 tokens * 0.003/1000 * 3.6 = 0.0108
    expect(cost).toBeCloseTo(0.0108, 3);
  });

  it("new task types are recognized", () => {
    const research = selectModelWithFallback(
      { task: "research", textLength: "long", qualityPriority: "quality" },
    );
    expect(research.tier).toBe("deep");

    const qa = selectModelWithFallback(
      { task: "qa-analysis", textLength: "medium", qualityPriority: "balanced" },
    );
    expect(qa.tier).toBe("standard");
  });
});

// ═══════════════════════════════════════════════
// WRAP SYNC AGENT
// ═══════════════════════════════════════════════

describe("wrapSyncAgent", () => {
  it("converts sync agent to async", async () => {
    const asyncAgent = wrapSyncAgent(knowledgeGraphAgent);
    expect(asyncAgent.name).toBe("knowledgeGraph");

    const board = new Blackboard();
    board.set("formData", makeFormData());
    await asyncAgent.run(board);
    expect(board.get("knowledgeGraph")).not.toBeNull();
  });
});
