// ═══════════════════════════════════════════════
// 12-Agent Parallel Scan (CLAUDE.md — Layer 2)
//
// Fires 12 LLM calls in parallel against the same transcript, each
// with a different principle definition. Aggregates scored outputs
// into a convergence report. Uses the existing Edge Function at
// /api/growth/differentiation-agent (phase = "principles_scan").
// ═══════════════════════════════════════════════

import {
  PRINCIPLES,
  type PrincipleAgentOutput,
  type PrincipleCode,
  type PrincipleDefinition,
  type ConvergenceReport,
  aggregatePrincipleOutputs,
} from "./principles";
import { filterOutputTree } from "./edgeFilter";

export interface PrincipleScanInput {
  transcript: string;
  clientContext?: {
    businessName?: string;
    industry?: string;
    differentiationStatus?: string;
  };
  /** Optional: restrict to a subset of principles (useful in tests / partial rescans). */
  onlyCodes?: PrincipleCode[];
}

export interface PrincipleScanProgress {
  completed: number;
  total: number;
  lastCode: PrincipleCode;
}

export interface PrincipleScanResult {
  outputs: PrincipleAgentOutput[];
  convergence: ConvergenceReport;
  failedCodes: PrincipleCode[];
}

/**
 * Call shape sent to the edge function for each principle.
 */
interface SingleAgentRequest {
  phase: "principles_scan";
  principleCode: PrincipleCode;
  principleDefinition: PrincipleDefinition;
  transcript: string;
  clientContext?: PrincipleScanInput["clientContext"];
}

/**
 * Run a single principle agent. Network errors become a `failed: true`
 * output so the caller can still render partial results.
 */
async function runSinglePrincipleAgent(
  principle: PrincipleDefinition,
  input: PrincipleScanInput,
  fetcher: typeof fetch = fetch,
): Promise<PrincipleAgentOutput> {
  const body: SingleAgentRequest = {
    phase: "principles_scan",
    principleCode: principle.code,
    principleDefinition: principle,
    transcript: input.transcript,
    clientContext: input.clientContext,
  };

  try {
    const resp = await fetcher(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/differentiation-agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    if (!resp.ok || data?.error) {
      return {
        principleCode: principle.code,
        principleName: principle.name.en,
        relevanceScore: 0,
        evidenceQuotes: [],
        summaryObservation: "",
        differentiationHypothesis: "",
        failed: true,
        error: data?.error || resp.statusText,
      };
    }
    const result = data?.result;
    if (!result || typeof result !== "object") {
      return {
        principleCode: principle.code,
        principleName: principle.name.en,
        relevanceScore: 0,
        evidenceQuotes: [],
        summaryObservation: "",
        differentiationHypothesis: "",
        failed: true,
        error: "Empty AI response",
      };
    }

    // Apply edge filter before the output leaves this module.
    const { output: filtered } = filterOutputTree<Record<string, unknown>>(
      result,
      "business_meeting",
    );

    return {
      principleCode: principle.code,
      principleName: principle.name.en,
      relevanceScore: clampScore((filtered as { relevanceScore?: number }).relevanceScore ?? 0),
      evidenceQuotes: Array.isArray((filtered as { evidenceQuotes?: unknown[] }).evidenceQuotes)
        ? ((filtered as { evidenceQuotes: unknown[] }).evidenceQuotes as string[]).filter(
            (q) => typeof q === "string",
          )
        : [],
      summaryObservation: typeof (filtered as { summaryObservation?: unknown }).summaryObservation === "string"
        ? (filtered as { summaryObservation: string }).summaryObservation
        : "",
      differentiationHypothesis: typeof (filtered as { differentiationHypothesis?: unknown }).differentiationHypothesis === "string"
        ? (filtered as { differentiationHypothesis: string }).differentiationHypothesis
        : "",
    };
  } catch (err) {
    return {
      principleCode: principle.code,
      principleName: principle.name.en,
      relevanceScore: 0,
      evidenceQuotes: [],
      summaryObservation: "",
      differentiationHypothesis: "",
      failed: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 10) return 10;
  return Math.round(v * 10) / 10;
}

/**
 * Fire all 12 (or a subset) in parallel.
 * Resolves when every agent settles — successes and failures included.
 */
export async function runPrincipleScan(
  input: PrincipleScanInput,
  options: {
    onProgress?: (progress: PrincipleScanProgress) => void;
    fetcher?: typeof fetch;
  } = {},
): Promise<PrincipleScanResult> {
  const selected = options.onlyCodes
    ? PRINCIPLES.filter((p) => options.onlyCodes!.includes(p.code))
    : PRINCIPLES;

  let completed = 0;
  const promises = selected.map(async (p) => {
    const out = await runSinglePrincipleAgent(p, input, options.fetcher);
    completed += 1;
    options.onProgress?.({ completed, total: selected.length, lastCode: p.code });
    return out;
  });

  const outputs = await Promise.all(promises);
  const convergence = aggregatePrincipleOutputs(outputs);
  const failedCodes = outputs.filter((o) => o.failed).map((o) => o.principleCode);

  return { outputs, convergence, failedCodes };
}
