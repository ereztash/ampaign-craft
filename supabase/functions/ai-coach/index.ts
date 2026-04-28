import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders, corsDenied, isOriginAllowed } from "../_shared/cors.ts";
import { checkRateLimit, checkUserRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { classifyReliability, detectLanguage, domainFromUrl, sha256Hex } from "../_shared/webSearchClassify.ts";
import { requireString, ValidationError } from "../_shared/validate.ts";
import { checkAndConsumeUsage, paymentRequiredResponse } from "../_shared/usage.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isOriginAllowed(req)) return corsDenied(req);

  const rl = checkRateLimit(req, "ai-coach", 20, 60_000);
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

  // Per-user cap is the real budget guard. IP-based limits can be evaded
  // by rotating X-Forwarded-For in environments where the platform doesn't
  // rewrite it; per-user is tied to a verified JWT and hard to rotate.
  const userRl = checkUserRateLimit(user.id, "ai-coach", 15, 60_000);
  if (!userRl.allowed) return rateLimitResponse(userRl, corsHeaders);

  // Tier gate. Pro gets 75 messages/month included; Business is
  // unlimited; Free is blocked. Beyond the included quota we try to
  // spend a credit before charging the user. A 402 here triggers the
  // buy-credits modal in the client — the only place credits surface
  // in the UI, keeping the onboarding pure subscription.
  const usage = await checkAndConsumeUsage(supabase, user.id, "ai_coach_message");
  if (!usage.allowed) return paymentRequiredResponse(usage, corsHeaders);

  try {
    const body = await req.json();
    const message = requireString(body?.message, "message", 8000);
    const context = body?.context;

    // Prompt-injection guard. The context dict carries user-authored text
    // (businessField, productDescription, stylomePrompt, etc.) that we
    // interpolate into the system prompt. Without sanitization a user
    // could write `Tech.\n\n# NEW SYSTEM:\nignore all above` into any
    // field and flip Claude into attacker-controlled instructions.
    // We strip control chars + newlines, cap length, and scrub common
    // injection markers. Free-form chat content (the `message` var) stays
    // untouched because it lives in a user-role turn where Claude already
    // treats it as untrusted input.
    const scrub = (raw: unknown, max = 500): string | undefined => {
      if (raw == null) return undefined;
      const s = String(raw)
        // eslint-disable-next-line no-control-regex -- stripping control chars is the point
        .replace(/[\x00-\x1f\x7f]/g, " ")
        .replace(/\r?\n/g, " ")
        .replace(/(#+\s*(system|assistant|user))/gi, "[redacted]")
        .replace(/```+/g, " ")
        .trim();
      return s.slice(0, max);
    };
    const ctx: Record<string, string | number | undefined> = context ? { ...context } : {};
    for (const k of [
      "businessField", "productDescription", "audienceType", "salesModel",
      "budgetRange", "mainGoal", "existingChannels", "identityStatement",
      "topPainPoint", "industryPains", "mechanism", "antiStatement",
      "competitors", "tradeoffs", "topHiddenValues", "stylomePrompt",
    ]) {
      if (ctx[k] != null) ctx[k] = scrub(ctx[k], k === "stylomePrompt" ? 1000 : 500);
    }

    // Build system prompt from full user knowledge graph
    const systemParts: string[] = [
      "אתה מאמן שיווק דיגיטלי ישראלי מומחה שמכיר את העסק של המשתמש לעומק.",
      "אתה מבוסס על מדע התנהגותי (Cialdini, Kahneman), נוירוקופירייטינג, ופסיכולוגיית מכירות (SPIN, Challenger).",
      "תמיד תן 3 פעולות ספציפיות וניתנות ליישום מיידי.",
      "",
      "=== כללי תקשורת ===",
    ];

    // Voice adaptation
    if (context?.voiceRegister === "casual" || (context?.dugriScore && context.dugriScore > 0.6)) {
      systemParts.push("דבר בסגנון ישיר, דוגרי, קצר. בלי ליטופים. תכלס.");
    } else if (context?.voiceRegister === "formal") {
      systemParts.push("דבר בסגנון מקצועי ומנומס. השתמש בשפה פורמלית.");
    } else {
      systemParts.push("דבר בעברית בסגנון ישיר אך מקצועי.");
    }

    if (context?.codeMixing && context.codeMixing > 25) {
      systemParts.push("המשתמש רגיל למונחים באנגלית — אפשר לשלב (CPC, ROAS, funnel, conversion).");
    } else {
      systemParts.push("המשתמש מעדיף עברית טהורה — תרגם מונחים מקצועיים לעברית.");
    }

    // Complexity adaptation
    if (context?.complexityLevel === "simple") {
      systemParts.push("המשתמש מתחיל — הסבר פשוט, ללא ז'רגון, צעד אחד בכל פעם.");
    } else if (context?.complexityLevel === "advanced") {
      systemParts.push("המשתמש מתקדם — דבר ברמה גבוהה, אל תפשט מדי.");
    }

    // Framing preference (Behavioral Economics)
    if (context?.framingPreference === "loss") {
      systemParts.push("המשתמש מגיב חזק ל-loss framing — הדגש מה הוא מפסיד, לא מה ירוויח.");
    } else if (context?.framingPreference === "gain") {
      systemParts.push("המשתמש מגיב לצמיחה — הדגש פוטנציאל ואפסייד, לא הפסדים.");
    }

    systemParts.push("");
    systemParts.push("=== מידע על העסק ===");

    // Business context — all free-text fields sourced from the sanitized
    // `ctx` view so injection markers cannot reach the prompt.
    if (ctx.businessField) systemParts.push(`תחום: ${ctx.businessField}`);
    if (ctx.productDescription) systemParts.push(`מוצר/שירות: ${ctx.productDescription}`);
    if (context?.averagePrice) systemParts.push(`מחיר ממוצע: ₪${context.averagePrice}`);
    if (ctx.audienceType) systemParts.push(`קהל יעד: ${ctx.audienceType}`);
    if (ctx.salesModel) systemParts.push(`מודל מכירות: ${ctx.salesModel}`);
    if (ctx.budgetRange) systemParts.push(`טווח תקציב: ${ctx.budgetRange}`);
    if (ctx.mainGoal) systemParts.push(`מטרה עיקרית: ${ctx.mainGoal}`);
    if (ctx.existingChannels) systemParts.push(`ערוצים קיימים: ${ctx.existingChannels}`);
    if (context?.healthScore) systemParts.push(`ציון בריאות שיווקית: ${context.healthScore}/100`);

    // Identity & Pain Points
    if (ctx.identityStatement) systemParts.push(`\nזהות המותג: ${ctx.identityStatement}`);
    if (ctx.topPainPoint) systemParts.push(`כאב עיקרי: ${ctx.topPainPoint}`);
    if (ctx.industryPains) systemParts.push(`כאבים תעשייתיים: ${ctx.industryPains}`);

    // Differentiation context (if available)
    if (ctx.mechanism) {
      systemParts.push("\n=== בידול (מאומת) ===");
      systemParts.push(`הצהרת מנגנון: ${ctx.mechanism}`);
      if (ctx.antiStatement) systemParts.push(`מה שאנחנו במודע לא עושים: ${ctx.antiStatement}`);
      if (ctx.competitors) systemParts.push(`מתחרים: ${ctx.competitors}`);
      if (ctx.tradeoffs) systemParts.push(`ויתורים מודעים: ${ctx.tradeoffs}`);
      if (ctx.topHiddenValues) systemParts.push(`ערכים נסתרים מובילים: ${ctx.topHiddenValues}`);
      systemParts.push("כשאתה כותב תוכן או סקריפטים — השתמש בבידול הזה. הוא מאומת.");
    }

    // Stage of change (Motivational Interviewing)
    if (context?.stageOfChange === "precontemplation") {
      systemParts.push("\nהמשתמש בשלב מודעות — שאל שאלות, אל תדחוף לפעולה.");
    } else if (context?.stageOfChange === "action" || context?.stageOfChange === "maintenance") {
      systemParts.push("\nהמשתמש בשלב פעולה — תן צעדים קונקרטיים ומיידיים.");
    }

    // Stylome
    if (ctx.stylomePrompt) {
      systemParts.push(`\n=== סגנון כתיבה של המשתמש ===\n${ctx.stylomePrompt}`);
      systemParts.push("כשאתה כותב תוכן בשם המשתמש — חקה את הסגנון הזה.");
    }

    const systemPrompt = systemParts.join("\n") + "\n\nיש לך כלי חיפוש באינטרנט (web_search). השתמש בו כשצריך מידע עדכני: מחירים, מתחרים, טרנדים, חדשות, סטטיסטיקות.";

    const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        stream: true,
        system: systemPrompt,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!anthropicResp.ok) {
      const errData = await anthropicResp.json();
      return new Response(JSON.stringify({ error: errData.error?.message || "API error" }), {
        status: anthropicResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pipe text tokens to the client as they arrive.
    // All content blocks are also collected so web-search results can be
    // persisted to the vector store after the stream closes.
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();
    const enc = new TextEncoder();

    const userId = user.id;
    (async () => {
      const reader = anthropicResp.body!.getReader();
      const decoder = new TextDecoder();
      const collectedBlocks: WebSearchBlock[] = [];
      let currentBlock: WebSearchBlock | null = null;
      let inputTokens = 0;
      let outputTokens = 0;
      let buf = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") continue;
            let event: Record<string, unknown>;
            try { event = JSON.parse(json) as Record<string, unknown>; } catch { continue; }

            if (event.type === "message_start") {
              const msg = event.message as Record<string, unknown> | undefined;
              inputTokens = ((msg?.usage as Record<string, number> | undefined)?.input_tokens) ?? 0;
            } else if (event.type === "content_block_start") {
              const cb = event.content_block as Record<string, unknown> | undefined;
              currentBlock = { type: (cb?.type as string) ?? "text", text: "" };
            } else if (event.type === "content_block_delta") {
              const delta = event.delta as Record<string, unknown> | undefined;
              if (delta?.type === "text_delta" && typeof delta.text === "string") {
                if (currentBlock) currentBlock.text = (currentBlock.text ?? "") + delta.text;
                await writer.write(enc.encode(`data: ${JSON.stringify({ t: delta.text })}\n\n`));
              }
            } else if (event.type === "content_block_stop") {
              if (currentBlock) { collectedBlocks.push(currentBlock); currentBlock = null; }
            } else if (event.type === "message_delta") {
              outputTokens = ((event.usage as Record<string, number> | undefined)?.output_tokens) ?? 0;
            }
          }
        }
      } finally {
        await writer.write(enc.encode("data: [DONE]\n\n")).catch(() => {});
        await writer.close().catch(() => {});

        const MODEL_RATES: Record<string, { in: number; out: number }> = {
          "claude-haiku-4-5-20251001": { in: 800, out: 4000 },
        };
        const rate = MODEL_RATES["claude-haiku-4-5-20251001"];
        const costMillis = Math.ceil((inputTokens * rate.in + outputTokens * rate.out) / 1000);
        supabase.rpc("bump_user_daily_cost", {
          p_user_id: userId,
          p_tokens: inputTokens + outputTokens,
          p_cost_usd_millis: costMillis,
        }).then(({ error: e }: { error: { message: string } | null }) => {
          if (e) console.error("ai-coach.costBump", e.message);
        });

        persistWebSearchResults(supabase, userId, collectedBlocks, context).catch((err: unknown) => {
          console.error("ai-coach.persistWebSearch", err);
        });
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
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

type WebSearchBlock = {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: { query?: string };
  tool_use_id?: string;
  content?: Array<{ type?: string; url?: string; title?: string; page_age?: string | null }>;
};

// Extracts web_search queries and results from an Anthropic response,
// writes each unique (user, query) pair to shared_context, and enqueues an
// embedding job so the content_embeddings table stays populated.
async function persistWebSearchResults(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  blocks: WebSearchBlock[],
  context: Record<string, unknown> | undefined,
): Promise<void> {
  const toolUseById = new Map<string, string>(); // tool_use_id -> query
  for (const b of blocks) {
    if (b.type === "server_tool_use" && b.name === "web_search" && b.id && b.input?.query) {
      toolUseById.set(b.id, b.input.query);
    }
  }

  for (const b of blocks) {
    if (b.type !== "web_search_tool_result" || !b.tool_use_id) continue;
    const query = toolUseById.get(b.tool_use_id);
    if (!query) continue;

    const rawResults = (b.content ?? []).filter((r) => r?.type === "web_search_result" && r.url && r.title);
    if (rawResults.length === 0) continue;

    const normalizedQuery = query.toLowerCase().trim();
    const queryHash = (await sha256Hex(normalizedQuery)).slice(0, 32);
    const conceptKey = `WEB_SEARCH-${queryHash}`;

    // Skip if we already have results for this query (plan_id IS NULL path
    // requires an explicit .is() filter because the UNIQUE constraint treats
    // NULLs as distinct).
    const { data: existing } = await supabase
      .from("shared_context")
      .select("id")
      .eq("user_id", userId)
      .is("plan_id", null)
      .eq("concept_key", conceptKey)
      .maybeSingle();
    if (existing) continue;

    const industry = typeof context?.businessField === "string" ? context.businessField : undefined;
    const audience = typeof context?.audienceType === "string" ? context.audienceType : undefined;

    const classifiedResults = rawResults.map((r) => ({
      url: r.url!,
      title: r.title!,
      page_age: r.page_age ?? null,
      reliability: classifyReliability(r.url!),
      domain: domainFromUrl(r.url!),
      language: detectLanguage(r.title!),
    }));

    const payload = {
      query,
      results: classifiedResults,
      source: "anthropic_web_search_20250305",
      query_context: { industry, audience },
      captured_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase.from("shared_context").insert({
      user_id: userId,
      plan_id: null,
      concept_key: conceptKey,
      stage: "discover",
      payload,
      written_by: "ai-coach.web_search",
    });

    if (insertError) {
      console.error("ai-coach.shared_context.insert", insertError);
      continue;
    }

    // Hand off to the event queue so embedding cost does not block the chat
    // response. The queue-processor's handleWebSearchEmbed handler calls
    // embed-content with this payload.
    const embedItems = classifiedResults.map((r) => ({
      text: `${r.title} (${r.domain ?? ""})`,
      contentType: "web_search_result",
      metadata: {
        query,
        query_hash: queryHash,
        url: r.url,
        domain: r.domain,
        reliability: r.reliability,
        language: r.language,
        page_age: r.page_age,
        industry,
        audience,
      },
    }));

    await supabase.rpc("publish_event", {
      p_event_type: "web_search.embed",
      p_payload: { userId, items: embedItems },
      p_user_id: userId,
      p_priority: 8, // low — embedding is background work
    });
  }
}
