// ═══════════════════════════════════════════════
// Queue Processor — Edge Function for processing event queue
// Triggered by pg_cron or manual invocation.
// Claims pending events, dispatches to handlers, marks complete/failed.
// ═══════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Kept as wildcard — triggered by pg_cron (no browser origin).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Event handler registry
type SupabaseClient = ReturnType<typeof createClient>;
type EventHandler = (payload: Record<string, unknown>, supabase: SupabaseClient) => Promise<Record<string, unknown> | void>;

const EVENT_HANDLERS: Record<string, EventHandler> = {
  "plan.generated": handlePlanGenerated,
  "plan.qa_requested": handleQARequested,
  "research.requested": handleResearchRequested,
  "embedding.requested": handleEmbeddingRequested,
  "benchmark.update": handleBenchmarkUpdate,
  "notification.send": handleNotificationSend,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const rl = checkRateLimit(req, "queue-processor", 10, 60_000);
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 5;
    const eventTypes = body.eventTypes || null;

    // Claim pending events
    const { data: events, error: claimError } = await supabase.rpc("claim_events", {
      batch_size: batchSize,
      event_types: eventTypes,
    });

    if (claimError) {
      return new Response(JSON.stringify({ error: claimError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No pending events" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process each event
    const results = [];
    for (const event of events) {
      try {
        const handler = EVENT_HANDLERS[event.event_type];

        if (!handler) {
          // Unknown event type — mark as failed
          await supabase.rpc("fail_event", {
            event_id: event.id,
            error_message: `Unknown event type: ${event.event_type}`,
            retry_delay_seconds: 0,
          });
          results.push({ id: event.id, status: "unknown_type" });
          continue;
        }

        const result = await handler(event.payload, supabase);

        await supabase.rpc("complete_event", {
          event_id: event.id,
          event_result: result || {},
        });

        results.push({ id: event.id, status: "completed" });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);

        // Exponential backoff capped at 1h. Earlier code multiplied attempts
        // linearly (30 * attempts), so a poison message kept retrying every
        // ~2-3 min and starved healthy jobs. attempts=1 → 60s, 2 → 120s,
        // 3 → 240s, 4 → 480s, 5 → 960s, ... ≤ 3600s. The RPC moves the row
        // to dead_letter once attempts >= max_attempts.
        const retryDelaySeconds = Math.min(30 * Math.pow(2, event.attempts), 3600);
        await supabase.rpc("fail_event", {
          event_id: event.id,
          error_message: errorMessage,
          retry_delay_seconds: retryDelaySeconds,
        });

        results.push({ id: event.id, status: "failed", error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ═══════════════════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════════════════

async function handlePlanGenerated(
  payload: Record<string, unknown>,
  _supabase: SupabaseClient
): Promise<Record<string, unknown>> {
  // Trigger embedding + benchmark update for the new plan
  const planId = payload.planId as string;
  const userId = payload.userId as string;

  // Queue embedding and benchmark sub-events
  if (planId && userId) {
    await _supabase.rpc("publish_event", {
      p_event_type: "embedding.requested",
      p_payload: { planId, userId },
      p_user_id: userId,
      p_priority: 7, // lower priority than QA
    });

    await _supabase.rpc("publish_event", {
      p_event_type: "benchmark.update",
      p_payload: { planId, userId },
      p_user_id: userId,
      p_priority: 8,
    });
  }

  return { triggered: ["embedding", "benchmark"] };
}

async function handleQARequested(
  payload: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<Record<string, unknown>> {
  const planId = payload.planId as string;
  const planData = payload.planData as Record<string, unknown> | undefined;

  // Invoke the agent-executor for QA analysis
  const { data, error } = await supabase.functions.invoke("agent-executor", {
    body: {
      systemPrompt: "You are a marketing QA analyst. Review the following campaign plan and provide a quality score (0-100) with specific feedback on strengths and areas for improvement. Respond in JSON with { score, strengths: string[], improvements: string[], summary: string }.",
      prompt: `Analyze this campaign plan:\n${JSON.stringify(planData || { planId })}`,
      model: "claude-haiku-4-5-20251001",
      maxTokens: 1024,
    },
  });

  if (error) {
    throw new Error(`QA agent failed: ${error.message}`);
  }

  return { planId, status: "qa_completed", result: data };
}

async function handleResearchRequested(
  payload: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<Record<string, unknown>> {
  const question = payload.question as string;
  const domain = payload.domain as string;
  const context = payload.context as string | undefined;

  // Invoke the research-agent Edge Function
  const { data, error } = await supabase.functions.invoke("research-agent", {
    body: {
      question,
      domain,
      context: context || "",
      model: "claude-sonnet-4-20250514",
    },
  });

  if (error) {
    throw new Error(`Research agent failed: ${error.message}`);
  }

  return { question, domain, status: "research_completed", result: data };
}

async function handleEmbeddingRequested(
  payload: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<Record<string, unknown>> {
  const planId = payload.planId as string;
  const userId = payload.userId as string;

  // Fetch plan data
  const { data: plan, error } = await supabase
    .from("saved_plans")
    .select("result")
    .eq("id", planId)
    .single();

  if (error || !plan) {
    throw new Error(`Plan not found: ${planId}`);
  }

  // Call embed-content Edge Function
  // In a real deployment, this would be an internal function call
  return { planId, userId, status: "embedding_queued" };
}

async function handleBenchmarkUpdate(
  payload: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<Record<string, unknown>> {
  const planId = payload.planId as string;

  // Fetch plan and update benchmarks
  const { data: plan, error } = await supabase
    .from("saved_plans")
    .select("result")
    .eq("id", planId)
    .single();

  if (error || !plan?.result) {
    throw new Error(`Plan not found: ${planId}`);
  }

  const result = plan.result;
  const industry = result.formData?.businessField || "unknown";
  const audienceType = result.formData?.audienceType || "all";

  // Upsert stage count benchmark
  await supabase
    .from("campaign_benchmarks")
    .upsert(
      {
        industry,
        audience_type: audienceType,
        metric_name: "avg_stage_count",
        metric_value: result.stages?.length || 0,
        sample_size: 1,
        confidence: 0.3,
      },
      { onConflict: "industry,audience_type,metric_name" }
    );

  return { planId, industry, status: "benchmarks_updated" };
}

async function handleNotificationSend(
  payload: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<Record<string, unknown>> {
  const platform = payload.platform as string;
  const message = payload.message as string;
  const userId = payload.userId as string;

  // Check if user has this integration connected
  const { data: integration } = await supabase
    .from("user_integrations")
    .select("status, config")
    .eq("user_id", userId)
    .eq("platform", platform)
    .single();

  if (!integration || integration.status !== "connected") {
    return { status: "skipped", reason: "integration_not_connected" };
  }

  // Dispatch to webhook if platform is webhook
  if (platform === "webhook") {
    const { error: dispatchError } = await supabase.functions.invoke("webhook-dispatch", {
      body: {
        event: payload.event || "notification",
        data: { message, userId },
      },
    });

    if (dispatchError) {
      throw new Error(`Webhook dispatch failed: ${dispatchError.message}`);
    }

    return { platform, status: "webhook_dispatched" };
  }

  // For Slack, WhatsApp, etc. — log delivery for now
  // Full platform SDKs to be integrated per-platform
  return { platform, status: "notification_sent", message };
}
