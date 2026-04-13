// ═══════════════════════════════════════════════
// Blackboard Persistence — Save/Load board state to Supabase
// Enables cross-session persistence, audit trails,
// and server-side agent access to blackboard data.
// ═══════════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";
import type { BlackboardState } from "@/engine/blackboard/blackboardStore";
import type { PipelineExecutionResult } from "@/engine/blackboard/agentTypes";

// ═══════════════════════════════════════════════
// BLACKBOARD SNAPSHOTS
// ═══════════════════════════════════════════════

export interface BlackboardSnapshot {
  id: string;
  planId: string;
  state: BlackboardState;
  completedAgents: string[];
  errors: { agent: string; error: string }[];
  executionMeta: PipelineExecutionResult | null;
  totalTokensUsed: number;
  totalCostNIS: number;
  durationMs: number | null;
  createdAt: string;
}

/**
 * Save a blackboard snapshot after pipeline execution.
 */
export async function saveBlackboardSnapshot(
  planId: string,
  state: BlackboardState,
  executionResult?: PipelineExecutionResult
): Promise<string | null> {
  const { data, error } = await supabase
    .from("blackboard_snapshots" as unknown as string)
    .insert({
      plan_id: planId,
      state: JSON.parse(JSON.stringify(state)), // deep clone to JSONB
      completed_agents: state.completedAgents,
      errors: state.errors,
      execution_meta: executionResult ? JSON.parse(JSON.stringify(executionResult)) : null,
      total_tokens_used: executionResult?.totalTokensUsed ?? 0,
      total_cost_nis: executionResult?.totalCostNIS ?? 0,
      duration_ms: executionResult?.durationMs ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save blackboard snapshot:", error);
    return null;
  }

  return (data as unknown as { id: string })?.id ?? null;
}

/**
 * Load the most recent blackboard snapshot for a plan.
 */
export async function loadBlackboardSnapshot(
  planId: string
): Promise<BlackboardSnapshot | null> {
  const { data, error } = await supabase
    .from("blackboard_snapshots" as unknown as string)
    .select("*")
    .eq("plan_id", planId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  const row = data as unknown as Record<string, unknown>;
  return {
    id: row.id as string,
    planId: row.plan_id as string,
    state: row.state as BlackboardState,
    completedAgents: (row.completed_agents as string[]) || [],
    errors: (row.errors as { agent: string; error: string }[]) || [],
    executionMeta: row.execution_meta as PipelineExecutionResult | null,
    totalTokensUsed: (row.total_tokens_used as number) || 0,
    totalCostNIS: (row.total_cost_nis as number) || 0,
    durationMs: row.duration_ms as number | null,
    createdAt: row.created_at as string,
  };
}

// ═══════════════════════════════════════════════
// AGENT TASK QUEUE
// ═══════════════════════════════════════════════

export interface AgentTask {
  id: string;
  agentName: string;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  confidence: number | null;
  tokensUsed: number;
  costNIS: number;
  retryCount: number;
  createdAt: string;
}

/**
 * Enqueue an agent task for server-side execution.
 */
export async function enqueueAgentTask(
  agentName: string,
  input: Record<string, unknown>,
  userId: string,
  planId?: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("agent_tasks" as unknown as string)
    .insert({
      agent_name: agentName,
      input,
      user_id: userId,
      plan_id: planId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to enqueue agent task:", error);
    return null;
  }

  return (data as unknown as { id: string })?.id ?? null;
}

/**
 * Get the status of an agent task.
 */
export async function getAgentTaskStatus(taskId: string): Promise<AgentTask | null> {
  const { data, error } = await supabase
    .from("agent_tasks" as unknown as string)
    .select("*")
    .eq("id", taskId)
    .single();

  if (error || !data) return null;

  const row = data as unknown as Record<string, unknown>;
  return {
    id: row.id as string,
    agentName: row.agent_name as string,
    status: row.status as string,
    input: row.input as Record<string, unknown>,
    output: row.output as Record<string, unknown> | null,
    error: row.error as string | null,
    confidence: row.confidence as number | null,
    tokensUsed: row.tokens_used as number,
    costNIS: row.cost_nis as number,
    retryCount: row.retry_count as number,
    createdAt: row.created_at as string,
  };
}

// ═══════════════════════════════════════════════
// EXECUTION LOG
// ═══════════════════════════════════════════════

/**
 * Log an agent execution event for audit purposes.
 */
export async function logAgentEvent(
  taskId: string | null,
  sessionId: string,
  agentName: string,
  event: "started" | "completed" | "failed" | "retried" | "tripped" | "timeout" | "cost_tracked",
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from("agent_execution_log" as unknown as string)
    .insert({
      task_id: taskId,
      session_id: sessionId,
      agent_name: agentName,
      event,
      metadata: metadata ?? null,
    });

  if (error) {
    console.error("Failed to log agent event:", error);
  }
}

// ═══════════════════════════════════════════════
// ANALYTICS HELPERS
// ═══════════════════════════════════════════════

/**
 * Get total agent costs for a user in the current month.
 */
export async function getMonthlyAgentCost(userId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("agent_tasks" as unknown as string)
    .select("cost_nis")
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString())
    .eq("status", "completed");

  if (error || !data) return 0;

  return (data as unknown as Record<string, number>[]).reduce((sum: number, row) => sum + (row.cost_nis || 0), 0);
}
