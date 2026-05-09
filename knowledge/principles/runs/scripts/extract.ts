// ═══════════════════════════════════════════════
// knowledge/principles/runs/scripts/extract.ts
//
// Phase 0: Extracts the CEO's verbatim differentiation articulation from a
// long-form external source (interview, podcast transcript, article).
//
// Usage:
//   npm run playbook:extract -- --candidate <slug> --model <opus|sonnet>
//
// The Extractor sees ONLY the primary source. It does NOT see the playbook,
// the playbook index, LinkedIn content, or website content. This isolation
// is methodological — the extraction is the anchor against which all
// downstream synthesis is compared.
//
// On completion, writes extraction JSON and sets STATUS to "pending_review".
// User must explicitly run `npm run playbook:approve` before synthesis can
// proceed (see approve.ts and runs/README.md).
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
} from "./utils.js";

const TEMPERATURE = 0.5;
const EXTRACTOR_PROMPT_PATH = path.join(PROMPTS_ROOT, "extractor.md");

interface ExtractionData {
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
    source_thinness_observed: boolean;
    verbatim_vs_paraphrase_ratio: "mostly_verbatim" | "mixed" | "mostly_paraphrase";
    fields_empty_due_to_source_absence: string[];
  };
}

interface ValidationQuality {
  quality: "high" | "low";
  failures: string[];
}

function computeValidationQuality(data: ExtractionData): ValidationQuality {
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
  return {
    quality: failures.length >= 2 ? "low" : "high",
    failures,
  };
}

async function buildSystemPrompt(): Promise<string> {
  // The Extractor system prompt is embedded in the .md file inside a code block.
  // We extract it from there to keep a single source of truth.
  const md = await readFile(EXTRACTOR_PROMPT_PATH, "utf8");
  const match = md.match(/## System Prompt\s*\n\s*```\s*([\s\S]*?)\s*```/);
  if (!match) {
    throw new Error(
      `Could not find System Prompt code block in ${EXTRACTOR_PROMPT_PATH}`,
    );
  }
  return match[1].trim();
}

async function buildUserPrompt(slug: string): Promise<string> {
  const bundle = await readInputBundle(slug);
  return `SOURCE METADATA:
- candidate_name: ${bundle.candidate_name}
- company: ${bundle.company}
- source_url: ${bundle.source_url}
- source_date: ${bundle.source_date ?? "(not available)"}
- source_type: ${bundle.source_type}

SOURCE CONTENT:
---
${bundle.primary_source}
---

Produce the extraction JSON now.`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = requireArg(args, "candidate");
  const modelArg = requireArg(args, "model").toLowerCase();
  if (modelArg !== "opus" && modelArg !== "sonnet" && modelArg !== "haiku") {
    throw new Error(`--model must be 'opus' | 'sonnet' | 'haiku', got: ${modelArg}`);
  }
  const model: ModelKey = modelArg;
  const runNumber = parseInt((args.run as string) ?? "1", 10);

  console.log(`[extract] candidate=${slug} model=${model} run=${runNumber}`);

  const promptInfo = await readPromptVersion(EXTRACTOR_PROMPT_PATH);
  const playbookInfo = await readPlaybookVersion();
  const bundle = await readInputBundle(slug);

  const systemPrompt = await buildSystemPrompt();
  const userPrompt = await buildUserPrompt(slug);

  // Pre-call confirmation (cost transparency)
  const inputCharCount = systemPrompt.length + userPrompt.length;
  const estimatedInputTokens = Math.ceil(inputCharCount / 3.5);
  console.log(
    `[extract] estimated input tokens: ~${estimatedInputTokens} (≈$${
      model === "opus"
        ? ((estimatedInputTokens / 1_000_000) * 15).toFixed(3)
        : model === "sonnet"
          ? ((estimatedInputTokens / 1_000_000) * 3).toFixed(3)
          : ((estimatedInputTokens / 1_000_000) * 1).toFixed(3)
    } input cost; output cost depends on response size)`,
  );

  const result = await callAnthropic({
    model,
    systemPrompt,
    userPrompt,
    temperature: TEMPERATURE,
  });

  const extractionData = parseJsonResponse<ExtractionData>(
    result.content,
    "extract.ts response",
  );

  const validation = computeValidationQuality(extractionData);

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

  // Wrap with validation_quality tag (NOT used as decision gate; just informational)
  const enrichedData = {
    ...extractionData,
    _validation: validation,
  };

  const filename = artifactFilename({
    type: "extraction",
    promptVersion: promptInfo.version,
    runNumber,
    date: todayDate(),
  });
  const outPath = path.join(RUNS_ROOT, "extractions", slug, filename);
  await writeArtifact(outPath, wrapArtifact(metadata, enrichedData));

  await writeGateStatus(slug, "pending_review");

  console.log(`[extract] ✓ wrote ${outPath}`);
  console.log(
    `[extract] cost: $${result.costUsd.toFixed(4)} (${result.usage.input_tokens} in + ${result.usage.output_tokens} out tokens)`,
  );
  console.log(`[extract] validation_quality: ${validation.quality}`);
  if (validation.failures.length > 0) {
    console.log(`[extract] validation failures:`);
    for (const f of validation.failures) console.log(`  - ${f}`);
  }
  console.log(`[extract] STATUS: pending_review`);
  console.log(``);
  console.log(`Next: review the extraction at:`);
  console.log(`  ${outPath}`);
  console.log(`Then approve with:`);
  console.log(`  npm run playbook:approve -- --candidate ${slug}`);
  console.log(`Or reject (re-run with adjustments):`);
  console.log(`  npm run playbook:approve -- --candidate ${slug} --reject`);
}

main().catch((err) => {
  console.error(`[extract] ERROR: ${(err as Error).message}`);
  process.exit(1);
});
