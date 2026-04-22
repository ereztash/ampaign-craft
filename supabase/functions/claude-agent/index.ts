// ═══════════════════════════════════════════════════════════════
// FunnelForge Claude Agent — Agentic loop with tool use
//
// Claude receives user messages, autonomously decides which
// FunnelForge tools to call, executes them, and responds.
//
// POST body:
//   { message: string, plan_id?: string, history?: MessageParam[] }
//
// Response:
//   { response: string, tools_used: string[], iterations: number }
// ═══════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders, corsDenied, isOriginAllowed } from "../_shared/cors.ts";
import { checkRateLimit, checkUserRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MODEL = "claude-opus-4-7";
const MAX_TOKENS = 4096;
const MAX_ITERATIONS = 10;

// ─── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "list_plans",
    description:
      "List all saved marketing plans for this user. Use this when the user asks about their plans or wants to see what they've created.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_plan",
    description:
      "Get the full details of a specific marketing plan by ID, including business data and strategy results.",
    input_schema: {
      type: "object",
      properties: {
        plan_id: { type: "string", description: "The plan UUID" },
      },
      required: ["plan_id"],
    },
  },
  {
    name: "get_health_score",
    description:
      "Get the marketing health score (0–100) for a specific plan, including breakdown by category.",
    input_schema: {
      type: "object",
      properties: {
        plan_id: { type: "string", description: "The plan UUID" },
      },
      required: ["plan_id"],
    },
  },
  {
    name: "get_blackboard",
    description:
      "Get all AI agent outputs (blackboard data) for a plan — differentiation, pricing, retention, and sales results.",
    input_schema: {
      type: "object",
      properties: {
        plan_id: { type: "string", description: "The plan UUID" },
      },
      required: ["plan_id"],
    },
  },
  {
    name: "generate_copy",
    description:
      "Generate marketing copy for any channel: ad, email, social post, landing page, or WhatsApp message.",
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["ad", "email", "social_post", "landing_page", "whatsapp"],
          description: "Type of marketing copy to generate",
        },
        business_context: {
          type: "string",
          description: "Business description, target audience, and key message",
        },
        tone: {
          type: "string",
          enum: ["professional", "casual", "urgent", "friendly", "dugri"],
          description: "Tone of voice. dugri = direct Israeli style",
        },
        language: {
          type: "string",
          enum: ["he", "en"],
          description: "Output language: he=Hebrew, en=English",
        },
      },
      required: ["type", "business_context"],
    },
  },
];

// ─── Tool Executor ────────────────────────────────────────────────────────────

