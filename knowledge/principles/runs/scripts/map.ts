// ═══════════════════════════════════════════════
// knowledge/principles/runs/scripts/map.ts
//
// Phase 0.5 / 2: Map the CEO's verbatim terminology (from extraction) to
// playbook principle codes. Runs 3 times at temperature 0.25 and aggregates
// to surface uncertainty rather than hide it.
//
// Usage:
//   npm run playbook:map -- --candidate <slug> [--model sonnet]
//
// The Mapper sees the extraction object + the playbook INDEX (one-line
// descriptions only). It does NOT see the playbook's evidence signatures,
// decision rules, or disqualifiers. Its job is semantic equivalence, not
// evidence validation.
//
// Aggregation:
//   - mapping appears in 3/3 runs → confidence "high"
//   - mapping appears in 2/3 runs → confidence "medium"
//   - mapping appears in 1/3 runs → confidence "low" (flagged)
//   - disagreements logged for human review
// ═══════════════════════════════════════════════

import { readFile, readdir } from "node:fs/promises";
import * as path from "node:path";
import {
  PROMPTS_ROOT,
  RUNS_ROOT,
  callAnthropic,
  readPromptVersion,
  readPlaybookVersion,
  parseJsonResponse,
  wrapArtifact,
  writeArtifact,
  readArtifact,
  artifactFilename,
  todayDate,
  parseArgs,
  requireArg,
  type ModelKey,
  type ArtifactMetadata,
} from "./utils.js";

const TEMPERATURE = 0.25;
const N_RUNS = 3;
const MAPPER_PROMPT_PATH = path.join(PROMPTS_ROOT, "mapper.md");
const PLAYBOOK_INDEX_PATH = path.join(PROMPTS_ROOT, "playbook-index.md");

