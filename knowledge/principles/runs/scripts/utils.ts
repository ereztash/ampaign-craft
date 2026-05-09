// ═══════════════════════════════════════════════
// knowledge/principles/runs/scripts/utils.ts
//
// Shared utilities for the Differentiation Playbook validation pipeline.
// No new dependencies — uses Node 22 built-ins (fetch, crypto, fs).
// Loaded via `node --env-file=.env --import tsx ...` (see package.json).
// ═══════════════════════════════════════════════

import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "../../../..");
export const RUNS_ROOT = path.resolve(__dirname, "..");
export const PROMPTS_ROOT = path.resolve(__dirname, "../../prompts");
export const PLAYBOOK_PATH = path.resolve(__dirname, "../../playbook.md");

// ─── Models & pricing ─────────────────────────────────────────────────────

export const MODELS = {
  opus: "claude-opus-4-7",
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5-20251001",
} as const;

export type ModelKey = keyof typeof MODELS;

const PRICING_USD_PER_MTOK = {
  opus: { input: 15, output: 75 },
  sonnet: { input: 3, output: 15 },
  haiku: { input: 1, output: 5 },
} as const;

export function estimateCost(
  model: ModelKey,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = PRICING_USD_PER_MTOK[model];
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

// ─── API caller with sanitized errors ─────────────────────────────────────
// Calls the playbook-llm Supabase edge function, which proxies to Anthropic.
// The ANTHROPIC_API_KEY remains in Supabase secrets — never in any client.
// ──────────────────────────────────────────────────────────────────────────

export interface AnthropicCallOptions {
  model: ModelKey;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens?: number;
}

export interface AnthropicCallResult {
  content: string;
  usage: { input_tokens: number; output_tokens: number };
  costUsd: number;
  model: string;
  stopReason: string;
}

export async function callAnthropic(
  opts: AnthropicCallOptions,
): Promise<AnthropicCallResult> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "SUPABASE_URL missing. Add to .env (see .env.example). Required to call the playbook-llm edge function proxy.",
    );
  }
  if (!supabaseAnonKey) {
    throw new Error(
      "SUPABASE_ANON_KEY missing. Add to .env (see .env.example). The anon key is the publishable Supabase key (safe in client/sandbox).",
    );
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/playbook-llm`;
  const body = {
    model: opts.model,
    system: opts.systemPrompt,
    user: opts.userPrompt,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens ?? 8192,
  };

  let response: Response;
  try {
    response = await fetchWithRetry(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown network error";
    throw new Error(`Edge function network failure: ${sanitizeErrorMessage(message)}`);
  }

  if (!response.ok) {
    const status = response.status;
    let serverMsg = "";
    let errorCode = "";
    try {
      const json = (await response.json()) as { error?: string; message?: string };
      errorCode = json?.error ?? "";
      serverMsg = json?.message ?? "";
    } catch {
      // ignore body parsing errors
    }

    if (status === 401) {
      throw new Error(
        "Auth failed (401): SUPABASE_ANON_KEY rejected by edge function. Verify the key in .env matches the publishable key from the project (mcp__supabase__get_publishable_keys).",
      );
    }
    if (status === 502 && errorCode.startsWith("anthropic_")) {
      throw new Error(
        `Upstream Anthropic error: ${errorCode} ${sanitizeErrorMessage(serverMsg)}. The edge function reached Anthropic but Anthropic rejected the call. Check ANTHROPIC_API_KEY in Supabase secrets and spending cap at console.anthropic.com.`,
      );
    }
    if (status === 502) {
      throw new Error(
        `Edge function upstream error: ${errorCode} ${sanitizeErrorMessage(serverMsg)}.`,
      );
    }
    if (status === 429) {
      throw new Error(
        `Rate limited (429) after retries: ${sanitizeErrorMessage(serverMsg)}.`,
      );
    }
    if (status === 500 && errorCode === "server_misconfigured") {
      throw new Error(
        `Edge function misconfigured: ANTHROPIC_API_KEY not set in Supabase secrets. Visit https://supabase.com/dashboard/project/<ref>/settings/functions to add it.`,
      );
    }
    throw new Error(
      `Edge function error ${status}: ${errorCode} ${sanitizeErrorMessage(serverMsg)}`,
    );
  }

  const data = (await response.json()) as {
    content: string;
    usage: { input_tokens: number; output_tokens: number };
    model: string;
    stop_reason: string;
  };

  return {
    content: data.content,
    usage: data.usage,
    costUsd: estimateCost(opts.model, data.usage.input_tokens, data.usage.output_tokens),
    model: data.model,
    stopReason: data.stop_reason,
  };
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 4,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, init);
      // Retry only on 429 (rate limit) and 5xx (server errors)
      if (res.status === 429 || res.status >= 500) {
        if (attempt < maxRetries) {
          const backoffMs = Math.min(2 ** attempt * 1000, 16_000);
          await sleep(backoffMs);
          continue;
        }
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        const backoffMs = Math.min(2 ** attempt * 1000, 16_000);
        await sleep(backoffMs);
        continue;
      }
    }
  }
  throw lastErr ?? new Error("fetch failed after retries");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Strip patterns that could leak sensitive content from error messages.
 * - Redact anything that looks like an API key
 * - Truncate to 200 chars to prevent prompt content leakage
 */
