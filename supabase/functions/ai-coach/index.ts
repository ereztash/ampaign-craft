import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { message, context } = await req.json();

    // Build system prompt from user context
    const systemParts: string[] = [
      "אתה מאמן שיווק דיגיטלי ישראלי מומחה. אתה מדבר בעברית בסגנון ישיר ודוגרי.",
      "אתה מבוסס על מדע התנהגותי (Cialdini, Kahneman) ונוירוקופירייטינג.",
      "תמיד תן 3 פעולות ספציפיות וניתנות ליישום מיידי.",
      "השתמש במונחים בעברית עם מונחים מקצועיים באנגלית בסוגריים.",
    ];

    if (context?.businessField) {
      systemParts.push(`העסק של המשתמש בתחום: ${context.businessField}`);
    }
    if (context?.mainGoal) {
      systemParts.push(`המטרה העיקרית: ${context.mainGoal}`);
    }
    if (context?.audienceType) {
      systemParts.push(`סוג קהל יעד: ${context.audienceType}`);
    }
    if (context?.budgetRange) {
      systemParts.push(`טווח תקציב: ${context.budgetRange}`);
    }
    if (context?.experienceLevel) {
      systemParts.push(`רמת ניסיון: ${context.experienceLevel}`);
    }
    if (context?.healthScore) {
      systemParts.push(`ציון בריאות שיווקית נוכחי: ${context.healthScore}/100`);
    }
    if (context?.stylomePrompt) {
      systemParts.push(`סגנון כתיבה של המשתמש:\n${context.stylomePrompt}`);
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemParts.join("\n"),
        messages: [{ role: "user", content: message }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || "API error" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reply = data.content?.[0]?.text || "";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