interface SingleMapping {
  ceo_term: string;
  ceo_term_source_field: string;
  playbook_principles: string[];
  primary_principle: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

interface UnmappedTerm {
  term: string;
  source_field?: string;
  reasoning: string;
}

interface AmbiguousMapping {
  ceo_term: string;
  candidate_principles: string[];
  reasoning: string;
}

interface MappingRunOutput {
  candidate_name: string;
  company: string;
  extraction_source_url: string;
  mappings: SingleMapping[];
  unmapped_ceo_terms: UnmappedTerm[];
  ambiguous_mappings: AmbiguousMapping[];
  mapping_summary: unknown;
}

interface AggregatedMapping {
  ceo_term: string;
  primary_principle_consensus: string | null;
  primary_principle_disagreements: Array<{ run: number; principle: string }>;
  consensus_level: "high" | "medium" | "low" | "no_consensus";
  appearances_count: number;
  reasoning_per_run: string[];
}

async function buildSystemPrompt(): Promise<string> {
  const md = await readFile(MAPPER_PROMPT_PATH, "utf8");
  const match = md.match(/## System Prompt\s*\n\s*```\s*([\s\S]*?)\s*```/);
  if (!match) {
    throw new Error(
      `Could not find System Prompt code block in ${MAPPER_PROMPT_PATH}`,
    );
  }
  return match[1].trim();
}

async function buildUserPrompt(extractionJson: string, indexMd: string): Promise<string> {
  return `EXTRACTION OBJECT (what the CEO said):
---
${extractionJson}
---

PLAYBOOK INDEX (15 principles, names + short descriptions only):
---
${indexMd}
---

Produce the mapping JSON now.`;
}

async function findLatestExtraction(slug: string): Promise<string> {
  const dir = path.join(RUNS_ROOT, "extractions", slug);
  const files = await readdir(dir);
  const extractionFiles = files
    .filter((f) => f.startsWith("extraction__") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (extractionFiles.length === 0) {
    throw new Error(
      `No extraction artifact found for ${slug} in ${dir}. Run extract.ts first.`,
    );
  }
  return path.join(dir, extractionFiles[0]);
}

function aggregateMappings(runs: MappingRunOutput[]): AggregatedMapping[] {
  const termMap = new Map<string, AggregatedMapping>();

  runs.forEach((run, runIdx) => {
    for (const mapping of run.mappings) {
      const existing = termMap.get(mapping.ceo_term);
      if (existing) {
        existing.appearances_count++;
        existing.reasoning_per_run.push(`run${runIdx + 1}: ${mapping.reasoning}`);
        if (existing.primary_principle_consensus !== mapping.primary_principle) {
          existing.primary_principle_disagreements.push({
            run: runIdx + 1,
            principle: mapping.primary_principle,
          });
          existing.primary_principle_consensus = null;
        }
      } else {
        termMap.set(mapping.ceo_term, {
          ceo_term: mapping.ceo_term,
          primary_principle_consensus: mapping.primary_principle,
          primary_principle_disagreements: [
            { run: runIdx + 1, principle: mapping.primary_principle },
          ],
          consensus_level: "high", // updated below
          appearances_count: 1,
          reasoning_per_run: [`run${runIdx + 1}: ${mapping.reasoning}`],
        });
      }
    }
  });

  // Compute consensus_level
  for (const aggregated of termMap.values()) {
    const distinctPrimaries = new Set(
      aggregated.primary_principle_disagreements.map((d) => d.principle),
    );
    if (aggregated.appearances_count === N_RUNS && distinctPrimaries.size === 1) {
      aggregated.consensus_level = "high";
    } else if (aggregated.appearances_count >= 2 && distinctPrimaries.size === 1) {
      aggregated.consensus_level = "medium";
    } else if (aggregated.appearances_count >= 2 && distinctPrimaries.size > 1) {
      aggregated.consensus_level = "no_consensus";
    } else {
      aggregated.consensus_level = "low";
    }
  }

  return Array.from(termMap.values()).sort((a, b) => b.appearances_count - a.appearances_count);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = requireArg(args, "candidate");
  const modelArg = ((args.model as string) ?? "sonnet").toLowerCase();
  if (modelArg !== "opus" && modelArg !== "sonnet" && modelArg !== "haiku") {
    throw new Error(`--model must be 'opus' | 'sonnet' | 'haiku', got: ${modelArg}`);
  }
  const model: ModelKey = modelArg;

  console.log(`[map] candidate=${slug} model=${model} runs=${N_RUNS}`);

  const promptInfo = await readPromptVersion(MAPPER_PROMPT_PATH);
  const playbookInfo = await readPlaybookVersion();

  const extractionPath = await findLatestExtraction(slug);
  const extractionArtifact = await readArtifact<unknown>(extractionPath);
  const extractionJson = JSON.stringify(extractionArtifact.data, null, 2);

  const indexMd = await readFile(PLAYBOOK_INDEX_PATH, "utf8");
  const systemPrompt = await buildSystemPrompt();
  const userPrompt = await buildUserPrompt(extractionJson, indexMd);

  const runResults: MappingRunOutput[] = [];
  let totalCost = 0;

  for (let runNumber = 1; runNumber <= N_RUNS; runNumber++) {
    console.log(`[map] run ${runNumber}/${N_RUNS}...`);
    const result = await callAnthropic({
      model,
      systemPrompt,
      userPrompt,
      temperature: TEMPERATURE,
    });

    const mappingData = parseJsonResponse<MappingRunOutput>(
      result.content,
      `map.ts run ${runNumber}`,
    );
    runResults.push(mappingData);

    const metadata: ArtifactMetadata = {
      candidate_slug: slug,
      artifact_type: "mapping",
      prompt_version: promptInfo.version,
      prompt_hash_sha256: promptInfo.hash,
      playbook_version: playbookInfo.version,
      playbook_hash_sha256: playbookInfo.hash,
      model: result.model,
      temperature: TEMPERATURE,
      run_number: runNumber,
      timestamp_iso: new Date().toISOString(),
      input_bundle_hash_sha256: extractionArtifact.metadata.input_bundle_hash_sha256,
      cost_usd: result.costUsd,
      usage: result.usage,
    };

    const filename = artifactFilename({
      type: "mapping",
      promptVersion: promptInfo.version,
      runNumber,
      date: todayDate(),
    });
    const outPath = path.join(RUNS_ROOT, "mappings", slug, filename);
    await writeArtifact(outPath, wrapArtifact(metadata, mappingData));

    totalCost += result.costUsd;
    console.log(
      `[map] ✓ run ${runNumber} cost: $${result.costUsd.toFixed(4)} (${result.usage.input_tokens} in + ${result.usage.output_tokens} out tokens)`,
    );
  }

  // Aggregate
  console.log(`[map] aggregating ${N_RUNS} runs...`);
  const aggregated = aggregateMappings(runResults);

  const aggregateMetadata: ArtifactMetadata = {
    candidate_slug: slug,
    artifact_type: "mapping",
    prompt_version: promptInfo.version,
    prompt_hash_sha256: promptInfo.hash,
    playbook_version: playbookInfo.version,
    playbook_hash_sha256: playbookInfo.hash,
    model: runResults[0] ? `${model} (aggregated × ${N_RUNS})` : model,
    temperature: TEMPERATURE,
    run_number: 0, // 0 = aggregate of all runs
    timestamp_iso: new Date().toISOString(),
    input_bundle_hash_sha256: extractionArtifact.metadata.input_bundle_hash_sha256,
    cost_usd: totalCost,
    usage: { input_tokens: 0, output_tokens: 0 }, // n/a for aggregate
  };

  const aggregateFilename = `mapping__v${promptInfo.version}__aggregate__${todayDate()}.json`;
  const aggregatePath = path.join(RUNS_ROOT, "mappings", slug, aggregateFilename);
  await writeArtifact(
    aggregatePath,
    wrapArtifact(aggregateMetadata, {
      aggregate: aggregated,
      summary: {
        total_distinct_terms: aggregated.length,
        high_consensus: aggregated.filter((m) => m.consensus_level === "high").length,
        medium_consensus: aggregated.filter((m) => m.consensus_level === "medium").length,
        low_consensus: aggregated.filter((m) => m.consensus_level === "low").length,
        no_consensus: aggregated.filter((m) => m.consensus_level === "no_consensus").length,
      },
    }),
  );

  console.log(``);
  console.log(`[map] total cost: $${totalCost.toFixed(4)}`);
  console.log(`[map] aggregate written to: ${aggregatePath}`);
  console.log(`[map] consensus breakdown:`);
  for (const level of ["high", "medium", "low", "no_consensus"] as const) {
    const count = aggregated.filter((m) => m.consensus_level === level).length;
    console.log(`  - ${level}: ${count}`);
  }
  console.log(``);
  console.log(`Next: run comparison with:`);
  console.log(`  npm run playbook:compare -- --candidate ${slug}`);
}

main().catch((err) => {
  console.error(`[map] ERROR: ${(err as Error).message}`);
  process.exit(1);
});
