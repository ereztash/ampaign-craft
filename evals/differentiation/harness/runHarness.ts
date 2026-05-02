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
  buildStructuralExtractionPrompt, buildStylometricRenderingPrompt, buildFalsifiabilityCriticPrompt,
  type CriticOutput, type UsabilityOutput, type OwnershipOutput,
  type ComparisonOutput, type PreMortemOutput,
  type StructuralExtractionOutput, type StylometricRenderingOutput, type StylometricAngle,
  type FalsifiabilityCriticOutput,
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
  /** Call 1: structural facts extracted from artifacts. */
  extraction: StructuralExtractionOutput;
  /** Call 2: three stylometric angles in the persona's voice. */
  angles: StylometricRenderingOutput;
  /** Call 3: falsifiability check per angle (parallel). */
  falsifiabilityScores: FalsifiabilityCriticOutput[];
  /** Chosen angle (lowest genericity_score where rewrite_required=false, else angle[0]). */
  chosenAngle: StylometricAngle;
  /** Backward-compat flat form of the chosen angle. */
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
  mode: "mock" | "live" | "proxy";
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
  const seedBase = persona.id;

  // ── Call 1: Structural Extraction ───────────────────────────────────────
  const extractionRaw = await callLLM({
    prompt: buildStructuralExtractionPrompt(persona),
    promptKind: "structuralExtraction",
    seed: `${seedBase}|extraction`,
    maxTokens: 512,
  });
  const extraction = safeParse<StructuralExtractionOutput>(extractionRaw, persona.id, "extraction", {
    metric: { value: "", source: "unknown" },
    named_alternative: "(parse_error)",
    sacrifices: ["(parse_error)", "(parse_error)", "(parse_error)"],
    vocabulary_gap: ["(parse_error)", "(parse_error)", "(parse_error)"],
  });

  // ── Call 2: Stylometric Rendering ────────────────────────────────────────
  const renderingRaw = await callLLM({
    prompt: buildStylometricRenderingPrompt(persona, extraction),
    promptKind: "stylometricRendering",
    seed: `${seedBase}|rendering`,
    maxTokens: 2048,
  });
  const angles = safeParse<StylometricRenderingOutput>(renderingRaw, persona.id, "rendering", {
    angles: [
      { text_he: "(parse_error)", text_en: "(parse_error)", type: "mechanism", borrowed_phrase: "", why_uncomfortable: "" },
      { text_he: "(parse_error)", text_en: "(parse_error)", type: "sacrifice", borrowed_phrase: "", why_uncomfortable: "" },
      { text_he: "(parse_error)", text_en: "(parse_error)", type: "metric", borrowed_phrase: "", why_uncomfortable: "" },
    ],
    selection_prompt: "",
  });

  // ── Call 3: Falsifiability Critic — parallel across 3 angles ─────────────
  const falsifiabilityRaws = await Promise.all(
    angles.angles.map((angle, i) =>
      callLLM({
        prompt: buildFalsifiabilityCriticPrompt(persona, angle),
        promptKind: "falsifiabilityCritic",
        seed: `${seedBase}|falsifiability|${i}`,
        maxTokens: 256,
      }),
    ),
  );
  const falsifiabilityScores = falsifiabilityRaws.map((raw, i) =>
    safeParse<FalsifiabilityCriticOutput>(raw, persona.id, `falsifiability_${i}`, {
      genericity_score: 100,
      who_else_could_say_this: "(parse_error)",
      missing_biographical_constraint: "(parse_error)",
      rewrite_required: true,
    }),
  );

  // Choose the angle with the lowest genericity_score that doesn't require a rewrite.
  // Fall back to angle[0] if all require rewrite.
  const chosenAngle: StylometricAngle = (() => {
    const passing = angles.angles
      .map((a, i) => ({ angle: a, score: falsifiabilityScores[i] }))
      .filter(({ score }) => !score.rewrite_required)
      .sort((a, b) => a.score.genericity_score - b.score.genericity_score);
    return passing[0]?.angle ?? angles.angles[0];
  })();
  const chosenFalsifiability = falsifiabilityScores[angles.angles.indexOf(chosenAngle)] ?? falsifiabilityScores[0];

  // ── Build DifferentiationResult shell for legacy red-team prompts ─────────
  const oneLiner = { he: chosenAngle.text_he, en: chosenAngle.text_en };
  const result: DifferentiationResult = generateDifferentiation(persona.formData, {
    phase5: {
      mechanismStatement: {
        oneLiner,
        mechanism: `${persona.formData.industry} via ${extraction.named_alternative}`,
        proof: persona.formData.claimExamples.find((c) => c.verified)?.evidence ?? extraction.metric.value,
        antiStatement: extraction.sacrifices[0] ?? "",
        perRole: {},
      },
    },
  });

  // ── Alternatives (ChatGPT baseline + template) ────────────────────────────
  const alternatives = await generateAlternatives(persona);

  // ── Red team — 4 prompts in parallel ─────────────────────────────────────
  const [criticRaw, usabilityRaw, ownershipRaw, comparisonRaw] = await Promise.all([
    callLLM({ prompt: buildCriticPrompt(persona, result), promptKind: "critic", seed: `${seedBase}|critic`, maxTokens: 512 }),
    callLLM({ prompt: buildUsabilityPrompt(persona, result), promptKind: "usability", seed: `${seedBase}|usability`, maxTokens: 512 }),
    callLLM({ prompt: buildOwnershipPrompt(persona, result), promptKind: "ownership", seed: `${seedBase}|ownership`, maxTokens: 512 }),
    callLLM({
      prompt: buildComparisonPrompt(persona, result, alternatives.chatgpt, alternatives.template),
      promptKind: "comparison", seed: `${seedBase}|comparison`, maxTokens: 768,
    }),
  ]);

  const critic = safeParse<CriticOutput>(criticRaw, persona.id, "critic", {
    coherent: false, weakest_claim: "(parse_error)", why: "(parse_error)", genericity_score: 100,
  });
  const usability = safeParse<UsabilityOutput>(usabilityRaw, persona.id, "usability", {
    would_use: false, where: [], confidence: 0,
  });
  const ownership = safeParse<OwnershipOutput>(ownershipRaw, persona.id, "ownership", {
    feels_mine: false, what_to_change: "(parse_error)",
  });
  const comparison = safeParse<ComparisonOutput>(comparisonRaw, persona.id, "comparison", {
    winner: "tie",
    on_dimensions: { clarity: "tie", specificity: "tie", actionability: "tie", ownership: "tie" },
    reason: "(parse_error)",
  });

  const record: PersonaRunRecord = {
    personaId: persona.id,
    archetype: persona.archetype,
    segment: persona.segment,
    extraction,
    angles,
    falsifiabilityScores,
    chosenAngle,
    ffOneLiner: oneLiner,
    alternatives,
    redTeam: { critic, usability, ownership, comparison },
    expectedFailureMode: persona.expectedFailureMode,
  };

  const bundle: PersonaRedTeamBundle = {
    personaId: persona.id,
    critic, usability, ownership, comparison,
    falsifiability: chosenFalsifiability,
    improvedClarityHigher: false,
  };

  return { record, bundle };
}

