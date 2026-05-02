// ═══════════════════════════════════════════════
// Harness Orchestrator (CLI)
//
// Usage:
//   npx tsx evals/differentiation/harness/runHarness.ts
//   ANTHROPIC_API_KEY=... HARNESS_MODE=live npx tsx evals/differentiation/harness/runHarness.ts
//
// Runs all 20 personas through:
//   1. generateDifferentiation()  → DifferentiationResult
//   2. generateAlternatives()     → ChatGPT + template baselines
//   3. 4 red-team prompts × persona → JSON outputs
//   4. Optional: 1 premortem prompt run (only on failure or --premortem flag)
//   5. computeIBAR() over all persona bundles
//   6. Write JSON to outputs/run-<timestamp>.json
//
// Output JSON shape is defined as HarnessRun below.
// ═══════════════════════════════════════════════

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { generateDifferentiation } from "../../../src/engine/differentiationEngine";
import type { DifferentiationResult } from "../../../src/types/differentiation";

import { personas } from "../personas/synthetic-personas";
import { validatePersonas } from "../personas/personaSchema";
import {
  buildCriticPrompt, buildUsabilityPrompt, buildOwnershipPrompt,
  buildComparisonPrompt, buildPreMortemPrompt,
  type CriticOutput, type UsabilityOutput, type OwnershipOutput,
  type ComparisonOutput, type PreMortemOutput,
} from "./redTeamPrompts";
import { callLLM, parseStrictJSON, resolveMode } from "./llmClient";
import { generateAlternatives } from "./compareToAlternatives";
import {
  computeIBAR, genericityFailureCount, formatIBAR,
  type PersonaRedTeamBundle, type SyntheticIBAR,
} from "./scoring";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PersonaRunRecord {
  personaId: string;
  archetype: string;
  segment: string;
  ffOneLiner: { he: string; en: string };
  alternatives: { chatgpt: string; template: string };
  redTeam: {
    critic: CriticOutput;
    usability: UsabilityOutput;
    ownership: OwnershipOutput;
    comparison: ComparisonOutput;
  };
  expectedFailureMode?: string;
}

export interface HarnessRun {
  runId: string;
  startedAt: string;
  finishedAt: string;
  mode: "mock" | "live";
  n: number;
  ibar: SyntheticIBAR;
  genericityFailures: number;
  killCriteriaTriggered: string[];
  records: PersonaRunRecord[];
  premortem?: PreMortemOutput;
}

// ─── Single persona run ─────────────────────────────────────────────────────

async function runPersona(
  persona: typeof personas[number],
): Promise<{ record: PersonaRunRecord; bundle: PersonaRedTeamBundle }> {
  // 1. Generate differentiation result. We need a mechanism statement; in
  // mock/live mode we synthesize a oneLiner via LLM (production has its own
  // upstream synthesis step we are deliberately skipping here).
  const oneLinerRaw = await callLLM({
    prompt: buildOneLinerPrompt(persona),
    promptKind: "oneLiner",
    seed: `${persona.formData.businessName}|oneLiner`,
    maxTokens: 256,
  });
  const oneLiner = parseStrictJSON<{ he: string; en: string }>(oneLinerRaw);

  const result: DifferentiationResult = generateDifferentiation(persona.formData, {
    phase5: {
      mechanismStatement: {
        oneLiner,
        mechanism: `${persona.formData.industry} via ${persona.archetype.split(",")[0]}`,
        proof: persona.formData.claimExamples.find((c) => c.verified)?.evidence ?? "",
        antiStatement: "אנחנו לא קייטרינג זול / סוכנות גנרית",
        perRole: {},
      },
    },
  });

  // 2. Alternatives
  const alternatives = await generateAlternatives(persona);

  // 3. Red team — 4 prompts in sequence (live: keep concurrency low for rate limits)
  const seedBase = persona.id;
  const [criticRaw, usabilityRaw, ownershipRaw, comparisonRaw] = await Promise.all([
    callLLM({ prompt: buildCriticPrompt(persona, result), promptKind: "critic", seed: `${seedBase}|critic`, maxTokens: 512 }),
    callLLM({ prompt: buildUsabilityPrompt(persona, result), promptKind: "usability", seed: `${seedBase}|usability`, maxTokens: 512 }),
    callLLM({ prompt: buildOwnershipPrompt(persona, result), promptKind: "ownership", seed: `${seedBase}|ownership`, maxTokens: 512 }),
    callLLM({
      prompt: buildComparisonPrompt(persona, result, alternatives.chatgpt, alternatives.template),
      promptKind: "comparison", seed: `${seedBase}|comparison`, maxTokens: 768,
    }),
  ]);

  const critic = parseStrictJSON<CriticOutput>(criticRaw);
  const usability = parseStrictJSON<UsabilityOutput>(usabilityRaw);
  const ownership = parseStrictJSON<OwnershipOutput>(ownershipRaw);
  const comparison = parseStrictJSON<ComparisonOutput>(comparisonRaw);

  const record: PersonaRunRecord = {
    personaId: persona.id,
    archetype: persona.archetype,
    segment: persona.segment,
    ffOneLiner: oneLiner,
    alternatives,
    redTeam: { critic, usability, ownership, comparison },
    expectedFailureMode: persona.expectedFailureMode,
  };

  const bundle: PersonaRedTeamBundle = {
    personaId: persona.id,
    critic, usability, ownership, comparison,
    improvedClarityHigher: false, // v2 iteration not yet implemented; remains 0 in IBAR
  };

  return { record, bundle };
}