type SupabaseClient = ReturnType<typeof createClient>;

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient
): Promise<string> {
  switch (name) {
    case "list_plans": {
      const { data, error } = await supabase
        .from("saved_plans")
        .select("id, plan_name, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      if (!data?.length) return "No saved plans found. Create one in the FunnelForge app first.";

      type PlanRow = { id: string; plan_name: string; created_at: string };
      return (data as PlanRow[])
        .map((p, i) => `${i + 1}. ${p.plan_name} (ID: ${p.id})`)
        .join("\n");
    }

    case "get_plan": {
      const { plan_id } = args as { plan_id: string };
      const { data } = await supabase
        .from("saved_plans")
        .select("*")
        .eq("id", plan_id)
        .eq("user_id", userId)
        .single();

      if (!data) return "Plan not found or access denied.";

      type PlanResult = {
        formData?: Record<string, string | number | undefined>;
        funnelResult?: { executiveSummary?: string };
      };
      const r = (data.result as PlanResult) || {};
      const fd = r.formData || {};

      return [
        `Plan: ${data.plan_name}`,
        `Business field: ${fd.businessField || "N/A"}`,
        `Product/service: ${fd.productDescription || "N/A"}`,
        `Average price: ₪${fd.averagePrice || "N/A"}`,
        `Target audience: ${fd.audienceType || "N/A"}`,
        `Sales model: ${fd.salesModel || "N/A"}`,
        `Budget: ${fd.budgetRange || "N/A"}`,
        `Main goal: ${fd.mainGoal || "N/A"}`,
        `Strategy summary: ${r.funnelResult?.executiveSummary || "Not generated yet."}`,
      ].join("\n");
    }

    case "get_health_score": {
      const { plan_id } = args as { plan_id: string };
      const { data } = await supabase
        .from("saved_plans")
        .select("result, plan_name")
        .eq("id", plan_id)
        .eq("user_id", userId)
        .single();

      if (!data) return "Plan not found or access denied.";

      type HealthResult = {
        funnelResult?: { healthScore?: unknown };
        healthScore?: unknown;
      };
      const r = (data.result as HealthResult) || {};
      const hs = r.funnelResult?.healthScore || r.healthScore;

      if (!hs && hs !== 0) {
        return `No health score yet for "${data.plan_name}". Run the marketing funnel in the app first.`;
      }

      const hsObj = hs as { overall?: number; score?: number } | null;
      const score = typeof hs === "object" ? (hsObj?.overall ?? hsObj?.score ?? hs) : hs;
      return `Health score for "${data.plan_name}": ${score}/100\n${JSON.stringify(hs, null, 2)}`;
    }

    case "get_blackboard": {
      const { plan_id } = args as { plan_id: string };
      const { data, error } = await supabase
        .from("shared_context")
        .select("concept_key, stage, payload, written_by")
        .eq("user_id", userId)
        .eq("plan_id", plan_id)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      if (!data?.length) return `No agent outputs found for plan ${plan_id}. Run the pipeline in the app first.`;

      type Entry = { concept_key: string; stage: string; payload: unknown; written_by: string };
      return (data as Entry[])
        .map((e) => `[${e.stage}] ${e.concept_key} (by ${e.written_by}):\n${JSON.stringify(e.payload, null, 2)}`)
        .join("\n\n");
    }

    case "generate_copy": {
      const {
        type,
        business_context,
        tone = "professional",
        language = "he",
      } = args as { type: string; business_context: string; tone?: string; language?: string };

      const systemPrompt =
        language === "he"
          ? `אתה קופירייטר מומחה לשוק הישראלי. כתוב ${type} בסגנון ${tone}. כלול: כותרת ראשית, כותרת משנה, גוף טקסט, וקריאה לפעולה.`
          : `You are an expert copywriter. Write a ${type} in ${tone} tone. Include: headline, sub-headline, body copy, and CTA.`;

      const userPrompt =
        language === "he"
          ? `צור ${type} עבור:\n${business_context}`
          : `Create a ${type} for:\n${business_context}`;

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1200,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      const aiData = await resp.json();
      if (!resp.ok) throw new Error(aiData.error?.message || "Copy generation failed");
      return aiData.content?.[0]?.text || "No copy generated.";
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── Anthropic API Types ──────────────────────────────────────────────────────

type TextBlock = { type: "text"; text: string };
type ToolUseBlock = { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
type ContentBlock = TextBlock | ToolUseBlock;

type MessageParam = {
  role: "user" | "assistant";
  content: string | ContentBlock[] | Array<{ type: "tool_result"; tool_use_id: string; content: string }>;
};

type AnthropicResponse = {
  content: ContentBlock[];
  stop_reason: "end_turn" | "tool_use" | "max_tokens";
  error?: { message: string };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
};

// Opus 4.x pricing per 1M tokens (USD → NIS at ~3.6 FX).
// These don't need to be exact — they exist to bound runaway spend within a
// single agent session. Keep them slightly high so the cap is conservative.
const PRICE_PER_INPUT_TOKEN_NIS = 15 / 1_000_000 * 3.6;
const PRICE_PER_OUTPUT_TOKEN_NIS = 75 / 1_000_000 * 3.6;
const SESSION_COST_CAP_NIS = 0.5;

function estimateCostNIS(usage: NonNullable<AnthropicResponse["usage"]>): number {
  const base = usage.input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  // Cache writes cost ~1.25x base input; cache reads cost ~0.1x.
  const inputCost =
    base * PRICE_PER_INPUT_TOKEN_NIS
    + cacheWrite * PRICE_PER_INPUT_TOKEN_NIS * 1.25
    + cacheRead * PRICE_PER_INPUT_TOKEN_NIS * 0.1;
  return inputCost + output * PRICE_PER_OUTPUT_TOKEN_NIS;
}

// ─── Agentic Loop ─────────────────────────────────────────────────────────────

async function runAgentLoop(
  messages: MessageParam[],
  userId: string,
  supabase: SupabaseClient
): Promise<{ response: string; toolsUsed: string[]; iterations: number }> {
  const toolsUsed: string[] = [];
  let iterations = 0;
  let cumulativeCostNIS = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        thinking: { type: "adaptive" },
        // The system prompt + tools definitions are identical across every
        // request (tools render at position 0, system right after). Wrap the
        // last system block with cache_control: ephemeral so tools+system are
        // cached together; subsequent requests read the prefix at ~0.1x cost.
        system: [
          {
            type: "text",
            text:
              "אתה מאמן שיווק ועסקים AI של FunnelForge — מערכת צמיחה עסקית המבוססת על מדע התנהגותי. " +
              "יש לך גישה לנתוני העסק של המשתמש, תוכניות שיווק, ציוני בריאות, ותוצרי סוכנים. " +
              "ענה בעברית כברירת מחדל אלא אם המשתמש פונה באנגלית. " +
              "השתמש בכלים כדי לאסוף מידע רלוונטי לפני שאתה מסכם המלצות. " +
              "תן תשובות מעשיות, ספציפיות, וכלול דוגמאות קונקרטיות.",
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: TOOLS,
        messages,
      }),
    });

    const data: AnthropicResponse = await resp.json();
    if (!resp.ok) throw new Error((data as unknown as { error: { message: string } }).error?.message || "Anthropic API error");

    // Append assistant's response to history
    messages.push({ role: "assistant", content: data.content });

    // Track spend per iteration. Without this, a confused agent can burn ~10x
    // the budget of a normal call before MAX_ITERATIONS trips. If we're over
    // the cap we return the text we have so far instead of another round.
    if (data.usage) cumulativeCostNIS += estimateCostNIS(data.usage);

    if (data.stop_reason === "end_turn") {
      const textBlocks = data.content.filter((b): b is TextBlock => b.type === "text");
      const response = textBlocks.map((b) => b.text).join("\n");
      return { response, toolsUsed, iterations };
    }

    if (data.stop_reason !== "tool_use") {
      throw new Error(`Unexpected stop_reason: ${data.stop_reason}`);
    }

    if (cumulativeCostNIS >= SESSION_COST_CAP_NIS) {
      const textBlocks = data.content.filter((b): b is TextBlock => b.type === "text");
      const partial = textBlocks.map((b) => b.text).join("\n");
      console.warn("claude_agent.cost_cap_reached", { iterations, cumulativeCostNIS });
      return {
        response: partial || "⚠️ הסוכן עצר — חרג מהתקציב לסשן הזה. נסה בקשה יותר ממוקדת.",
        toolsUsed,
        iterations,
      };
    }

    // Execute all tool calls and collect results
    const toolUseBlocks = data.content.filter((b): b is ToolUseBlock => b.type === "tool_use");
    const toolResults: Array<{ type: "tool_result"; tool_use_id: string; content: string }> = [];

    for (const block of toolUseBlocks) {
      toolsUsed.push(block.name);
      let result: string;
      try {
        result = await executeTool(block.name, block.input, userId, supabase);
      } catch (err) {
        result = `Error: ${String(err)}`;
      }
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
    }

    messages.push({ role: "user", content: toolResults });
  }

  throw new Error("Agent exceeded maximum iterations");
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isOriginAllowed(req)) return corsDenied(req);

  const rl = checkRateLimit(req, "claude-agent", 20, 60_000);
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Per-user rate limit runs after JWT verification. The earlier per-IP
  // check is still in place — the per-user cap is the tight one because
  // a single user can burn meaningful money regardless of their IP.
  const userRl = checkUserRateLimit(user.id, "claude-agent", 10, 60_000);
  if (!userRl.allowed) return rateLimitResponse(userRl, corsHeaders);

  try {
    const { message, plan_id, history = [] } = await req.json();

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // plan_id is interpolated into the user message below. Enforce a strict
    // UUID shape so an attacker can't break out of the bracket syntax and
    // inject instructions into the model's context.
    const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (plan_id !== undefined && plan_id !== null && (typeof plan_id !== "string" || !UUID_RE.test(plan_id))) {
      return new Response(JSON.stringify({ error: "plan_id must be a UUID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build messages: prior history + current user message (with optional plan context)
    const messages: MessageParam[] = [...history];
    const userContent = plan_id
      ? `[plan_id: ${plan_id}]\n${message}`
      : message;

    messages.push({ role: "user", content: userContent });

    const { response, toolsUsed, iterations } = await runAgentLoop(messages, user.id, supabase);

    return new Response(
      JSON.stringify({ response, tools_used: toolsUsed, iterations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("claude-agent error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