function safeParse<T>(raw: string, personaId: string, kind: string, fallback: T): T {
  try {
    return parseStrictJSON<T>(raw);
  } catch (err) {
    console.warn(`[harness] ${personaId} ${kind} parse failed: ${(err as Error).message}`);
    console.warn(`[harness] ${personaId} ${kind} raw response (first 300 chars): ${raw.slice(0, 300)}`);
    return fallback;
  }
}

// ─── Kill criteria evaluation (plan §9) ─────────────────────────────────────

function evaluateKillCriteria(
  ibar: SyntheticIBAR,
  bundles: PersonaRedTeamBundle[],
  genericFailures: number,
): string[] {
  // Synthetic gates: only dimensions reliably measurable without real users.
  // ownership/applicability are WoZ-only — not included here.
  const triggered: string[] = [];
  if (genericFailures > 8) triggered.push(`genericity_failure ${genericFailures}/${ibar.n} > 8 — falsifiability_score ≥ 60 for too many angles`);
  if (ibar.preference < 8) triggered.push(`preference ${ibar.preference}/${ibar.n} < 8 — no edge over raw ChatGPT`);
  if (ibar.clarity < 12) triggered.push(`clarity ${ibar.clarity}/${ibar.n} < 12 — angles not specific enough (falsifiability.genericity ≥ 60)`);
  if (ibar.falsifiability < 12) triggered.push(`falsifiability ${ibar.falsifiability}/${ibar.n} < 12 — angles not biographical enough, another consultant could sign them`);
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
  } else if (mode === "proxy") {
    console.log(`[harness] proxy=${process.env.HARNESS_PROXY_URL}`);
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
    premortem = safeParse<PreMortemOutput>(raw, worstPersona.id, "premortem", { failures: [] });
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
