// ═══════════════════════════════════════════════
// Async Agent Runner — Orchestrates async & LLM-powered agents
// Supports: parallel execution, timeouts, retries, cost tracking.
// Backward-compatible: wraps sync AgentDefinitions as async.
// ═══════════════════════════════════════════════

import { Blackboard, type BlackboardState } from "./blackboardStore";
import type { AgentDefinition } from "./agentRunner";
import type {
  AsyncAgentDefinition,
  AgentExecutionMeta,
  AgentStatus,
  PipelineExecutionResult,
  SessionCostTracker,
} from "./agentTypes";
import { DEFAULT_COST_CAP_NIS } from "./agentTypes";
import { SentinelRail } from "./sentinelRail";

const DEFAULT_TIMEOUT = 30_000; // 30 seconds
const DEFAULT_MAX_RETRIES = 2;

// ═══════════════════════════════════════════════
// TOPOLOGICAL SORT (supports both sync and async agents)
// ═══════════════════════════════════════════════

interface AgentNode {
  name: string;
  dependencies: string[];
}

function topologicalSort<T extends AgentNode>(agents: T[]): T[] {
  const agentMap = new Map(agents.map((a) => [a.name, a]));
  const visited = new Set<string>();
  const result: T[] = [];

  function visit(name: string, visiting: Set<string>) {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      throw new Error(`Circular dependency detected: ${name}`);
    }

    const agent = agentMap.get(name);
    if (!agent) return;

    visiting.add(name);
    for (const dep of agent.dependencies) {
      visit(dep, visiting);
    }
    visiting.delete(name);
    visited.add(name);
    result.push(agent);
  }

  for (const agent of agents) {
    visit(agent.name, new Set());
  }

  return result;
}

/**
 * Group agents into execution layers where agents in the same layer
 * have all dependencies satisfied by previous layers (can run in parallel).
 */
function groupByExecutionLayer<T extends AgentNode>(sorted: T[]): T[][] {
  const completed = new Set<string>();
  const layers: T[][] = [];
  const remaining = [...sorted];

  while (remaining.length > 0) {
    const layer: T[] = [];
    const notReady: T[] = [];

    for (const agent of remaining) {
      const depsReady = agent.dependencies.every((d) => completed.has(d));
      if (depsReady) {
        layer.push(agent);
      } else {
        notReady.push(agent);
      }
    }

    if (layer.length === 0 && notReady.length > 0) {
      throw new Error("Deadlock: agents have unsatisfiable dependencies");
    }

    for (const agent of layer) {
      completed.add(agent.name);
    }

    layers.push(layer);
    remaining.length = 0;
    remaining.push(...notReady);
  }

  return layers;
}

// ═══════════════════════════════════════════════
// TIMEOUT WRAPPER
// ═══════════════════════════════════════════════

