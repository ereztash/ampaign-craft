// ═══════════════════════════════════════════════
// knowledge/principles/runs/scripts/extract.ts
//
// Phase 0: Extracts the CEO's verbatim differentiation articulation from
// independent external sources. Two tracks (see ../test-subjects.md):
//
//   --track breadth (default, requires ≥3 independent sources)
//     Uses extractor-breadth.md prompt. Outputs recurring_themes schema.
//     validation_quality is computed via OR of two paths:
//       (a) Recurrence with lexical similarity
//       (b) Depth with self-reinforcement (NOT external validation)
//
//   --track depth (fallback, presence-thin candidates with 1-2 sources)
//     Uses extractor-depth.md prompt. Outputs core_differentiation_claim.
//     validation_quality computed deterministically from word counts.
//
// Tracks produce different artifact schemas. Track A and Track B results are
// NOT directly comparable — see test-subjects.md "Cross-method comparability".
//
// Usage:
//   npm run playbook:extract -- --candidate <slug> --model <opus|sonnet|haiku>
//                                                 [--track breadth|depth] [--run N]
//
// On completion, writes extraction JSON and sets STATUS to "pending_review".
// ═══════════════════════════════════════════════

import { readFile } from "node:fs/promises";
import * as path from "node:path";
import {
  PROMPTS_ROOT,
  RUNS_ROOT,
  callAnthropic,
  readPromptVersion,
  readPlaybookVersion,
  readInputBundle,
  parseJsonResponse,
  wrapArtifact,
  writeArtifact,
  writeGateStatus,
  artifactFilename,
  todayDate,
  parseArgs,
  requireArg,
  type ModelKey,
  type ArtifactMetadata,
  type Track,
  type InputBundle,
} from "./utils.js";

const TEMPERATURE = 0.5;

// ─── Track-specific schemas ───────────────────────────────────────────────

interface DepthExtractionData {
  candidate_name: string;
  company: string;
  source_url: string;
  source_date: string | null;
  source_type: string;
  source_word_count: number;
  core_differentiation_claim: {
    summary_3_5_sentences: string;
    in_ceo_own_terminology: string[];
  };
  supporting_verbatim_quotes: Array<{ quote: string; context: string }>;
  what_ceo_explicitly_says_they_are_NOT: string[];
  company_specific_proof_points: string[];
  industry_supporting_claims: string[];
  tradeoffs_or_constraints_acknowledged: string[];
  extraction_notes: {
    source_thinness_observed?: boolean; // legacy field, may be present in 0.2.x output but ignored by validation
    verbatim_vs_paraphrase_ratio: "mostly_verbatim" | "mixed" | "mostly_paraphrase";
    fields_empty_due_to_source_absence: string[];
  };
}

interface ThemeAppearance {
  source_id: string;
  verbatim_quote: string;
  word_count_in_source: number;
  exact_terminology_used: string[];
}

interface RecurringTheme {
  theme_label: string;
  appearances: ThemeAppearance[];
  appearances_count: number;
  shared_verbatim_terms: string[];
  centrality: number;
  representative_quote: string;
}

interface BreadthExtractionData {
  candidate_name: string;
  company: string;
  extraction_method: "breadth-first";
  sources_metadata: Array<{
    source_id: string;
    source_url: string;
    source_type: string;
    source_date: string | null;
    source_word_count_ceo_speech: number;
  }>;
  recurring_themes: RecurringTheme[];
  what_ceo_explicitly_says_they_are_NOT: Array<{ statement: string; source_ids: string[] }>;
  company_specific_proof_points: Array<{ claim: string; source_ids: string[] }>;
  industry_supporting_claims: Array<{ claim: string; source_ids: string[] }>;
  tradeoffs_or_constraints_acknowledged: Array<{ statement: string; source_ids: string[] }>;
  extraction_notes: {
    verbatim_vs_paraphrase_ratio_per_source: Array<{ source_id: string; ratio: string }>;
    fields_empty_due_to_source_absence: string[];
  };
}

// ─── Validation: track-specific ───────────────────────────────────────────

function computeDepthValidationQuality(data: DepthExtractionData): {
  quality: "high" | "low";
  failures: string[];
} {
  const failures: string[] = [];
  const summaryWords = data.core_differentiation_claim.summary_3_5_sentences
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  if (summaryWords < 80) {
    failures.push(`summary_3_5_sentences has ${summaryWords} words (<80)`);
  }
  const longQuotes = data.supporting_verbatim_quotes.filter(
    (q) => q.quote.trim().split(/\s+/).filter(Boolean).length > 30,
  ).length;
  if (longQuotes < 2) {
    failures.push(`only ${longQuotes} verbatim quotes >30 words (<2 required)`);
  }
  if (data.core_differentiation_claim.in_ceo_own_terminology.length < 3) {
    failures.push(
      `in_ceo_own_terminology has ${data.core_differentiation_claim.in_ceo_own_terminology.length} terms (<3)`,
    );
  }
  return { quality: failures.length >= 2 ? "low" : "high", failures };
}

