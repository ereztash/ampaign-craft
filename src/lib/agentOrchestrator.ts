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
//   4. Listens for an `agent.completed` event via Supabase Realtime
//      (postgres_changes on `event_queue`) for up to 30 seconds,
//      falling back to the direct invoke result if none arrives.
//
// Realtime vs. polling rationale
// ────────────────────────────────
// The previous implementation polled the `event_queue` table via REST
// every 1 000 ms for up to 30 seconds — up to 30 HTTP round-trips per
// runAgent() call. Under concurrent users this compounds into
// significant REST API load.
//
// Supabase Realtime uses a single persistent WebSocket multiplexed
// across all channels in the tab. Subscribing to a channel costs one
// message on the existing socket; receiving the event costs nothing
// extra. The subscription is cleaned up immediately on resolution or
// timeout, so no channel accumulates between calls.
//
// The function gracefully degrades when:
//   - Realtime is not enabled on `event_queue` (timeout fires, directOutput returned)
//   - The WebSocket connection fails (CHANNEL_ERROR status → resolve null immediately)
//   - The event never arrives within 30 s (timeout → directOutput)
//
// Gracefully degrades when the schema pieces don't exist yet —
// any supabase error is swallowed and the direct response is
// still returned, so this function is safe to call from a UI.
// ═══════════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

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

const COMPLETION_TIMEOUT_MS = 30_000;

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

// ── Realtime event listener ───────────────────────────────────────────

/**
 * Wait for an `agent.completed` event on the `event_queue` table via
 * Supabase Realtime (single WebSocket message, zero polling overhead).
 *
 * Returns the enriched `output` string from the event payload, or null
 * if the event does not arrive within `COMPLETION_TIMEOUT_MS`.
 *
 * The Realtime channel is always cleaned up before resolution (either
 * on event receipt, timeout, or subscription error) — no channel leak.
 */
async function waitForCompletionEvent(
  userId: string,
  taskId: string,
): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    let settled = false;
    let channel: RealtimeChannel | null = null;

    /** Call once — subsequent calls are no-ops (guards against double cleanup). */
    const settle = (output: string | null): void => {
      if (settled) return;
      settled = true;
      if (channel) {
        // Fire-and-forget: removeChannel is async but we don't need to await it.
        void supabase.removeChannel(channel);
        channel = null;
      }
      resolve(output);
    };

    // Hard deadline — fires if no event arrives or subscription fails.
    const timer = setTimeout(() => settle(null), COMPLETION_TIMEOUT_MS);

    channel = supabase
      .channel(`agent-task-${taskId}`, {
        config: { broadcast: { ack: false } },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_queue",
          // Row-level filter: only events for this user.
          // Requires Realtime to be enabled and the filter column indexed.
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new;
          if (row?.event_type !== "agent.completed") return;

          // Match on task ID embedded in the event payload.
          const eventPayload = row?.payload as
            | { taskId?: string; output?: string }
            | undefined;
          if (eventPayload?.taskId !== taskId) return;

          clearTimeout(timer);
          settle(eventPayload?.output ?? null);
        },
      )
      .subscribe((status: string) => {
        // Graceful degradation: if the subscription cannot be established
        // (Realtime not enabled, network error, etc.), resolve immediately
        // so the caller falls back to the direct invoke output.
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timer);
          settle(null);
        }
      });
  });
}

// ═══════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════

/**
 * Run a single agent execution end to end.
 *
 * Steps:
 *   1. Insert a pending row into `agent_tasks`.
 *   2. Invoke `agent-executor` with the assembled prompt.
 *   3. On success, update the task row.
 *   4. Subscribe to `event_queue` via Realtime for up to 30 s,
 *      falling back to the direct invoke output on timeout.
 */
export async function runAgent(params: RunAgentParams): Promise<AgentResult> {
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

    // Best-effort wait for the richer async event payload.
    // Uses Realtime (one WebSocket message) instead of polling (≤30 REST calls).
    let eventOutput: string | null = null;
    if (taskId) {
      eventOutput = await waitForCompletionEvent(params.userId, taskId);
    }

    return {
      output: eventOutput ?? directOutput,
      status: eventOutput === null && !directOutput ? "timeout" : "completed",
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