function withTimeout<T>(promise: Promise<T>, ms: number, agentName: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Agent "${agentName}" timed out after ${ms}ms`));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ═══════════════════════════════════════════════
// ASYNC AGENT RUNNER
// ═══════════════════════════════════════════════

export class AsyncAgentRunner {
  private agents: AsyncAgentDefinition[] = [];
  private costTracker: SessionCostTracker;
  private sentinel: SentinelRail;

  constructor(costCapNIS: number = DEFAULT_COST_CAP_NIS) {
    this.sentinel = new SentinelRail();
    this.costTracker = {
      sessionId: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      totalTokensUsed: 0,
      totalCostNIS: 0,
      agentCosts: {},
      costCapNIS,
      isOverBudget: false,
    };
  }

  /**
   * Register an async agent definition.
   */
  register(agent: AsyncAgentDefinition): void {
    this.agents = this.agents.filter((a) => a.name !== agent.name);
    this.agents.push(agent);
  }

  /**
   * Register a synchronous AgentDefinition by wrapping it as async.
   */
  registerSync(agent: AgentDefinition): void {
    this.register({
      ...agent,
      run: async (board: Blackboard) => {
        agent.run(board);
      },
    });
  }

  /**
   * Get execution order (topologically sorted).
   */
  getExecutionOrder(): string[] {
    return topologicalSort(this.agents).map((a) => a.name);
  }

  /**
   * Get execution layers (groups of agents that can run in parallel).
   */
  getExecutionLayers(): string[][] {
    const sorted = topologicalSort(this.agents);
    return groupByExecutionLayer(sorted).map((layer) => layer.map((a) => a.name));
  }

  /**
   * Run all agents with parallel execution of independent agents.
   * Returns detailed execution result with cost and timing metadata.
   */
  async runAllAsync(board: Blackboard): Promise<PipelineExecutionResult> {
    const startTime = Date.now();
    const sorted = topologicalSort(this.agents);
    const layers = groupByExecutionLayer(sorted);
    const executionMeta: AgentExecutionMeta[] = [];
    const completedAgents: string[] = [];
    const failedAgents: string[] = [];
    const trippedAgents: string[] = [];

    for (const layer of layers) {
      // Execute all agents in this layer in parallel
      const results = await Promise.allSettled(
        layer.map((agent) => this.executeAgent(agent, board))
      );

      // Process results
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const agent = layer[i];

        if (result.status === "fulfilled") {
          const meta = result.value;
          executionMeta.push(meta);

          if (meta.status === "completed") {
            completedAgents.push(agent.name);
            board.markAgentComplete(agent.name);
          } else if (meta.status === "tripped") {
            trippedAgents.push(agent.name);
            board.recordError(agent.name, meta.error || "Circuit breaker tripped");
          } else {
            failedAgents.push(agent.name);
            board.recordError(agent.name, meta.error || "Unknown failure");
          }
        } else {
          // Promise rejection (unexpected)
          const error = result.reason instanceof Error ? result.reason.message : String(result.reason);
          failedAgents.push(agent.name);
          board.recordError(agent.name, error);
          executionMeta.push({
            agentName: agent.name,
            startedAt: Date.now(),
            completedAt: Date.now(),
            tokensUsed: 0,
            costNIS: 0,
            confidence: 0,
            retryCount: 0,
            status: "failed",
            error,
          });
        }
      }
    }

    return {
      completedAgents,
      failedAgents,
      trippedAgents,
      executionMeta,
      totalTokensUsed: this.costTracker.totalTokensUsed,
      totalCostNIS: this.costTracker.totalCostNIS,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Execute a single agent with timeout, retries, and cost tracking.
   */
  private async executeAgent(
    agent: AsyncAgentDefinition,
    board: Blackboard
  ): Promise<AgentExecutionMeta> {
    const timeout = agent.timeout ?? DEFAULT_TIMEOUT;
    const maxRetries = agent.maxRetries ?? DEFAULT_MAX_RETRIES;
    const meta: AgentExecutionMeta = {
      agentName: agent.name,
      startedAt: Date.now(),
      completedAt: null,
      tokensUsed: 0,
      costNIS: 0,
      confidence: 1, // Pure logic agents default to 1
      retryCount: 0,
      status: "running",
    };

    // Check cost cap before executing
    if (this.costTracker.isOverBudget) {
      meta.status = "tripped";
      meta.error = `Session cost cap exceeded (${this.costTracker.totalCostNIS.toFixed(2)} / ${this.costTracker.costCapNIS} NIS)`;
      meta.completedAt = Date.now();
      return meta;
    }

    let lastError: string | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await withTimeout(agent.run(board), timeout, agent.name);

        meta.status = "completed";
        meta.completedAt = Date.now();
        meta.retryCount = attempt;

        // Record execution in sentinel for anomaly detection
        this.sentinel.record({ ts: Date.now(), conceptKey: `AGENT-${agent.name}-success` });

        return meta;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        meta.retryCount = attempt;

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s...
          const backoff = Math.min(1000 * Math.pow(2, attempt), 10_000);
          await new Promise((resolve) => setTimeout(resolve, backoff));
        }
      }
    }

    // All retries exhausted
    meta.status = lastError?.includes("timed out") ? "timeout" : "failed";
    meta.error = lastError;
    meta.completedAt = Date.now();

    // Record failure in sentinel
    this.sentinel.record({ ts: Date.now(), conceptKey: `AGENT-${agent.name}-failure` });

    return meta;
  }

  /**
   * Update cost tracking after an LLM agent completes.
   */
  trackCost(agentName: string, tokensUsed: number, costNIS: number): void {
    this.costTracker.totalTokensUsed += tokensUsed;
    this.costTracker.totalCostNIS += costNIS;

    const existing = this.costTracker.agentCosts[agentName] || { tokens: 0, costNIS: 0 };
    this.costTracker.agentCosts[agentName] = {
      tokens: existing.tokens + tokensUsed,
      costNIS: existing.costNIS + costNIS,
    };

    if (this.costTracker.totalCostNIS >= this.costTracker.costCapNIS) {
      this.costTracker.isOverBudget = true;
    }
  }

  /**
   * Get current cost tracker snapshot.
   */
  getCostTracker(): Readonly<SessionCostTracker> {
    return this.costTracker;
  }

  /**
   * Get registered agent names.
   */
  getRegisteredAgents(): string[] {
    return this.agents.map((a) => a.name);
  }
}

// ═══════════════════════════════════════════════
// FACTORY: Create async pipeline from sync + async agents
// ═══════════════════════════════════════════════

/**
 * Wrap a synchronous AgentDefinition as an AsyncAgentDefinition.
 */
export function wrapSyncAgent(agent: AgentDefinition): AsyncAgentDefinition {
  return {
    ...agent,
    run: async (board: Blackboard) => {
      agent.run(board);
    },
  };
}
