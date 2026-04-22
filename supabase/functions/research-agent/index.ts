// ═══════════════════════════════════════════════
// Research Agent — Edge Function for deep research queries
// Uses Claude Opus for high-quality strategic analysis.
// Called by the research orchestrator for complex queries.
// ═══════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders, corsDenied, isOriginAllowed } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isOriginAllowed(req)) return corsDenied(req);

  // Opus-tier endpoint — most expensive model in the stack ($0.075/1k tok).
  // 5 calls/min/IP — a legit user shouldn't burst through this; cost cap.
  const rl = checkRateLimit(req, "research-agent", 5, 60_000);
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

  try {
    const { question, domain, context, model } = await req.json();

    if (!question) {
      return new Response(JSON.stringify({ error: "question is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = buildSystemPrompt(domain, context);
    const userPrompt = buildUserPrompt(question, domain, context);

    // Use Opus for deep research, Sonnet for standard
    const selectedModel = model || "claude-opus-4-6";
    const maxTokens = 4096;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: maxTokens,
        temperature: 0.1,
        // Cache the system prompt. Research queries often share the same
        // (domain, context) pair within a single session, so subsequent
        // calls within the 5-minute TTL read the prefix at ~0.1x cost.
        system: [
          { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
        ],
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: data.error?.message || `API error: ${response.status}`,
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

    return new Response(
      JSON.stringify({
        text,
        tokensUsed: inputTokens + outputTokens,
        inputTokens,
        outputTokens,
        model: selectedModel,
        domain,
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

function buildSystemPrompt(domain?: string, context?: Record<string, string>): string {
  const base = "You are a senior strategic research analyst specializing in the Israeli market. Provide thorough, evidence-based analysis. Always respond in valid JSON.";

  const domainContext: Record<string, string> = {
    regulatory: "Focus on Israeli advertising law (חוק הגנת הצרכן), privacy regulations, and industry compliance requirements.",
    market: "Focus on Israeli market dynamics, competitor landscape, pricing benchmarks, and consumer behavior trends.",
    marketing: "Focus on digital marketing channels effective in Israel, Hebrew content strategies, and emerging technologies (RCS, WhatsApp Business, GenAI).",
  };

  const parts = [base];
  if (domain && domainContext[domain]) {
    parts.push(domainContext[domain]);
  }
  if (context?.industry) {
    parts.push(`Industry context: ${context.industry}`);
  }

  return parts.join("\n");
}

function buildUserPrompt(question: string, domain?: string, context?: Record<string, string>): string {
  return `Research question: ${question}
${domain ? `Domain: ${domain}` : ""}
${context?.industry ? `Industry: ${context.industry}` : ""}
${context?.audienceType ? `Audience: ${context.audienceType}` : ""}
${context?.mainGoal ? `Business goal: ${context.mainGoal}` : ""}
Country: Israel

Provide your analysis as a JSON object:
{
  "findings": [
    {
      "insight_he": "תובנה בעברית",
      "insight_en": "insight in English",
      "evidence": "supporting evidence",
      "confidence": 0.0-1.0,
      "actionable": true/false,
      "recommendation_he": "המלצה בעברית",
      "recommendation_en": "recommendation in English"
    }
  ],
  "summary_he": "סיכום בעברית",
  "summary_en": "summary in English"
}`;
}
