// ═══════════════════════════════════════════════
// Agent Executor — Generic Edge Function for LLM agents
// Receives system prompt + user prompt + model config,
// calls Claude API, returns structured output.
// Used by createLLMAgent() in the blackboard pipeline.
// ═══════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders, corsDenied, isOriginAllowed } from "../_shared/cors.ts";
import { checkRateLimit, checkUserRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { requireString, optionalString, requireEnum, ValidationError } from "../_shared/validate.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isOriginAllowed(req)) return corsDenied(req);

  // Generic LLM agent endpoint — driven by the blackboard pipeline.
  // 30 calls/min/IP allows a 13-agent pipeline run plus headroom.
  const rl = checkRateLimit(req, "agent-executor", 30, 60_000);
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify JWT
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Per-user cap: a 13-agent blackboard run is ~13 calls, so allow 20/min
  // per user to give headroom for one run plus a few retries.
  const userRl = checkUserRateLimit(user.id, "agent-executor", 20, 60_000);
  if (!userRl.allowed) return rateLimitResponse(userRl, corsHeaders);

  // Allowlist of models the client may request. Without this an
  // authenticated user could drive our Anthropic bill through the
  // most-expensive Opus tier.
  const ALLOWED_MODELS = [
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-6",
    "claude-sonnet-4-20250514",
    "claude-opus-4-7",
    "claude-opus-4-6",
  ] as const;

  try {
    const body = await req.json();
    const prompt = requireString(body?.prompt, "prompt", 24_000);
    // System prompt is free-form but bounded. Injection is expected here
    // because this function is called by trusted server-side code, but a
    // 24KB cap prevents a caller from wedging Claude with a megaprompt.
    const systemPrompt = optionalString(body?.systemPrompt, "systemPrompt", 24_000);
    const model = body?.model === undefined
      ? "claude-haiku-4-5-20251001"
      : requireEnum(body.model, "model", ALLOWED_MODELS);
    const rawMaxTokens = typeof body?.maxTokens === "number" ? body.maxTokens : 2048;
    if (rawMaxTokens < 1 || rawMaxTokens > 8192) {
      throw new ValidationError("maxTokens must be in [1, 8192]");
    }
    const selectedMaxTokens = Math.floor(rawMaxTokens);
    const rawTemp = body?.temperature;
    if (rawTemp !== undefined && (typeof rawTemp !== "number" || rawTemp < 0 || rawTemp > 2)) {
      throw new ValidationError("temperature must be in [0, 2]");
    }
    const selectedTemperature = typeof rawTemp === "number" ? rawTemp : 0;
    const selectedModel = model;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: selectedMaxTokens,
        temperature: selectedTemperature,
        system: systemPrompt || "You are a helpful assistant. Respond in JSON when asked.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: data.error?.message || `API error: ${response.status}`,
          status: response.status,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const text = data.content?.[0]?.text || "";
    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;
    const tokensUsed = inputTokens + outputTokens;

    return new Response(
      JSON.stringify({
        text,
        tokensUsed,
        inputTokens,
        outputTokens,
        model: selectedModel,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    if (err instanceof ValidationError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
