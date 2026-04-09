// ═══════════════════════════════════════════════
// Agent Types — Extended definitions for async & LLM-powered agents
// Part of MAS-CC (Multi-Agent System for Campaign-Craft)
// ═══════════════════════════════════════════════

import type { Blackboard, BoardSection } from "./blackboardStore";
import type { ModelTier } from "@/services/llmRouter";

// ═══════════════════════════════════════════════
// ASYNC AGENT DEFINITION
// ═══════════════════════════════════════════════

/**
 * Extends the base AgentDefinition to support async execution,
 * timeouts, retries, and LLM-specific configuration.
 */
export interface AsyncAgentDefinition {
  name: string;
  dependencies: string[];
  writes: BoardSection[];
  run: (board: Blackboard) => Promise<void>;
  timeout?: number;              // ms, default 30000
  maxRetries?: number;           // default 2
  confidenceThreshold?: number;  // 0-1, for LLM agents (min confidence to accept result)
  modelTier?: ModelTier;         // fast/standard/deep — for LLM-powered agents
}

// ═══════════════════════════════════════════════
// AGENT EXECUTION METADATA
// ═══════════════════════════════════════════════

export type AgentStatus = "pending" | "running" | "completed" | "failed" | "tripped" | "timeout";

export interface AgentExecutionMeta {
  agentName: string;
  startedAt: number;
  completedAt: number | null;
  tokensUsed: number;
  costNIS: number;
  confidence: number;  // 0-1, 1 = deterministic (pure logic agents)
  retryCount: number;
  status: AgentStatus;
  error?: string;
}

// ═══════════════════════════════════════════════
// CIRCUIT BREAKER CONFIG
// ═══════════════════════════════════════════════

export interface CircuitBreakerConfig {
  maxIterations: number;       // hard cap on loop iterations (default 5)
  minConfidence: number;       // 0-1, minimum confidence to accept (default 0.8)
  consecutiveFailures: number; // failures before circuit trips (default 3)
  cooldownMs: number;          // backoff between retries (default 5000)
}

export const DEFAULT_CIRCUIT_BREAKER: CircuitBreakerConfig = {
  maxIterations: 5,
  minConfidence: 0.8,
  consecutiveFailures: 3,
  cooldownMs: 5000,
};

// ═══════════════════════════════════════════════
// PIPELINE EXECUTION RESULT
// ═══════════════════════════════════════════════

export interface PipelineExecutionResult {
  completedAgents: string[];
  failedAgents: string[];
  trippedAgents: string[];
  executionMeta: AgentExecutionMeta[];
  totalTokensUsed: number;
  totalCostNIS: number;
  durationMs: number;
}

// ═══════════════════════════════════════════════
// LLM AGENT CONFIG
// ═══════════════════════════════════════════════

/**
 * Configuration for creating an LLM-powered agent via createLLMAgent factory.
 */
export interface LLMAgentConfig {
  name: string;
  dependencies: string[];
  writes: BoardSection[];
  systemPrompt: string | ((board: Blackboard) => string);
  userPrompt: (board: Blackboard) => string;
  outputParser: (raw: string) => unknown;
  modelTier: ModelTier;
  temperature?: number;  // default 0 for deterministic QA agents
  maxTokens?: number;
}

// ═══════════════════════════════════════════════
// COST TRACKING
// ═══════════════════════════════════════════════

export interface SessionCostTracker {
  sessionId: string;
  totalTokensUsed: number;
  totalCostNIS: number;
  agentCosts: Record<string, { tokens: number; costNIS: number }>;
  costCapNIS: number;       // max spend per session (default 10 NIS)
  isOverBudget: boolean;
}

export const DEFAULT_COST_CAP_NIS = 10;
