// ═══════════════════════════════════════════════
// knowledge/principles/runs/scripts/synthesize.ts
//
// Phase 1+: Run the Synthesizer against the candidate's full multi-source
// input bundle and the playbook. Produces N stability-check runs.
//
// Usage:
//   npm run playbook:synth -- --candidate <slug> --runs 3 [--model opus]
//
// The Synthesizer requires:
//   - STATUS == "approved" (see approve.ts)
//   - All 4 secondary sources present (LinkedIn headline + About, website
//     hero + About first paragraph). The Synthesizer aborts on missing
//     secondaries because dual-tier evidence cannot be assessed from
//     single-source input.
//
// Default temperature: 0.3 (low enough for stability, high enough to surface
// real principle conflicts). Default model: opus (full reasoning required
// for 15-principle scoring with disqualifiers and competing-pair tiebreakers).
// ═══════════════════════════════════════════════

import { readFile } from "node:fs/promises";
import * as path from "node:path";
import {
  PROMPTS_ROOT,
  PLAYBOOK_PATH,
  RUNS_ROOT,
  callAnthropic,
  readPromptVersion,
  readPlaybookVersion,
  readInputBundle,
  parseJsonResponse,
  wrapArtifact,
  writeArtifact,
  readGateStatus,
  artifactFilename,
  todayDate,
  parseArgs,
  requireArg,
  type ModelKey,
  type ArtifactMetadata,
} from "./utils.js";

const TEMPERATURE = 0.3;
const SYNTHESIZER_PROMPT_PATH = path.join(PROMPTS_ROOT, "synthesizer.md");
const MAX_TOKENS = 16_000;

interface PrincipleAgentOutput {
  principleCode: string;
  principleName: string;
  relevanceScore: number;
  evidenceQuotes: Array<{
    quote: string;
    context: string;
    evidenceType: "lexical" | "structural" | "both";
    lexicalMatch?: string;
    structuralMatch?: string;
  }>;
  summaryObservation: string;
  differentiationHypothesis: string;
  dualTierEvidence: {
    lexicalPresent: boolean;
    structuralPresent: boolean;
    contradictionNoted: boolean;
    scoreCappedDueToMissingTier: boolean;
  };
  disqualifiersChecked: Array<{
    disqualifier: string;
    triggered: boolean;
    evidence: string;
  }>;
  competingPrincipleResolution: {
    competingPrinciple: string;
    thisPrincipleSignalsPresent: boolean;
    competingPrincipleSignalsPresent: boolean;
    tiebreakerApplied: boolean;
    tiebreakerDimension: string;
    tiebreakerOutcome: string;
    reasoning: string;
  };
  notes?: string;
}

interface SynthesisData {
  candidate_name: string;
  company: string;
  source_url: string;
  synthesis_timestamp: string;
  principleOutputs: PrincipleAgentOutput[];
  convergenceReport: {
    strongSignals: string[];
    weakSignals: string[];
    belowThreshold: string[];
    convergence: "strong" | "weak";
    corePrinciples: string[];
  };
  synthesisMetadata: unknown;
}

