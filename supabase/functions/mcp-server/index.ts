// ═══════════════════════════════════════════════════════════════
// FunnelForge MCP Server — Model Context Protocol (Streamable HTTP)
//
// Exposes FunnelForge tools to Claude Desktop / Claude Code.
// Protocol: MCP 2024-11-05 (Streamable HTTP transport)
//
// Claude Desktop config (claude_desktop_config.json):
// {
//   "mcpServers": {
//     "funnelforge": {
//       "type": "http",
//       "url": "https://<project>.supabase.co/functions/v1/mcp-server",
//       "headers": { "Authorization": "Bearer <supabase-jwt>" }
//     }
//   }
// }
// ═══════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { classifyAnthropicError } from "../_shared/anthropicError.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const MCP_VERSION = "2024-11-05";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, mcp-session-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "list_plans",
    description:
      "רשימת כל התוכניות השיווקיות השמורות של המשתמש. " +
      "Returns all saved marketing plans with their IDs and names.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_plan",
    description:
      "קבל תוכנית שיווקית מלאה לפי מזהה. " +
      "Returns the full marketing plan including form data and strategy results.",
    inputSchema: {
      type: "object",
      properties: {
        plan_id: { type: "string", description: "The plan UUID" },
      },
      required: ["plan_id"],
    },
  },
  {
    name: "get_profile",
    description:
      "קבל פרטי פרופיל המשתמש. " +
      "Returns the authenticated user's profile information.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_blackboard",
    description:
      "קבל את כל נתוני ה-Blackboard לתוכנית — תוצאות כל הסוכנים. " +
      "Returns all blackboard entries (agent outputs) for a specific plan.",
    inputSchema: {
      type: "object",
      properties: {
        plan_id: { type: "string", description: "The plan UUID" },
      },
      required: ["plan_id"],
    },
  },
  {
    name: "ask_coach",
    description:
      "שאל את מאמן השיווק AI שאלה. הוא מכיר את העסק שלך לעומק. " +
      "Ask the AI business coach a question. Optionally provide a plan_id for context.",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Your question or request in Hebrew or English",
        },
        plan_id: {
          type: "string",
          description: "Optional plan UUID to provide business context",
        },
      },
      required: ["message"],
    },
  },
  {
    name: "generate_copy",
    description:
      "צור תוכן שיווקי (מודעה, אימייל, פוסט, WhatsApp, דף נחיתה). " +
      "Generate marketing copy for any channel.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["ad", "email", "social_post", "landing_page", "whatsapp"],
          description: "Type of marketing copy",
        },
        business_context: {
          type: "string",
          description:
            "Business description, target audience, and key message",
        },
        tone: {
          type: "string",
          enum: ["professional", "casual", "urgent", "friendly", "dugri"],
          description:
            "Tone of voice (dugri = direct Israeli style). Default: professional",
        },
        language: {
          type: "string",
          enum: ["he", "en"],
          description: "Output language: he=Hebrew, en=English. Default: he",
        },
      },
      required: ["type", "business_context"],
    },
  },
  {
    name: "get_agent_tasks",
    description:
      "קבל היסטוריית משימות סוכני ה-AI, כולל עלויות וטוקנים. " +
      "Returns AI agent task history with status, tokens used, and cost.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max results to return (default 10, max 50)",
        },
        status: {
          type: "string",
          enum: ["pending", "running", "completed", "failed"],
          description: "Filter by task status",
        },
      },
      required: [],
    },
  },
  {
    name: "get_health_score",
    description:
      "קבל ציון הבריאות השיווקית של העסק לפי תוכנית. " +
      "Returns the marketing health score breakdown for a plan.",
    inputSchema: {
      type: "object",
      properties: {
        plan_id: { type: "string", description: "The plan UUID" },
      },
      required: ["plan_id"],
    },
  },
];

// ─── Tool Handlers ────────────────────────────────────────────────────────────

type SupabaseClient = ReturnType<typeof createClient>;

