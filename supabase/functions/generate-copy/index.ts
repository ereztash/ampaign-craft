import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders, corsDenied, isOriginAllowed } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import {
  classifyAnthropicError,
  errorResponse,
  internalError,
  missingApiKeyError,
  networkError,
  unauthorizedError,
} from "../_shared/anthropicError.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isOriginAllowed(req)) return corsDenied(req);

  const rl = checkRateLimit(req, "generate-copy", 20, 60_000);
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  if (!ANTHROPIC_API_KEY) {
    return errorResponse(missingApiKeyError(), corsHeaders);
  }

  // Verify JWT
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return errorResponse(unauthorizedError(), corsHeaders);
  }

  try {
    const { prompt, systemPrompt, model, maxTokens } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const selectedModel = model || "claude-haiku-4-5-20251001";
    const selectedMaxTokens = Math.min(maxTokens || 1024, 8192);

    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: selectedModel,
          max_tokens: selectedMaxTokens,
          system: systemPrompt || "You are an expert marketing copywriter.",
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } catch (fetchErr) {
      return errorResponse(networkError(fetchErr), corsHeaders);
    }

    const data = await response.json();

    if (!response.ok) {
      return errorResponse(classifyAnthropicError(response, data), corsHeaders);
    }

    const text = data.content?.[0]?.text || "";
    const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

    return new Response(JSON.stringify({ text, tokensUsed, model: selectedModel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return errorResponse(internalError(err), corsHeaders);
  }
});