function computeBreadthValidationQuality(
  data: BreadthExtractionData,
  firstPartyCombinedLower: string,
): {
  quality: "high" | "low";
  path_a_recurrence_satisfied: boolean;
  path_b_depth_self_reinforcement_satisfied: boolean;
  themes_count: number;
  recurring_themes_with_shared_terms_count: number;
  deep_themes_with_first_party_echo_count: number;
} {
  const themesCount = data.recurring_themes.length;
  const recurringWithSharedTerms = data.recurring_themes.filter(
    (t) => t.appearances_count >= 2 && t.shared_verbatim_terms.length >= 1,
  );
  const pathA = themesCount >= 3 && recurringWithSharedTerms.length >= 2;

  const deepThemes = data.recurring_themes.filter((t) => {
    if (t.appearances_count !== 1) return false;
    const appearance = t.appearances[0];
    if (!appearance || appearance.word_count_in_source < 200) return false;
    return appearance.exact_terminology_used.some((term) =>
      firstPartyCombinedLower.includes(term.toLowerCase()),
    );
  });
  const pathB = deepThemes.length >= 1;

  return {
    quality: pathA || pathB ? "high" : "low",
    path_a_recurrence_satisfied: pathA,
    path_b_depth_self_reinforcement_satisfied: pathB,
    themes_count: themesCount,
    recurring_themes_with_shared_terms_count: recurringWithSharedTerms.length,
    deep_themes_with_first_party_echo_count: deepThemes.length,
  };
}

// ─── Prompt building ──────────────────────────────────────────────────────

