// ═══════════════════════════════════════════════
// supabase/functions/playbook-llm/index.ts
//
// Anthropic API proxy for the Differentiation Playbook validation pipeline.
// Authenticated via Supabase anon key (verify_jwt: true).
//
// Request shape:
//   POST { system, user, model: 'opus'|'sonnet'|'haiku',
//          temperature: number, max_tokens?: number }
//
// Response shape:
//   200 { content, usage: {input_tokens, output_tokens}, model, stop_reason }
//   4xx { error, status?, message? }
//
// Designed for use from knowledge/principles/runs/scripts/* (Node 22 fetch).
// The ANTHROPIC_API_KEY remains in Supabase secrets — never in any client.
// ═══════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const MODEL_IDS: Record<string, string> = {
  opus: "claude-opus-4-7",
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5-20251001",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  system?: string;
  user?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  if (!ANTHROPIC_API_KEY) {
    return jsonResponse(
      { error: "server_misconfigured", message: "ANTHROPIC_API_KEY not set in Deno env" },
      500,
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json_body" }, 400);
  }

  const { system, user, model = "sonnet", temperature, max_tokens = 8192 } = body;

  if (!system || typeof system !== "string") {
    return jsonResponse({ error: "system_required" }, 400);
  }
  if (!user || typeof user !== "string") {
    return jsonResponse({ error: "user_required" }, 400);
  }
  if (typeof temperature !== "number") {
    return jsonResponse({ error: "temperature_required_number" }, 400);
  }
  if (max_tokens > 32_000) {
    return jsonResponse({ error: "max_tokens_too_large", message: "limit 32000" }, 400);
  }

  const modelId = MODEL_IDS[model.toLowerCase()];
  if (!modelId) {
    return jsonResponse(
      {
        error: "invalid_model",
        message: `model must be one of: ${Object.keys(MODEL_IDS).join(", ")}`,
      },
      400,
    );
  }

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens,
        temperature,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return jsonResponse(
      { error: "upstream_network", message: sanitize(message) },
      502,
    );
  }

  if (!anthropicRes.ok) {
    let errText = "";
    try {
      errText = await anthropicRes.text();
    } catch {
      // ignore
    }
    return jsonResponse(
      {
        error: `anthropic_${anthropicRes.status}`,
        status: anthropicRes.status,
        message: sanitize(errText),
      },
      anthropicRes.status === 401 || anthropicRes.status === 403 ? 502 : anthropicRes.status,
    );
  }

  const data = (await anthropicRes.json()) as {
    content?: Array<{ type: string; text: string }>;
    usage?: { input_tokens: number; output_tokens: number };
    stop_reason?: string;
    model?: string;
  };

  const content =
    data.content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("") ?? "";

  return jsonResponse({
    content,
    usage: data.usage ?? { input_tokens: 0, output_tokens: 0 },
    model: data.model ?? modelId,
    stop_reason: data.stop_reason ?? "unknown",
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function sanitize(text: string): string {
  if (!text) return "";
  const redacted = text
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, "sk-ant-***REDACTED***")
    .replace(/sk-[A-Za-z0-9_-]+/g, "sk-***REDACTED***");
  return redacted.length > 200 ? redacted.slice(0, 200) + "…" : redacted;
}