function buildOneLinerPrompt(persona: typeof personas[number]): string {
  const f = persona.formData;
  return `
תכתוב משפט בידול לעסק. החזר JSON תקין בלבד עם השדות he ו-en.

עסק: ${f.businessName}
תחום: ${f.industry}
מתחרים: ${f.topCompetitors.join(", ") || "—"}
positioning נוכחי: ${f.currentPositioning || "—"}
טענות עם הוכחה: ${f.claimExamples.filter((c) => c.verified).map((c) => `${c.claim}: ${c.evidence}`).join("; ") || "—"}
ציטוט לקוח: ${f.customerQuote || "—"}

החזר JSON:
{ "he": "...", "en": "..." }
`.trim();
}

// ─── Kill criteria evaluation (plan §9) ─────────────────────────────────────

function evaluateKillCriteria(
  ibar: SyntheticIBAR,
  bundles: PersonaRedTeamBundle[],
  genericFailures: number,
): string[] {
  const triggered: string[] = [];
  if (genericFailures > 8) triggered.push(`genericity_failure ${genericFailures}/${ibar.n} > 8 — engine returns generic statements`);
  if (ibar.preference < 8) triggered.push(`preference ${ibar.preference}/${ibar.n} < 8 — no edge over raw ChatGPT`);
  if (ibar.applicability < 8) triggered.push(`applicability ${ibar.applicability}/${ibar.n} < 8 — promise is wrong, not the wording`);
  if (ibar.clarity < 12) triggered.push(`clarity ${ibar.clarity}/${ibar.n} < 12 — engine/copy fundamentals broken`);
  // "majority of failures from one persona" gate
  const totalFailures = Object.values(ibar.perPersonaFailures).reduce((a, b) => a + b, 0);
  if (totalFailures > 0) {
    const [worstId, worstCount] = Object.entries(ibar.perPersonaFailures)
      .sort((a, b) => b[1] - a[1])[0];
    if (worstCount > totalFailures * 0.5) {
      triggered.push(`>50% of failures concentrate in persona ${worstId} (${worstCount}/${totalFailures}) — ICP problem`);
    }
  }
  return triggered;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const wantPremortem = args.includes("--premortem");

  validatePersonas(personas);
  const mode = resolveMode();
  const startedAt = new Date().toISOString();
  const runId = `run-${Date.now()}`;

  console.log(`[harness] mode=${mode}  n=${personas.length}  runId=${runId}`);
  if (mode === "mock") {
    console.log("[harness] WARNING: mock mode is fail-biased by design. IBAR cannot pass gates in mock mode.");
  }

  const records: PersonaRunRecord[] = [];
  const bundles: PersonaRedTeamBundle[] = [];

  for (const persona of personas) {
    process.stdout.write(`[harness] ${persona.id} ${persona.segment} … `);
    try {
      const { record, bundle } = await runPersona(persona);
      records.push(record);
      bundles.push(bundle);
      console.log("ok");
    } catch (err) {
      console.log(`FAIL: ${(err as Error).message}`);
      throw err;
    }
  }

  const ibar = computeIBAR(bundles);
  const genericFailures = genericityFailureCount(bundles);
  const killCriteria = evaluateKillCriteria(ibar, bundles, genericFailures);

  let premortem: PreMortemOutput | undefined;
  if (wantPremortem || !ibar.passesGates) {
    // Run a single premortem on the worst persona (most failures)
    const worst = [...bundles].sort(
      (a, b) => (ibar.perPersonaFailures[b.personaId] ?? 0) - (ibar.perPersonaFailures[a.personaId] ?? 0),
    )[0];
    const worstPersona = personas.find((p) => p.id === worst.personaId)!;
    const worstRecord = records.find((r) => r.personaId === worst.personaId)!;
    // Re-derive a minimal DifferentiationResult shell for the premortem prompt
    const shellResult = generateDifferentiation(worstPersona.formData, {
      phase5: {
        mechanismStatement: {
          oneLiner: worstRecord.ffOneLiner,
          mechanism: "", proof: "", antiStatement: "", perRole: {},
        },
      },
    });
    const raw = await callLLM({
      prompt: buildPreMortemPrompt(worstPersona, shellResult),
      promptKind: "premortem",
      seed: `${worstPersona.id}|premortem`,
      maxTokens: 2048,
    });
    premortem = parseStrictJSON<PreMortemOutput>(raw);
  }

  const finishedAt = new Date().toISOString();
  const run: HarnessRun = {
    runId, startedAt, finishedAt, mode,
    n: personas.length,
    ibar,
    genericityFailures: genericFailures,
    killCriteriaTriggered: killCriteria,
    records,
    premortem,
  };

  // Write output
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outDir = join(__dirname, "..", "outputs");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `${runId}.json`);
  writeFileSync(outPath, JSON.stringify(run, null, 2), "utf8");

  // Summary
  console.log("\n" + formatIBAR(ibar));
  console.log(`Genericity failures: ${genericFailures}/${ibar.n}`);
  if (killCriteria.length > 0) {
    console.log("Kill criteria triggered:");
    for (const k of killCriteria) console.log(`  - ${k}`);
  } else {
    console.log("No kill criteria triggered.");
  }
  console.log(`\nRun written to ${outPath}`);
}

// CLI entry: invoked via vite-node or tsx. main() runs unconditionally
// because this file is not imported by anything else.
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