async function buildSystemPrompt(): Promise<string> {
  const md = await readFile(SYNTHESIZER_PROMPT_PATH, "utf8");
  const match = md.match(/## System Prompt\s*\n\s*```\s*([\s\S]*?)\s*```/);
  if (!match) {
    throw new Error(
      `Could not find System Prompt code block in ${SYNTHESIZER_PROMPT_PATH}`,
    );
  }
  return match[1].trim();
}

async function buildUserPrompt(slug: string, playbookFull: string): Promise<string> {
  const bundle = await readInputBundle(slug);
  const primary = bundle.sources[0];
  if (!primary) {
    throw new Error(`No primary source found for ${slug}`);
  }
  return `PRIMARY SOURCE METADATA:
- candidate_name: ${bundle.meta.candidate_name}
- company: ${bundle.meta.company}
- source_url: ${primary.url}
- source_date: ${primary.date ?? "(not available)"}
- source_type: ${primary.type}

PRIMARY SOURCE CONTENT:
---
${primary.content}
---

REQUIRED SECONDARY SOURCES (for dual-tier evidence):
- LinkedIn headline: ${bundle.first_party.linkedin_headline}
- LinkedIn About (full):
${bundle.first_party.linkedin_about}

- Website hero (h1 + sub):
${bundle.first_party.website_hero}

- Website About first paragraph:
${bundle.first_party.website_about_first}

PLAYBOOK (full text, all 15 entries with policy):
---
${playbookFull}
---

Produce the synthesis JSON now.`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = requireArg(args, "candidate");
  const runs = parseInt((args.runs as string) ?? "1", 10);
  const modelArg = ((args.model as string) ?? "opus").toLowerCase();
  if (modelArg !== "opus" && modelArg !== "sonnet" && modelArg !== "haiku") {
    throw new Error(`--model must be 'opus' | 'sonnet' | 'haiku', got: ${modelArg}`);
  }
  const model: ModelKey = modelArg;

  // Gate check
  const status = await readGateStatus(slug);
  if (status !== "approved") {
    throw new Error(
      `Cannot synthesize: STATUS for ${slug} is "${status ?? "absent"}", required "approved". ` +
        `Run extract.ts first, then approve with: npm run playbook:approve -- --candidate ${slug}`,
    );
  }

  console.log(`[synth] candidate=${slug} model=${model} runs=${runs}`);

  const promptInfo = await readPromptVersion(SYNTHESIZER_PROMPT_PATH);
  const playbookInfo = await readPlaybookVersion();
  const playbookFull = await readFile(PLAYBOOK_PATH, "utf8");
  const bundle = await readInputBundle(slug);

  const systemPrompt = await buildSystemPrompt();
  const userPrompt = await buildUserPrompt(slug, playbookFull);

  // Cost preview
  const inputCharCount = systemPrompt.length + userPrompt.length;
  const estimatedInputTokens = Math.ceil(inputCharCount / 3.5);
  const estimatedCostPerRun =
    (estimatedInputTokens / 1_000_000) * (model === "opus" ? 15 : model === "sonnet" ? 3 : 1) +
    (MAX_TOKENS / 1_000_000) * (model === "opus" ? 75 : model === "sonnet" ? 15 : 5) * 0.5; // estimate ~50% of max output
  console.log(
    `[synth] estimated cost per run: ~$${estimatedCostPerRun.toFixed(3)} (×${runs} runs = ~$${(estimatedCostPerRun * runs).toFixed(3)})`,
  );

  let totalCost = 0;
  for (let runNumber = 1; runNumber <= runs; runNumber++) {
    console.log(`[synth] run ${runNumber}/${runs}...`);
    const result = await callAnthropic({
      model,
      systemPrompt,
      userPrompt,
      temperature: TEMPERATURE,
      maxTokens: MAX_TOKENS,
    });

    const synthesisData = parseJsonResponse<SynthesisData>(
      result.content,
      `synthesize.ts run ${runNumber}`,
    );

    // Validation: 15 principleOutputs required
    if (!Array.isArray(synthesisData.principleOutputs) || synthesisData.principleOutputs.length !== 15) {
      throw new Error(
        `Synthesis run ${runNumber} returned ${synthesisData.principleOutputs?.length ?? 0} principleOutputs, expected 15. ` +
          `This is a structural failure — re-run with same prompt or fix prompt.`,
      );
    }

    const metadata: ArtifactMetadata = {
      candidate_slug: slug,
      artifact_type: "synthesis",
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

    const filename = artifactFilename({
      type: "synthesis",
      promptVersion: promptInfo.version,
      runNumber,
      date: todayDate(),
    });
    const outPath = path.join(RUNS_ROOT, "syntheses", slug, filename);
    await writeArtifact(outPath, wrapArtifact(metadata, synthesisData));

    totalCost += result.costUsd;
    console.log(
      `[synth] ✓ run ${runNumber} cost: $${result.costUsd.toFixed(4)} (${result.usage.input_tokens} in + ${result.usage.output_tokens} out tokens)`,
    );
    console.log(`[synth]   wrote ${outPath}`);
  }

  console.log(``);
  console.log(`[synth] total cost: $${totalCost.toFixed(4)}`);
  console.log(`[synth] all ${runs} runs complete.`);
  console.log(``);
  console.log(`Next: run mapping with:`);
  console.log(`  npm run playbook:map -- --candidate ${slug}`);
}

main().catch((err) => {
  console.error(`[synth] ERROR: ${(err as Error).message}`);
  process.exit(1);
});
