// ═══════════════════════════════════════════════
// Agent Orchestrator (Tier 4 pillar)
//
// Lightweight client-side wrapper around the `agent-executor`
// edge function. Unlike the inline `supabase.functions.invoke`
// pattern elsewhere in the codebase, this helper:
//
//   1. Records a pending row in `agent_tasks` for traceability.
//   2. Calls `agent-executor` with the assembled prompt.
//   3. Updates the `agent_tasks` row on success.
//   4. Best-effort polls `event_queue` for an `agent.completed`
//      event up to 30 seconds so callers can observe the async
//      completion path, falling back to the direct invoke result.
//
// Gracefully degrades when the schema pieces don't exist yet —
// any supabase error is swallowed and the direct response is
// still returned, so this function is safe to call from a UI.
// ═══════════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";

export interface RunAgentParams {
  userId: string;
  planId: string | null;
  prompt: string;
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export type AgentRunStatus = "completed" | "failed" | "timeout";

export interface AgentResult {
  output: string;
  status: AgentRunStatus;
  error?: string;
  taskId?: string;
}

interface AgentExecutorResponse {
  text?: string;
  output?: string;
  error?: string;
}

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 30_000;

type LooseSupabase = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => {
      select: (cols: string) => {
        maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
      };
    };
    update: (row: Record<string, unknown>) => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
    };
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        eq: (col: string, val: string) => {
          order: (col: string, opts: Record<string, unknown>) => {
            limit: (n: number) => Promise<{
              data: Array<{ payload: Record<string, unknown>; created_at: string }> | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
  };
  functions: {
    invoke: (
      name: string,
      opts: { body: Record<string, unknown> },
    ) => Promise<{ data: AgentExecutorResponse | null; error: { message: string } | null }>;
  };
};

function loose(): LooseSupabase {
  return supabase as unknown as LooseSupabase;
}

async function insertPendingTask(params: RunAgentParams): Promise<string | null> {
  try {
    const { data, error } = await loose()
      .from("agent_tasks")
      .insert({
        user_id: params.userId,
        plan_id: params.planId,
        status: "pending",
        prompt: params.prompt,
        system_prompt: params.systemPrompt ?? null,
        model: params.model ?? "claude-sonnet-4-6",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();

    if (error) {
      console.warn("[agentOrchestrator] insert task failed:", error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (err) {
    console.warn("[agentOrchestrator] insert task threw:", err);
    return null;
  }
}

async function markTaskCompleted(taskId: string, output: string): Promise<void> {
  try {
    await loose()
      .from("agent_tasks")
      .update({
        status: "completed",
        output,
        completed_at: new Date().toISOString(),
      })
      .eq("id", taskId);
  } catch (err) {
    console.warn("[agentOrchestrator] update task threw:", err);
  }
}

async function pollForCompletion(
  userId: string,
  taskId: string,
  startedAt: number,
): Promise<string | null> {
  const deadline = startedAt + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const { data, error } = await loose()
        .from("event_queue")
        .select("payload, created_at")
        .eq("user_id", userId)
        .eq("event_type", "agent.completed")
        .order("created_at", { ascending: false })
        .limit(5);
      if (!error && Array.isArray(data)) {
        const match = data.find(
          (row) => (row.payload as { taskId?: string } | undefined)?.taskId === taskId,
        );
        if (match) {
          const payload = match.payload as { output?: string } | undefined;
          return payload?.output ?? null;
        }
      }
    } catch {
      /* poll best-effort */
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return null;
}

/**
 * Run a single agent execution end to end.
 *
 * Steps:
 *   1. Insert a pending row into `agent_tasks`.
 *   2. Invoke `agent-executor` with the assembled prompt.
 *   3. On success, update the task row.
 *   4. Poll `event_queue` briefly for an `agent.completed` event,
 *      falling back to the direct invoke output on timeout.
 */
export async function runAgent(params: RunAgentParams): Promise<AgentResult> {
  const startedAt = Date.now();
  const taskId = (await insertPendingTask(params)) ?? "";

  try {
    const { data, error } = await loose().functions.invoke("agent-executor", {
      body: {
        taskId,
        userId: params.userId,
        planId: params.planId,
        prompt: params.prompt,
        systemPrompt: params.systemPrompt,
        model: params.model ?? "claude-sonnet-4-6",
        maxTokens: params.maxTokens ?? 1024,
        temperature: params.temperature ?? 0.7,
      },
    });

    if (error) {
      return {
        output: "",
        status: "failed",
        error: error.message,
        taskId,
      };
    }

    const directOutput = data?.output ?? data?.text ?? "";
    if (taskId) {
      await markTaskCompleted(taskId, directOutput);
    }

    // Best-effort poll for the async event. If the queue-processor already
    // emitted an event, we return the richer payload. Otherwise we fall
    // back to the direct invoke response.
    let pollOutput: string | null = null;
    if (taskId) {
      pollOutput = await pollForCompletion(params.userId, taskId, startedAt);
    }

    return {
      output: pollOutput ?? directOutput,
      status: pollOutput === null && !directOutput ? "timeout" : "completed",
      taskId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      output: "",
      status: "failed",
      error: message,
      taskId,
    };
  }
}

/**
 * Helper used by Wizard.tsx (and other pages that compose marketing
 * copy) to build the system prompt passed to the agent executor.
 */
export function buildCopyPrompt(formData: {
  productDescription?: string;
  mainGoal?: string;
  businessField?: string;
}): string {
  const parts: string[] = [];
  if (formData.productDescription) parts.push(`Product: ${formData.productDescription}`);
  if (formData.mainGoal) parts.push(`Goal: ${formData.mainGoal}`);
  if (formData.businessField) parts.push(`Industry: ${formData.businessField}`);
  parts.push("Write one short, punchy marketing headline in Hebrew.");
  return parts.join("\n");
}