async function handleTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient
): Promise<string> {
  switch (name) {
    // ── list_plans ──────────────────────────────────────────────
    case "list_plans": {
      const { data, error } = await supabase
        .from("saved_plans")
        .select("id, plan_name, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(`DB error: ${error.message}`);
      if (!data || data.length === 0) {
        return "אין תוכניות שמורות עדיין.\nNo saved plans yet. Create one through the FunnelForge app first.";
      }

      type PlanRow = { id: string; plan_name: string; created_at: string };
      const list = (data as PlanRow[])
        .map(
          (p, i) =>
            `${i + 1}. **${p.plan_name}**\n   ID: \`${p.id}\`\n   Created: ${new Date(p.created_at).toLocaleDateString("he-IL")}`
        )
        .join("\n\n");

      return `נמצאו ${data.length} תוכניות שמורות:\n\n${list}`;
    }

    // ── get_plan ─────────────────────────────────────────────────
    case "get_plan": {
      const { plan_id } = args as { plan_id: string };
      const { data, error } = await supabase
        .from("saved_plans")
        .select("*")
        .eq("id", plan_id)
        .eq("user_id", userId)
        .single();

      if (!data) throw new Error("Plan not found or access denied");

      type PlanResult = {
        formData?: Record<string, unknown>;
        funnelResult?: { executiveSummary?: string };
        summary?: string;
      };
      const result = (data.result as PlanResult | null) || {};
      const fd = (result.formData || {}) as Record<string, string | undefined>;

      const lines = [
        `# ${data.plan_name}`,
        `**ID:** \`${data.id}\``,
        `**Created:** ${new Date(data.created_at).toLocaleDateString("he-IL")}`,
        "",
        "## פרטי העסק / Business Details",
        fd.businessField ? `- **תחום:** ${fd.businessField}` : "",
        fd.productDescription
          ? `- **מוצר/שירות:** ${fd.productDescription}`
          : "",
        fd.averagePrice ? `- **מחיר ממוצע:** ₪${fd.averagePrice}` : "",
        fd.audienceType ? `- **קהל יעד:** ${fd.audienceType}` : "",
        fd.salesModel ? `- **מודל מכירות:** ${fd.salesModel}` : "",
        fd.budgetRange ? `- **תקציב:** ${fd.budgetRange}` : "",
        fd.mainGoal ? `- **מטרה עיקרית:** ${fd.mainGoal}` : "",
        fd.existingChannels ? `- **ערוצים קיימים:** ${fd.existingChannels}` : "",
        "",
        "## תמצית אסטרטגיה / Strategy Summary",
        result.funnelResult?.executiveSummary ||
          result.summary ||
          "Run the funnel engine in the app to generate a full strategy.",
      ]
        .filter((l) => l !== "")
        .join("\n");

      return lines;
    }

    // ── get_profile ──────────────────────────────────────────────
    case "get_profile": {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, visit_count")
        .eq("id", userId)
        .single();

      return [
        "# פרופיל משתמש / User Profile",
        `- **User ID:** \`${userId}\``,
        `- **Display Name:** ${data?.display_name || "Not set"}`,
        `- **Visit Count:** ${data?.visit_count || 0}`,
      ].join("\n");
    }

    // ── get_blackboard ───────────────────────────────────────────
    case "get_blackboard": {
      const { plan_id } = args as { plan_id: string };
      const { data, error } = await supabase
        .from("shared_context")
        .select("concept_key, stage, payload, written_by, created_at")
        .eq("user_id", userId)
        .eq("plan_id", plan_id)
        .order("created_at", { ascending: false });

      if (error) throw new Error(`DB error: ${error.message}`);
      if (!data || data.length === 0) {
        return `אין נתוני Blackboard לתוכנית \`${plan_id}\`.\nNo blackboard data found. Run the pipeline in the app first.`;
      }

      type BlackboardEntry = {
        concept_key: string;
        stage: string;
        payload: unknown;
        written_by: string;
        created_at: string;
      };
      const entries = (data as BlackboardEntry[])
        .map(
          (e) =>
            `### ${e.concept_key} [${e.stage}]\n**Written by:** ${e.written_by}\n\`\`\`json\n${JSON.stringify(e.payload, null, 2)}\n\`\`\``
        )
        .join("\n\n");

      return `# Blackboard — Plan \`${plan_id}\`\n\n${entries}`;
    }

    // ── ask_coach ────────────────────────────────────────────────
    case "ask_coach": {
      const { message, plan_id } = args as {
        message: string;
        plan_id?: string;
      };

      let planContext: Record<string, unknown> = {};
      if (plan_id) {
        const { data } = await supabase
          .from("saved_plans")
          .select("result, plan_name")
          .eq("id", plan_id)
          .eq("user_id", userId)
          .single();

        if (data?.result) {
          type CoachPlanResult = {
            formData?: Record<string, string | number | undefined>;
            funnelResult?: { executiveSummary?: string };
          };
          const r = data.result as CoachPlanResult;
          planContext = {
            planName: data.plan_name,
            businessField: r.formData?.businessField,
            productDescription: r.formData?.productDescription,
            averagePrice: r.formData?.averagePrice,
            audienceType: r.formData?.audienceType,
            salesModel: r.formData?.salesModel,
            mainGoal: r.formData?.mainGoal,
            executiveSummary: r.funnelResult?.executiveSummary,
          };
        }
      }

      const systemParts = [
        "אתה מאמן שיווק דיגיטלי ישראלי מומחה שמשלב מדע התנהגותי (Cialdini, Kahneman), נוירוקופירייטינג, ופסיכולוגיית מכירות (SPIN, Challenger).",
        "דבר בעברית, בסגנון ישיר ומקצועי. תן תשובות מעשיות עם דוגמאות קונקרטיות.",
        "בסוף כל תשובה — כתוב 3 פעולות שניתן לבצע מיד.",
      ];

      if (planContext.planName) {
        systemParts.push(`\n=== תוכנית: ${planContext.planName} ===`);
      }
      if (planContext.businessField) {
        systemParts.push(`תחום: ${planContext.businessField}`);
      }
      if (planContext.productDescription) {
        systemParts.push(`מוצר/שירות: ${planContext.productDescription}`);
      }
      if (planContext.averagePrice) {
        systemParts.push(`מחיר ממוצע: ₪${planContext.averagePrice}`);
      }
      if (planContext.audienceType) {
        systemParts.push(`קהל יעד: ${planContext.audienceType}`);
      }
      if (planContext.executiveSummary) {
        systemParts.push(
          `\nתמצית אסטרטגיה:\n${planContext.executiveSummary}`
        );
      }

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1500,
          system: systemParts.join("\n"),
          messages: [{ role: "user", content: message }],
        }),
      });

      const aiData = await resp.json();
      if (!resp.ok) {
        const classified = classifyAnthropicError(resp, aiData);
        throw new Error(`[${classified.code}] ${classified.error}`);
      }
      return aiData.content?.[0]?.text || "No response from coach.";
    }

    // ── generate_copy ────────────────────────────────────────────
    case "generate_copy": {
      const {
        type,
        business_context,
        tone = "professional",
        language = "he",
      } = args as {
        type: string;
        business_context: string;
        tone?: string;
        language?: string;
      };

      const typeLabels: Record<string, { he: string; en: string }> = {
        ad: { he: "מודעה פרסומית", en: "Advertisement" },
        email: { he: "אימייל שיווקי", en: "Marketing Email" },
        social_post: { he: "פוסט לרשתות חברתיות", en: "Social Media Post" },
        landing_page: { he: "תוכן לדף נחיתה", en: "Landing Page Copy" },
        whatsapp: { he: "הודעת WhatsApp", en: "WhatsApp Message" },
      };
      const toneLabels: Record<string, { he: string; en: string }> = {
        professional: { he: "מקצועי", en: "professional" },
        casual: { he: "קליל וחברותי", en: "casual" },
        urgent: { he: "דחוף ומניע לפעולה", en: "urgent" },
        friendly: { he: "חם וידידותי", en: "friendly" },
        dugri: { he: "דוגרי וישיר", en: "direct and no-nonsense" },
      };

      const typeLabel =
        (language === "he"
          ? typeLabels[type]?.he
          : typeLabels[type]?.en) || type;
      const toneLabel =
        (language === "he"
          ? toneLabels[tone]?.he
          : toneLabels[tone]?.en) || tone;

      const systemPrompt =
        language === "he"
          ? `אתה קופירייטר מומחה לשוק הישראלי עם התמחות בנוירוקופירייטינג.
כתוב ${typeLabel} בסגנון ${toneLabel}.
חובה לכלול:
1. כותרת ראשית מושכת (Headline)
2. כותרת משנה (Sub-headline)
3. גוף הטקסט
4. קריאה לפעולה (CTA) ברורה

השתמש בעברית תקנית, משלב מקצועי-יומיומי. אל תשתמש בביטויים שחוקים.`
          : `You are an expert copywriter specializing in neuro-copywriting.
Write a ${typeLabel} in ${toneLabel} tone.
Must include:
1. Compelling Headline
2. Sub-headline
3. Body copy
4. Clear Call-to-Action (CTA)

Use conversational yet professional language. Avoid clichés.`;

      const userPrompt =
        language === "he"
          ? `צור ${typeLabel} עבור:\n${business_context}`
          : `Create a ${typeLabel} for:\n${business_context}`;

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
      if (!resp.ok) {
        const classified = classifyAnthropicError(resp, aiData);
        throw new Error(`[${classified.code}] ${classified.error}`);
      }
      return aiData.content?.[0]?.text || "No copy generated.";
    }

    // ── get_agent_tasks ──────────────────────────────────────────
    case "get_agent_tasks": {
      const { limit = 10, status } = args as {
        limit?: number;
        status?: string;
      };

      let query = supabase
        .from("agent_tasks")
        .select(
          "id, agent_name, status, created_at, completed_at, tokens_used, cost_nis, error"
        )
        .order("created_at", { ascending: false })
        .limit(Math.min(Number(limit), 50));

      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) throw new Error(`DB error: ${error.message}`);
      if (!data || data.length === 0) return "No agent tasks found.";

      type AgentTaskRow = {
        id: string;
        agent_name: string;
        status: string;
        created_at: string;
        completed_at: string | null;
        tokens_used: number | null;
        cost_nis: number | null;
        error: string | null;
      };
      const rows = (data as AgentTaskRow[])
        .map(
          (t) =>
            `- **${t.agent_name}** [${t.status}]\n  Created: ${new Date(t.created_at).toLocaleString("he-IL")}\n  Tokens: ${t.tokens_used || 0} | Cost: ₪${Number(t.cost_nis || 0).toFixed(4)}\n  ${t.error ? `⚠️ Error: ${t.error}` : ""}`
        )
        .join("\n\n");

      return `## Agent Task History\n\n${rows}`;
    }

    // ── get_health_score ─────────────────────────────────────────
    case "get_health_score": {
      const { plan_id } = args as { plan_id: string };
      const { data, error } = await supabase
        .from("saved_plans")
        .select("result, plan_name")
        .eq("id", plan_id)
        .eq("user_id", userId)
        .single();

      if (!data) throw new Error("Plan not found or access denied");

      type HealthResult = {
        funnelResult?: { healthScore?: unknown };
        healthScore?: unknown;
        marketingHealth?: unknown;
      };
      const result = (data.result as HealthResult | null) || {};
      const hs =
        result.funnelResult?.healthScore ||
        result.healthScore ||
        result.marketingHealth;

      if (!hs && hs !== 0) {
        return `Plan **${data.plan_name}** does not yet have a health score. Run the marketing funnel engine in the FunnelForge app to generate one.`;
      }

      const hsObj = hs as { overall?: number; score?: number } | null;
      const score = typeof hs === "object" ? hsObj?.overall ?? hsObj?.score ?? hs : hs;
      const breakdown =
        typeof hs === "object" ? JSON.stringify(hs, null, 2) : null;

      return [
        `# ציון בריאות שיווקית — ${data.plan_name}`,
        `**ציון כולל:** ${score}/100`,
        breakdown ? `\n\`\`\`json\n${breakdown}\n\`\`\`` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── JSON-RPC Helpers ─────────────────────────────────────────────────────────

function rpcResult(id: unknown, result: unknown) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function rpcError(id: unknown, code: number, message: string) {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const rl = checkRateLimit(req, "mcp-server", 200, 60_000);
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  // ── Auth ────────────────────────────────────────────────────────
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return rpcError(null, -32001, "Unauthorized: missing Authorization header");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user) {
    return rpcError(null, -32001, "Unauthorized: invalid or expired token");
  }

  // ── Parse body ──────────────────────────────────────────────────
  type JsonRpcRequest = {
    jsonrpc?: string;
    id?: unknown;
    method?: string;
    params?: { name?: string; arguments?: Record<string, unknown> };
  };
  let body: JsonRpcRequest;
  try {
    body = (await req.json()) as JsonRpcRequest;
  } catch {
    return rpcError(null, -32700, "Parse error: invalid JSON");
  }

  const { jsonrpc, id, method, params } = body;
  if (jsonrpc !== "2.0") {
    return rpcError(id, -32600, "Invalid Request: must be JSON-RPC 2.0");
  }

  // ── Route methods ───────────────────────────────────────────────
  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: MCP_VERSION,
        capabilities: { tools: {} },
        serverInfo: {
          name: "FunnelForge",
          version: "1.0.0",
          description:
            "מערכת צמיחה AI — גישה מלאה לנתוני השיווק שלך / AI Growth System — full access to your marketing data",
        },
      });

    case "notifications/initialized":
      // Client confirms initialization — no response body needed
      return new Response(null, { status: 204, headers: corsHeaders });

    case "ping":
      return rpcResult(id, {});

    case "tools/list":
      return rpcResult(id, { tools: TOOLS });

    case "tools/call": {
      const toolName: string | undefined = params?.name;
      const toolArgs: Record<string, unknown> = params?.arguments ?? {};

      if (!toolName) {
        return rpcError(id, -32602, "Invalid params: missing tool name");
      }

      if (!TOOLS.some((t) => t.name === toolName)) {
        return rpcError(id, -32602, `Unknown tool: ${toolName}`);
      }

      try {
        const text = await handleTool(toolName, toolArgs, user.id, supabase);
        return rpcResult(id, {
          content: [{ type: "text", text }],
        });
      } catch (err) {
        return rpcResult(id, {
          content: [{ type: "text", text: `Error: ${String(err)}` }],
          isError: true,
        });
      }
    }

    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
});
