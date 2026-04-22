/* eslint-disable @typescript-eslint/no-explicit-any */
// Deno Edge Function — cannot import frontend types; any is intentional here.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders, corsDenied, isOriginAllowed } from "../_shared/cors.ts";
import { checkRateLimit, checkUserRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isOriginAllowed(req)) return corsDenied(req);

  // Sonnet-tier wizard endpoint — 10 calls/min/IP keeps a single user
  // through a multi-phase wizard while blocking burst abuse.
  const rl = checkRateLimit(req, "differentiation-agent", 10, 60_000);
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

  const userRl = checkUserRateLimit(user.id, "differentiation-agent", 10, 60_000);
  if (!userRl.allowed) return rateLimitResponse(userRl, corsHeaders);

  try {
    const reqBody = await req.json();
    const { phase, formData, previousResults } = reqBody;

    let systemPrompt: string;
    let userMessage: string;

    if (phase === "principles_scan") {
      systemPrompt = buildPrincipleSystemPrompt(reqBody);
      userMessage = buildPrincipleUserMessage(reqBody);
    } else {
      systemPrompt = buildSystemPrompt(phase, formData, previousResults);
      userMessage = buildUserMessage(phase, formData, previousResults);
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        // Cache the full system prompt. Within the 5-minute TTL, repeat
        // invocations for the same user+business+phase (common in the
        // wizard flow) read the prefix at ~0.1x cost instead of paying
        // full input price. For the dynamic middle of the prompt to
        // benefit more, a future refactor should split buildSystemPrompt
        // into a stable preamble + dynamic context.
        system: [
          { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
        ],
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || "API error" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawText = data.content?.[0]?.text || "{}";

    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText];
    let result;
    try {
      result = JSON.parse(jsonMatch[1]?.trim() || rawText);
    } catch {
      result = { error: "Failed to parse AI response", raw: rawText };
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// deno-lint-ignore no-explicit-any
function buildSystemPrompt(phase: string, formData: any, _previousResults: any): string {
  const target = formData?.targetMarket || "b2b";
  const marketMode = target === "both" || target === "b2b2c" ? "hybrid" : target.startsWith("b2c") ? "b2c" : "b2b";

  const base = [
    marketMode === "b2c"
      ? "You are a consumer brand strategist. You analyze brands to find their REAL distinctiveness — not adjective branding, but memorable mechanisms that drive repeat purchases and word-of-mouth."
      : marketMode === "hybrid"
        ? "You are a unified B2B+B2C differentiation strategist. You understand both committee-based enterprise buying and consumer impulse decisions."
        : "You are a B2B differentiation strategist. You analyze businesses to find their REAL differentiation — not what they claim, but what they can prove.",
    "You are direct, analytical, and evidence-based. A weak claim is worse than no claim.",
    "",
    `Business: ${formData.businessName || "Unknown"}`,
    `Industry: ${formData.industry || "Unknown"}`,
    `Target: ${formData.targetMarket || "B2B"}`,
    `Size: ${formData.companySize || "Unknown"}`,
    `Price position: ${formData.priceRange || "mid"}`,
    `Current positioning: ${formData.currentPositioning || "Not specified"}`,
    "",
    "CRITICAL RULES:",
    "- No adjectives without mechanisms. 'Innovative' is banned. 'We use X process that produces Y result' is required.",
    "- Every claim needs evidence. No evidence = mark as empty.",
    "- Tradeoffs must be real. 'We chose speed over customization' is valid. 'We are good at everything' is a red flag.",
    "- Respond ONLY in valid JSON matching the specified schema. No markdown, no explanation outside JSON.",
  ];

  if (phase === "contradiction") {
    base.push(
      "",
      "PHASE: CONTRADICTION TEST",
      "Evaluate each claim-evidence pair. For each:",
      "- Set verified=true ONLY if evidence includes a specific customer name, metric, or outcome",
      "- Set verified=false and fill gap with what's missing if evidence is vague",
      "- Be ruthless. 'We are fast' with no evidence = empty.",
      "",
      'JSON SCHEMA: { "verifiedClaims": [{ "claim": string, "evidence": string, "verified": boolean, "gap": string }], "gapAnalysis": [{ "claim": string, "status": "verified"|"weak"|"empty", "recommendation": { "he": string, "en": string } }] }',
    );
  } else if (phase === "hidden") {
    base.push(
      "",
      "PHASE: HIDDEN LAYER ANALYSIS",
      "Given ashamed pains and hidden value scores, identify differentiation opportunities.",
      "The thing they're most uncomfortable about is often what makes them unique.",
      "",
      'JSON SCHEMA: { "ashamedPainInsights": [{ "pain": string, "normalizedFrame": string, "differentiationOpportunity": string }] }',
    );
  } else if (phase === "mapping") {
    base.push(
      "",
      "PHASE: MARKET MAPPING",
      "Generate counter-strategies for each competitor archetype.",
      "Generate positioning narratives for each buying committee role.",
      "",
      'JSON SCHEMA: { "competitorMap": [{ "name": string, "archetype": string, "threat_level": "low"|"medium"|"high", "counter_strategy": string }], "committeeNarratives": [{ "role": string, "primaryConcern": string, "narrative": string }] }',
    );
  } else if (phase === "synthesis") {
    base.push(
      "",
      "PHASE: SYNTHESIS",
      "Generate the complete differentiation output:",
      "1. Mechanism Statement: 'We [verb] through [specific mechanism], which means [measurable outcome]. We deliberately do NOT [anti-statement].'",
      "2. Tradeoff Declarations (3): weakness → reframe → who benefits",
      "3. Hybrid Category recommendation",
      "4. 3 Contrary Metrics to track",
      "5. Executive summary in Hebrew and English",
      "6. 4 prioritized next steps",
      "",
      'JSON SCHEMA: { "mechanismStatement": { "oneLiner": { "he": string, "en": string }, "mechanism": string, "proof": string, "antiStatement": string, "perRole": {} }, "tradeoffDeclarations": [{ "weakness": string, "reframe": string, "beneficiary": string }], "hybridCategory": { "name": { "he": string, "en": string }, "description": { "he": string, "en": string }, "existingCategories": string[], "whitespace": string }, "contraryMetrics": [{ "name": { "he": string, "en": string }, "description": { "he": string, "en": string }, "target": string, "whyContrary": string }], "executiveSummary": { "he": string, "en": string }, "nextSteps": [{ "priority": "high"|"medium", "action": { "he": string, "en": string }, "timeframe": string }] }',
    );
  }

  return base.join("\n");
}

// deno-lint-ignore no-explicit-any
function buildUserMessage(phase: string, formData: any, previousResults: any): string {
  if (phase === "contradiction") {
    return JSON.stringify({
      claims: formData.claimExamples || [],
      customerQuote: formData.customerQuote || "",
      lostDealReason: formData.lostDealReason || "",
      competitorOverlap: formData.competitorOverlap || "",
      competitors: formData.topCompetitors || [],
    });
  }

  if (phase === "hidden") {
    return JSON.stringify({
      ashamedPains: formData.ashamedPains || [],
      hiddenValues: formData.hiddenValues || [],
      internalFriction: formData.internalFriction || "",
    });
  }

  if (phase === "mapping") {
    return JSON.stringify({
      competitors: formData.topCompetitors || [],
      competitorArchetypes: formData.competitorArchetypes || [],
      buyingCommittee: formData.buyingCommitteeMap || [],
      decisionLatency: formData.decisionLatency || "weeks",
    });
  }

  if (phase === "synthesis") {
    return JSON.stringify({
      formData,
      previousResults: previousResults || {},
    });
  }

  return JSON.stringify(formData);
}

// ───────────────────────────────────────────────
// Principles scan (Layer 2 — 12-agent parallel pattern).
// Called once per principle; the client fans out 12 requests.
// ───────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
function buildPrincipleSystemPrompt(body: any): string {
  const p = body.principleDefinition || {};
  const name = p?.name?.en || body.principleCode || "Unknown Principle";
  const focus = p?.focus?.en || "";
  const questions: string[] = Array.isArray(p?.scanQuestions) ? p.scanQuestions : [];
  const positive: string[] = Array.isArray(p?.positiveSignals) ? p.positiveSignals : [];
  const negative: string[] = Array.isArray(p?.negativeSignals) ? p.negativeSignals : [];

  const lines = [
    "You are a differentiation signal analyst focused on ONE principle at a time.",
    `Your principle: ${body.principleCode} — ${name}.`,
    `Focus: ${focus}`,
    "",
    "You are scanning a meeting transcript between a business consultant and a client.",
    "You are evidence-based and ruthless. No praise, no filler.",
    "",
    "Your scan questions:",
    ...questions.map((q: string) => `- ${q}`),
    "",
    "Positive signals (raise score):",
    ...positive.map((s: string) => `- ${s}`),
    "",
    "Negative signals (lower score):",
    ...negative.map((s: string) => `- ${s}`),
    "",
    "CRITICAL RULES:",
    "- Relevance score 0..10. 10 = strong explicit signal present. 0 = not present at all.",
    "- Quote EXACT strings from the transcript for evidence. No paraphrase.",
    "- Max 3 evidence quotes. One sentence each.",
    "- summary_observation: one sentence describing what you saw.",
    "- differentiation_hypothesis: one sentence tying the observation to a differentiation angle.",
    "- This is a business meeting. Do NOT produce medical/clinical recommendations.",
    "- Respond ONLY in valid JSON. No markdown, no prose.",
    "",
    'JSON SCHEMA: { "relevanceScore": number, "evidenceQuotes": string[], "summaryObservation": string, "differentiationHypothesis": string }',
  ];
  return lines.join("\n");
}

// deno-lint-ignore no-explicit-any
function buildPrincipleUserMessage(body: any): string {
  return JSON.stringify({
    principleCode: body.principleCode,
    clientContext: body.clientContext || {},
    transcript: typeof body.transcript === "string" ? body.transcript.slice(0, 32000) : "",
  });
}