async function readSystemPromptFromFile(filePath: string): Promise<string> {
  const md = await readFile(filePath, "utf8");
  const match = md.match(/## System Prompt\s*\n\s*```\s*([\s\S]*?)\s*```/);
  if (!match) {
    throw new Error(`Could not find System Prompt code block in ${filePath}`);
  }
  return match[1].trim();
}

function buildDepthUserPrompt(bundle: InputBundle): string {
  const primary = bundle.sources[0];
  return `SOURCE METADATA:
- candidate_name: ${bundle.meta.candidate_name}
- company: ${bundle.meta.company}
- source_url: ${primary.url}
- source_date: ${primary.date ?? "(not available)"}
- source_type: ${primary.type}

SOURCE CONTENT:
---
${primary.content}
---

Produce the extraction JSON now.`;
}

function buildBreadthUserPrompt(bundle: InputBundle): string {
  if (bundle.sources.length < 3) {
    throw new Error(
      `Track A (breadth) requires ≥3 independent sources, got ${bundle.sources.length}. ` +
        `Use --track depth or expand the sources/ bundle.`,
    );
  }

  const sourceBlocks = bundle.sources
    .map(
      (s) => `[SOURCE source_id="${s.source_id}"]
- source_url: ${s.url}
- source_type: ${s.type}
- source_date: ${s.date ?? "(not available)"}

CONTENT:
---
${s.content}
---
[END SOURCE source_id="${s.source_id}"]`,
    )
    .join("\n\n");

  return `SOURCES BUNDLE — ${bundle.sources.length} INDEPENDENT SOURCES:

${sourceBlocks}

CANDIDATE METADATA:
- candidate_name: ${bundle.meta.candidate_name}
- company: ${bundle.meta.company}

Identify recurring_themes across these sources. For each theme, capture every appearance with verbatim quote, word count estimate, and exact terminology. Then identify shared_verbatim_terms (phrases that appear identically across ≥2 appearances).

Produce the breadth-first extraction JSON now.`;
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = requireArg(args, "candidate");
  const modelArg = requireArg(args, "model").toLowerCase();
  if (modelArg !== "opus" && modelArg !== "sonnet" && modelArg !== "haiku") {
    throw new Error(`--model must be 'opus' | 'sonnet' | 'haiku', got: ${modelArg}`);
  }
  const model: ModelKey = modelArg;
  const trackArg = ((args.track as string) ?? "breadth").toLowerCase();
  if (trackArg !== "breadth" && trackArg !== "depth") {
    throw new Error(`--track must be 'breadth' | 'depth', got: ${trackArg}`);
  }
  const track: Track = trackArg;
  const runNumber = parseInt((args.run as string) ?? "1", 10);

  console.log(`[extract] candidate=${slug} model=${model} track=${track} run=${runNumber}`);

  const promptFile = path.join(
    PROMPTS_ROOT,
    track === "breadth" ? "extractor-breadth.md" : "extractor-depth.md",
  );
  const promptInfo = await readPromptVersion(promptFile);
  const playbookInfo = await readPlaybookVersion();
  const bundle = await readInputBundle(slug);

  // Track guard: breadth requires ≥3 independent sources
  if (track === "breadth" && bundle.sources.length < 3) {
    throw new Error(
      `Cannot run breadth extraction on ${slug}: only ${bundle.sources.length} sources in bundle. ` +
        `Required: ≥3 independent sources. Either expand the bundle or run with --track depth.`,
    );
  }

  const systemPrompt = await readSystemPromptFromFile(promptFile);
  const userPrompt =
    track === "breadth" ? buildBreadthUserPrompt(bundle) : buildDepthUserPrompt(bundle);

  const inputCharCount = systemPrompt.length + userPrompt.length;
  const estimatedInputTokens = Math.ceil(inputCharCount / 3.5);
  const inCostRate = model === "opus" ? 15 : model === "sonnet" ? 3 : 1;
  console.log(
    `[extract] estimated input tokens: ~${estimatedInputTokens} (≈$${(
      (estimatedInputTokens / 1_000_000) *
      inCostRate
    ).toFixed(3)} input cost; output cost depends on response size)`,
  );

  const result = await callAnthropic({
    model,
    systemPrompt,
    userPrompt,
    temperature: TEMPERATURE,
  });

  let validation: unknown;
  let extractionData: unknown;

  if (track === "breadth") {
    extractionData = parseJsonResponse<BreadthExtractionData>(
      result.content,
      "extract.ts breadth response",
    );
    validation = computeBreadthValidationQuality(
      extractionData as BreadthExtractionData,
      bundle.first_party.combined_lowercase,
    );
  } else {
    extractionData = parseJsonResponse<DepthExtractionData>(
      result.content,
      "extract.ts depth response",
    );
    validation = computeDepthValidationQuality(extractionData as DepthExtractionData);
  }

  const enriched = { ...(extractionData as object), _validation: validation, _track: track };

  const metadata: ArtifactMetadata = {
    candidate_slug: slug,
    artifact_type: "extraction",
    prompt_version: promptInfo.version,
    prompt_hash_sha256: promptInfo.hash,
    playbook_version: playbookInfo.version,
    playbook_hash_sha256: playbookInfo.hash,
    model: result.model,
    temperature: TEMPERATURE,
    run_number: runNumber,
    timestamp_iso: new Date().toISOString(),
    input_bundle_hash_sha256: bundle.bundle_hash,
    cost_usd: result.costUsd,
    usage: result.usage,
  };

  const filename =
    track === "breadth"
      ? `extraction__v${promptInfo.version}__breadth__run${runNumber}__${todayDate()}.json`
      : `extraction__v${promptInfo.version}__depth__run${runNumber}__${todayDate()}.json`;
  const outPath = path.join(RUNS_ROOT, "extractions", slug, filename);
  await writeArtifact(outPath, wrapArtifact(metadata, enriched));

  await writeGateStatus(slug, "pending_review");

  const v = validation as { quality: "high" | "low" };
  console.log(`[extract] ✓ wrote ${outPath}`);
  console.log(
    `[extract] cost: $${result.costUsd.toFixed(4)} (${result.usage.input_tokens} in + ${result.usage.output_tokens} out tokens)`,
  );
  console.log(`[extract] track=${track}, validation_quality: ${v.quality}`);
  if (track === "breadth") {
    const vb = validation as ReturnType<typeof computeBreadthValidationQuality>;
    console.log(
      `  path_a (recurrence + shared terms): ${vb.path_a_recurrence_satisfied} (themes=${vb.themes_count}, with_shared_terms=${vb.recurring_themes_with_shared_terms_count}/2 required)`,
    );
    console.log(
      `  path_b (depth + self-reinforcement): ${vb.path_b_depth_self_reinforcement_satisfied} (deep_themes_echoed=${vb.deep_themes_with_first_party_echo_count}/1 required)`,
    );
  } else {
    const vd = validation as ReturnType<typeof computeDepthValidationQuality>;
    if (vd.failures.length > 0) {
      console.log(`  failures:`);
      for (const f of vd.failures) console.log(`    - ${f}`);
    }
  }
  console.log(`[extract] STATUS: pending_review`);
  console.log(``);
  console.log(`Next: review the extraction at:`);
  console.log(`  ${outPath}`);
  console.log(`Then approve with:`);
  console.log(`  npm run playbook:approve -- --candidate ${slug}`);
}

main().catch((err) => {
  console.error(`[extract] ERROR: ${(err as Error).message}`);
  process.exit(1);
});