function sanitizeErrorMessage(msg: string): string {
  if (!msg) return "(no message)";
  const redacted = msg
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, "sk-ant-***REDACTED***")
    .replace(/sk-[A-Za-z0-9_-]+/g, "sk-***REDACTED***");
  return redacted.length > 200 ? redacted.slice(0, 200) + "…(truncated)" : redacted;
}

// ─── Hashing & versioning ─────────────────────────────────────────────────

export function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export interface PromptVersionInfo {
  version: string;
  hash: string;
  filePath: string;
}

/**
 * Read a prompt file and extract its version from the header.
 * Header format: <!-- prompt-version: 0.1.0 -->
 * Throws if header missing — versioning is mandatory.
 */
export async function readPromptVersion(filePath: string): Promise<PromptVersionInfo> {
  const content = await readFile(filePath, "utf8");
  const match = content.match(/<!--\s*prompt-version:\s*([\d.]+)\s*-->/);
  if (!match) {
    throw new Error(
      `Prompt file ${filePath} missing version header (expected: <!-- prompt-version: X.Y.Z -->)`,
    );
  }
  return {
    version: match[1],
    hash: sha256(content),
    filePath,
  };
}

export async function readPlaybookVersion(): Promise<PromptVersionInfo> {
  const content = await readFile(PLAYBOOK_PATH, "utf8");
  const match = content.match(/<!--\s*playbook-version:\s*([\d.]+)\s*-->/);
  if (!match) {
    throw new Error(
      `playbook.md missing version header (expected: <!-- playbook-version: X.Y.Z -->)`,
    );
  }
  return {
    version: match[1],
    hash: sha256(content),
    filePath: PLAYBOOK_PATH,
  };
}

// ─── Metadata wrapping ────────────────────────────────────────────────────

export interface ArtifactMetadata {
  candidate_slug: string;
  artifact_type: "extraction" | "synthesis" | "mapping" | "comparison";
  prompt_version: string;
  prompt_hash_sha256: string;
  playbook_version: string;
  playbook_hash_sha256: string;
  model: string;
  temperature: number;
  run_number: number;
  timestamp_iso: string;
  input_bundle_hash_sha256: string;
  cost_usd: number;
  usage: { input_tokens: number; output_tokens: number };
}

export interface Artifact<T = unknown> {
  metadata: ArtifactMetadata;
  data: T;
}

export function wrapArtifact<T>(
  metadata: ArtifactMetadata,
  data: T,
): Artifact<T> {
  return { metadata, data };
}

// ─── File I/O ─────────────────────────────────────────────────────────────

export async function ensureDir(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

export async function writeArtifact(
  filePath: string,
  artifact: Artifact,
): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, JSON.stringify(artifact, null, 2) + "\n", "utf8");
}

export async function readArtifact<T>(filePath: string): Promise<Artifact<T>> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as Artifact<T>;
}

