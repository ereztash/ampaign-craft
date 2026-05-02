// ═══════════════════════════════════════════════
// LLM Client — supports `mock`, `live`, and `proxy` modes
//
// mock  : deterministic, no network. Fail-biased. CI-safe.
// live  : direct Anthropic Messages API via fetch. Needs ANTHROPIC_API_KEY.
// proxy : Supabase edge function (harness-llm) that wraps Anthropic.
//         Avoids putting the API key on dev machines. Needs:
//         HARNESS_PROXY_URL (e.g., https://<project>.supabase.co/functions/v1/harness-llm)
//         HARNESS_PROXY_SECRET (matches the function's hardcoded SHARED_SECRET)
//         HARNESS_PROXY_APIKEY (Supabase project anon/publishable key)
//
// Mode resolution priority:
//   1. HARNESS_MODE env (mock | live | proxy) — explicit override
//   2. HARNESS_PROXY_URL set → proxy
//   3. ANTHROPIC_API_KEY set → live
//   4. otherwise → mock
//
// The mock returns plausible but BIASED-TOWARD-FAILURE JSON. This is by
// design: in the absence of real LLM judgement, we assume the worst.
// "Passing IBAR" is impossible in mock mode — only live/proxy can clear
// the gates.
// ═══════════════════════════════════════════════

export type HarnessMode = "mock" | "live" | "proxy";

export function resolveMode(): HarnessMode {
  const forced = process.env.HARNESS_MODE;
  if (forced === "mock" || forced === "live" || forced === "proxy") return forced;
  if (process.env.HARNESS_PROXY_URL) return "proxy";
  return process.env.ANTHROPIC_API_KEY ? "live" : "mock";
}

export interface LLMCallOptions {
  prompt: string;
  /** Hint for token budget. */
  maxTokens?: number;
  /** Hint for which mock template to fall back on. */
  promptKind: "critic" | "usability" | "ownership" | "comparison" | "premortem" | "oneLiner" | "chatgptBaseline";
  /** Stable seed so mocks are deterministic per persona. */
  seed: string;
}

// ─── Live path (Anthropic API via fetch) ────────────────────────────────────

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

async function callAnthropic(opts: LLMCallOptions): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is required in live mode");

  const model = process.env.HARNESS_MODEL ?? DEFAULT_MODEL;
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 1024,
      messages: [{ role: "user", content: opts.prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text: string }> };
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  return text.trim();
}

// ─── Proxy path (Supabase edge function) ────────────────────────────────────

async function callProxy(opts: LLMCallOptions): Promise<string> {
  const url = process.env.HARNESS_PROXY_URL;
  const secret = process.env.HARNESS_PROXY_SECRET;
  const apikey = process.env.HARNESS_PROXY_APIKEY;
  if (!url || !secret || !apikey) {
    throw new Error("HARNESS_PROXY_URL, HARNESS_PROXY_SECRET, HARNESS_PROXY_APIKEY are all required in proxy mode");
  }

  const model = process.env.HARNESS_MODEL ?? DEFAULT_MODEL;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-harness-secret": secret,
      apikey,
      Authorization: `Bearer ${apikey}`,
    },
    body: JSON.stringify({
      prompt: opts.prompt,
      maxTokens: opts.maxTokens ?? 1024,
      model,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Proxy error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { text?: string; error?: string };
  if (data.error) throw new Error(`Proxy responded with error: ${data.error}`);
  return (data.text ?? "").trim();
}

// ─── Mock path (deterministic, fail-biased) ─────────────────────────────────

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function mockFor(opts: LLMCallOptions): string {
  const h = hashSeed(opts.seed);
  const fail = h % 3 === 0; // ~33% fail-biased

  switch (opts.promptKind) {
    case "critic":
      return JSON.stringify({
        coherent: !fail,
        weakest_claim: fail ? "המנגנון לא ייחודי" : "אין טענה חלשה משמעותית",
        why: "mock-mode: לא נשפט על ידי LLM אמיתי",
        genericity_score: fail ? 75 : 35,
      });
    case "usability":
      return JSON.stringify({
        would_use: !fail,
        where: fail ? [] : ["פרופיל לינקדאין", "פתיחה לשיחת מכירה"],
        confidence: fail ? 30 : 65,
      });
    case "ownership":
      return JSON.stringify({
        feels_mine: !fail,
        what_to_change: fail ? "לחדד את ה-ICP" : "",
      });
    case "comparison":
      return JSON.stringify({
        winner: fail ? "chatgpt" : "ff",
        on_dimensions: {
          clarity: fail ? "chatgpt" : "ff",
          specificity: "ff",
          actionability: fail ? "tie" : "ff",
          ownership: fail ? "chatgpt" : "ff",
        },
        reason: "mock-mode comparison",
      });
    case "premortem": {
      const failures = Array.from({ length: 20 }, (_, i) => ({
        reason: `mock failure reason #${i + 1}`,
        category: ["real", "positioning", "ux", "measurement", "market", "complexity", "trust", "price"][i % 8],
      }));
      return JSON.stringify({ failures });
    }
    case "oneLiner":
      return JSON.stringify({
        he: `אנחנו עוזרים ל${opts.seed.split("|")[0]} להגיע לתוצאה דרך מנגנון ייחודי`,
        en: `We help ${opts.seed.split("|")[0]} reach the outcome through a unique mechanism`,
      });
    case "chatgptBaseline":
      return `Generic differentiation statement for ${opts.seed.split("|")[0]}: we deliver quality service with personal attention.`;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function callLLM(opts: LLMCallOptions): Promise<string> {
  const mode = resolveMode();
  if (mode === "mock") return mockFor(opts);
  if (mode === "proxy") return callProxy(opts);
  return callAnthropic(opts);
}

/** Strict JSON parse with one repair pass — strips trailing prose / code fences. */
export function parseStrictJSON<T>(raw: string): T {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  // Find first `{` and last `}` — handles models adding prose
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return JSON.parse(cleaned) as T;
}
