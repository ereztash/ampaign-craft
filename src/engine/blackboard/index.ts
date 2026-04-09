// ═══════════════════════════════════════════════
// Blackboard Architecture — Public API
// ═══════════════════════════════════════════════

// Core store
export { Blackboard } from "./blackboardStore";
export type { BlackboardState, BoardSection } from "./blackboardStore";

// Sync runner (original)
export { AgentRunner } from "./agentRunner";
export type { AgentDefinition } from "./agentRunner";

// Async runner (MAS-CC)
export { AsyncAgentRunner, wrapSyncAgent } from "./asyncAgentRunner";
export type {
  AsyncAgentDefinition,
  AgentExecutionMeta,
  AgentStatus,
  PipelineExecutionResult,
  CircuitBreakerConfig,
  SessionCostTracker,
  LLMAgentConfig,
} from "./agentTypes";
export { DEFAULT_CIRCUIT_BREAKER, DEFAULT_COST_CAP_NIS } from "./agentTypes";

// Circuit breaker
export { CircuitBreaker } from "./circuitBreaker";
export type { CircuitState, CircuitBreakerSnapshot } from "./circuitBreaker";

// Agent definitions
export { knowledgeGraphAgent } from "./agents/knowledgeGraphAgent";
export { funnelAgent } from "./agents/funnelAgent";
export { hormoziAgent } from "./agents/hormoziAgent";
export { discAgent } from "./agents/discAgent";
export { closingAgent } from "./agents/closingAgent";
export { coiAgent } from "./agents/coiAgent";
export { retentionAgent } from "./agents/retentionAgent";
export { healthAgent } from "./agents/healthAgent";

// QA agents (MAS-CC Phase 2)
export { qaStaticAgent } from "./agents/qaStaticAgent";
export { qaContentAgent } from "./agents/qaContentAgent";
export { qaSecurityAgent } from "./agents/qaSecurityAgent";
export { qaOrchestratorAgent } from "./agents/qaOrchestratorAgent";

// LLM agent factory
export { createLLMAgent, parseLLMJson } from "./llmAgent";

import { Blackboard } from "./blackboardStore";
import { AgentRunner } from "./agentRunner";
import { AsyncAgentRunner } from "./asyncAgentRunner";
import { knowledgeGraphAgent } from "./agents/knowledgeGraphAgent";
import { funnelAgent } from "./agents/funnelAgent";
import { hormoziAgent } from "./agents/hormoziAgent";
import { discAgent } from "./agents/discAgent";
import { closingAgent } from "./agents/closingAgent";
import { coiAgent } from "./agents/coiAgent";
import { retentionAgent } from "./agents/retentionAgent";
import { healthAgent } from "./agents/healthAgent";
import type { FormData } from "@/types/funnel";
import type { BlackboardState } from "./blackboardStore";
import type { PipelineExecutionResult } from "./agentTypes";

const ALL_SYNC_AGENTS = [
  knowledgeGraphAgent, funnelAgent, hormoziAgent, discAgent,
  closingAgent, coiAgent, retentionAgent, healthAgent,
];

/**
 * Create a default pipeline with all registered agents (sync).
 */
export function createDefaultPipeline(): AgentRunner {
  const runner = new AgentRunner();
  for (const agent of ALL_SYNC_AGENTS) {
    runner.register(agent);
  }
  return runner;
}

/**
 * Create a default async pipeline (wraps sync agents, supports parallel execution).
 */
export function createDefaultAsyncPipeline(costCapNIS?: number): AsyncAgentRunner {
  const runner = new AsyncAgentRunner(costCapNIS);
  for (const agent of ALL_SYNC_AGENTS) {
    runner.registerSync(agent);
  }
  return runner;
}

/**
 * Run the full analysis pipeline from form data (sync).
 * This is the primary entry point for blackboard-based generation.
 */
export function runFullPipeline(formData: FormData): BlackboardState {
  const board = new Blackboard();
  board.set("formData", formData);

  const runner = createDefaultPipeline();
  return runner.runAll(board);
}

/**
 * Run the full analysis pipeline from form data (async).
 * Executes independent agents in parallel for better performance.
 * Returns both the board state and detailed execution metadata.
 */
export async function runFullPipelineAsync(
  formData: FormData,
  costCapNIS?: number
): Promise<{ state: BlackboardState; result: PipelineExecutionResult }> {
  const board = new Blackboard();
  board.set("formData", formData);

  const runner = createDefaultAsyncPipeline(costCapNIS);
  const result = await runner.runAllAsync(board);

  return { state: board.getState(), result };
}
