import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const { message, context } = await req.json();

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

    // Business context
    if (context?.businessField) systemParts.push(`תחום: ${context.businessField}`);
    if (context?.productDescription) systemParts.push(`מוצר/שירות: ${context.productDescription}`);
    if (context?.averagePrice) systemParts.push(`מחיר ממוצע: ₪${context.averagePrice}`);
    if (context?.audienceType) systemParts.push(`קהל יעד: ${context.audienceType}`);
    if (context?.salesModel) systemParts.push(`מודל מכירות: ${context.salesModel}`);
    if (context?.budgetRange) systemParts.push(`טווח תקציב: ${context.budgetRange}`);
    if (context?.mainGoal) systemParts.push(`מטרה עיקרית: ${context.mainGoal}`);
    if (context?.existingChannels) systemParts.push(`ערוצים קיימים: ${context.existingChannels}`);
    if (context?.healthScore) systemParts.push(`ציון בריאות שיווקית: ${context.healthScore}/100`);

    // Identity & Pain Points
    if (context?.identityStatement) systemParts.push(`\nזהות המותג: ${context.identityStatement}`);
    if (context?.topPainPoint) systemParts.push(`כאב עיקרי: ${context.topPainPoint}`);
    if (context?.industryPains) systemParts.push(`כאבים תעשייתיים: ${context.industryPains}`);

    // Differentiation context (if available)
    if (context?.mechanism) {
      systemParts.push("\n=== בידול (מאומת) ===");
      systemParts.push(`הצהרת מנגנון: ${context.mechanism}`);
      if (context.antiStatement) systemParts.push(`מה שאנחנו במודע לא עושים: ${context.antiStatement}`);
      if (context.competitors) systemParts.push(`מתחרים: ${context.competitors}`);
      if (context.tradeoffs) systemParts.push(`ויתורים מודעים: ${context.tradeoffs}`);
      if (context.topHiddenValues) systemParts.push(`ערכים נסתרים מובילים: ${context.topHiddenValues}`);
      systemParts.push("כשאתה כותב תוכן או סקריפטים — השתמש בבידול הזה. הוא מאומת.");
    }

    // Stage of change (Motivational Interviewing)
    if (context?.stageOfChange === "precontemplation") {
      systemParts.push("\nהמשתמש בשלב מודעות — שאל שאלות, אל תדחוף לפעולה.");
    } else if (context?.stageOfChange === "action" || context?.stageOfChange === "maintenance") {
      systemParts.push("\nהמשתמש בשלב פעולה — תן צעדים קונקרטיים ומיידיים.");
    }

    // Stylome
    if (context?.stylomePrompt) {
      systemParts.push(`\n=== סגנון כתיבה של המשתמש ===\n${context.stylomePrompt}`);
      systemParts.push("כשאתה כותב תוכן בשם המשתמש — חקה את הסגנון הזה.");
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