export function artifactFilename(opts: {
  type: "extraction" | "synthesis" | "mapping" | "comparison";
  promptVersion: string;
  runNumber: number;
  date: string;
}): string {
  return `${opts.type}__v${opts.promptVersion}__run${opts.runNumber}__${opts.date}.json`;
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Input bundle ─────────────────────────────────────────────────────────

export interface CandidateInputBundle {
  candidate_slug: string;
  candidate_name: string;
  company: string;
  source_url: string;
  source_date: string | null;
  source_type: string;
  primary_source: string;
  linkedin_headline: string;
  linkedin_about: string;
  website_hero: string;
  website_about_first: string;
  bundle_hash: string;
}

export async function readInputBundle(slug: string): Promise<CandidateInputBundle> {
  const dir = path.join(RUNS_ROOT, "inputs", slug);
  const candidateMetaPath = path.join(dir, "candidate.json");

  if (!existsSync(candidateMetaPath)) {
    throw new Error(
      `Input bundle not found at ${dir}. Required: candidate.json + 5 source files.`,
    );
  }

  const meta = JSON.parse(await readFile(candidateMetaPath, "utf8"));

  const requiredFiles: Array<keyof CandidateInputBundle> = [
    "primary_source",
    "linkedin_headline",
    "linkedin_about",
    "website_hero",
    "website_about_first",
  ];
  const fileMap: Record<string, string> = {
    primary_source: "primary-source.md",
    linkedin_headline: "linkedin-headline.txt",
    linkedin_about: "linkedin-about.md",
    website_hero: "website-hero.md",
    website_about_first: "website-about-first.md",
  };

  const contents: Record<string, string> = {};
  for (const key of requiredFiles) {
    const fileName = fileMap[key];
    const filePath = path.join(dir, fileName);
    if (!existsSync(filePath)) {
      throw new Error(
        `Input bundle for ${slug} missing required file: ${fileName}. ` +
          `Synthesizer requires multi-source input — see runs/README.md.`,
      );
    }
    contents[key] = await readFile(filePath, "utf8");
  }

  const bundleHash = sha256(
    JSON.stringify({
      candidate_slug: slug,
      ...contents,
    }),
  );

  return {
    candidate_slug: slug,
    candidate_name: meta.candidate_name,
    company: meta.company,
    source_url: meta.source_url,
    source_date: meta.source_date ?? null,
    source_type: meta.source_type,
    primary_source: contents.primary_source,
    linkedin_headline: contents.linkedin_headline.trim(),
    linkedin_about: contents.linkedin_about,
    website_hero: contents.website_hero,
    website_about_first: contents.website_about_first,
    bundle_hash: bundleHash,
  };
}

// ─── JSON parsing with helpful errors ─────────────────────────────────────

export function parseJsonResponse<T>(content: string, callContext: string): T {
  // Strip markdown code fences if present
  const stripped = content
    .replace(/^```(?:json)?\s*/, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(stripped) as T;
  } catch (err) {
    const preview = stripped.slice(0, 100);
    throw new Error(
      `Failed to parse JSON from ${callContext}. First 100 chars: "${preview}". ` +
        `Original parse error: ${(err as Error).message}`,
    );
  }
}

// ─── STATUS gate (extraction → synthesis) ─────────────────────────────────

export type GateStatus = "pending_review" | "approved" | "rejected" | "skipped";

export async function readGateStatus(slug: string): Promise<GateStatus | null> {
  const statusPath = path.join(RUNS_ROOT, "extractions", slug, "STATUS");
  if (!existsSync(statusPath)) return null;
  const content = (await readFile(statusPath, "utf8")).trim();
  if (
    content === "pending_review" ||
    content === "approved" ||
    content === "rejected" ||
    content === "skipped"
  ) {
    return content;
  }
  throw new Error(`Invalid STATUS file for ${slug}: "${content}"`);
}

export async function writeGateStatus(
  slug: string,
  status: GateStatus,
): Promise<void> {
  const statusPath = path.join(RUNS_ROOT, "extractions", slug, "STATUS");
  await ensureDir(path.dirname(statusPath));
  await writeFile(statusPath, status + "\n", "utf8");
}

// ─── CLI argument parsing ─────────────────────────────────────────────────

export function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

export function requireArg(
  args: Record<string, string | boolean>,
  key: string,
): string {
  const val = args[key];
  if (typeof val !== "string") {
    throw new Error(`Required argument missing: --${key}`);
  }
  return val;
}
