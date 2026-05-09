// ═══════════════════════════════════════════════
// knowledge/principles/runs/scripts/compare.ts
//
// Phase 2+: Deterministic comparison layer. NO LLM calls. Compares the
// synthesis output against the extraction (via the mapping) and produces
// the 10 comparison metrics defined in the test-subjects.md strategy.
//
// Usage:
//   npm run playbook:compare -- --candidate <slug>
//
// Inputs:
//   - latest extraction artifact for the candidate
//   - all synthesis run artifacts for the candidate (latest version)
//   - mapping aggregate artifact for the candidate
//
// Output:
//   - comparison artifact (JSON) with 10 metrics + flags
// ═══════════════════════════════════════════════

import { readdir } from "node:fs/promises";
import * as path from "node:path";
import {
  RUNS_ROOT,
  readArtifact,
  wrapArtifact,
  writeArtifact,
  readPlaybookVersion,
  artifactFilename,
  todayDate,
  parseArgs,
  requireArg,
  type Artifact,
  type ArtifactMetadata,
} from "./utils.js";

interface ExtractionData {
  candidate_name: string;
  company: string;
  source_url: string;
  core_differentiation_claim: {
    summary_3_5_sentences: string;
    in_ceo_own_terminology: string[];
  };
  supporting_verbatim_quotes: Array<{ quote: string; context: string }>;
  what_ceo_explicitly_says_they_are_NOT: string[];
  company_specific_proof_points: string[];
  industry_supporting_claims: string[];
  tradeoffs_or_constraints_acknowledged: string[];
  _validation?: { quality: "high" | "low"; failures: string[] };
}

interface PrincipleAgentOutput {
  principleCode: string;
  principleName: string;
  relevanceScore: number;
  evidenceQuotes: Array<{ quote: string; context: string; evidenceType: string }>;
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
}

interface SynthesisData {
  principleOutputs: PrincipleAgentOutput[];
  convergenceReport: {
    strongSignals: string[];
    weakSignals: string[];
    belowThreshold: string[];
    convergence: "strong" | "weak";
    corePrinciples: string[];
  };
}

interface AggregatedMappingEntry {
  ceo_term: string;
  primary_principle_consensus: string | null;
  consensus_level: "high" | "medium" | "low" | "no_consensus";
  appearances_count: number;
}

interface MappingAggregateData {
  aggregate: AggregatedMappingEntry[];
  summary: unknown;
}

const CTM_AXIS: Record<string, "M" | "T" | "C"> = {
  P01: "M", P02: "M", P03: "M", P04: "M", P05: "M",
  P06: "T", P07: "T", P08: "T", P09: "T", P10: "T",
  P11: "C", P12: "C", P13: "C", P14: "C", P15: "C",
};

interface ComparisonMetrics {
  // Per-synthesis-run metrics (averaged across runs)
  ground_truth_coverage: {
    description: string;
    expected_principles: string[];
    synthesis_top_principles_per_run: string[][];
    matches_per_run: number[];
    coverage_pct_per_run: number[];
    average_coverage_pct: number;
    threshold_pct: number;
    pass: boolean;
  };

  hallucination_rate: {
    description: string;
    high_score_principles_per_run: string[][];
    unmapped_high_scores_per_run: string[][];
    rate_pct_per_run: number[];
    average_rate_pct: number;
    threshold_pct: number;
    pass: boolean;
  };

  ctm_axis_match: {
    description: string;
    expected_primary_axis: ("M" | "T" | "C")[];
    synthesis_top_axis_per_run: ("M" | "T" | "C" | null)[];
    matches_per_run: boolean[];
    match_pct: number;
    threshold_pct: number;
    pass: boolean;
  };

  stability: {
    description: string;
    n_runs: number;
    score_variance_per_principle: Array<{
      principle: string;
      scores: number[];
      max_minus_min: number;
    }>;
    max_variance_observed: number;
    threshold: number;
    pass: boolean;
  };

  evidence_density: {
    description: string;
    high_score_principles_per_run: number[];
    avg_quotes_per_high_score: number;
    threshold_min_quotes: number;
    pass: boolean;
  };

  disqualifier_engagement: {
    description: string;
    triggered_count_per_run: number[];
    high_score_with_triggered_disqualifier_per_run: number[];
    pass: boolean;
  };

  competing_pair_resolution: {
    description: string;
    pairs_with_both_signals_per_run: number[];
    tiebreakers_used_per_run: number[];
    soft_landings_per_run: number[];
    pass: boolean;
  };

  score_spread: {
    description: string;
    score_std_dev_per_run: number[];
    average_std_dev: number;
    threshold_min: number;
    pass: boolean;
  };

  validation_quality_propagation: {
    description: string;
    extraction_validation_quality: "high" | "low" | "unknown";
    decision_gate_eligible: boolean;
  };

  metadata_consistency: {
    description: string;
    all_runs_use_same_prompt_version: boolean;
    all_runs_use_same_playbook_version: boolean;
    all_runs_use_same_input_bundle_hash: boolean;
    pass: boolean;
  };
}

async function findLatestArtifact(slug: string, type: string, prefix: string): Promise<string> {
  const dir = path.join(RUNS_ROOT, type, slug);
  const files = await readdir(dir);
  const matchingFiles = files
    .filter((f) => f.startsWith(prefix) && f.endsWith(".json"))
    .sort()
    .reverse();
  if (matchingFiles.length === 0) {
    throw new Error(`No ${type} artifact found for ${slug} matching ${prefix}*`);
  }
  return path.join(dir, matchingFiles[0]);
}

async function findAllSynthesisRuns(slug: string, _hintedVersion: string): Promise<string[]> {
  // Find synthesis files for this slug at the latest available version.
  // (Originally tried to match the extractor's prompt_version, but the
  // synthesizer has its own version that may differ. Pick the highest
  // version present in the directory.)
  const dir = path.join(RUNS_ROOT, "syntheses", slug);
  const files = await readdir(dir);
  const synth = files.filter((f) => f.startsWith("synthesis__v") && f.endsWith(".json"));
  if (synth.length === 0) return [];
  const versions = new Set<string>();
  for (const f of synth) {
    const m = f.match(/^synthesis__v([\d.]+)__/);
    if (m) versions.add(m[1]);
  }
  const latest = [...versions].sort().reverse()[0];
  return synth
    .filter((f) => f.startsWith(`synthesis__v${latest}__run`))
    .sort()
    .map((f) => path.join(dir, f));
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = requireArg(args, "candidate");

  console.log(`[compare] candidate=${slug}`);

  // Load artifacts
  const extractionPath = await findLatestArtifact(slug, "extractions", "extraction__");
  // Mapper writes per-run files AND an aggregate file. We always want the aggregate.
  const mappingAggDir = path.join(RUNS_ROOT, "mappings", slug);
  const mappingFiles = await readdir(mappingAggDir);
  const mappingAggregates = mappingFiles
    .filter((f) => f.includes("__aggregate__") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (mappingAggregates.length === 0) {
    throw new Error(
      `No mapping aggregate file found for ${slug}. Run mapper first; it writes mapping__v...__aggregate__date.json.`,
    );
  }
  const finalMappingAggPath = path.join(mappingAggDir, mappingAggregates[0]);

  const extractionArtifact = await readArtifact<ExtractionData>(extractionPath);
  const mappingArtifact = await readArtifact<MappingAggregateData>(finalMappingAggPath);

  const synthesisVersion = extractionArtifact.metadata.prompt_version; // assume same major version
  const synthesisFiles = await findAllSynthesisRuns(slug, synthesisVersion);
  if (synthesisFiles.length === 0) {
    throw new Error(`No synthesis runs found for ${slug} at version ${synthesisVersion}`);
  }
  const synthesisArtifacts = await Promise.all(
    synthesisFiles.map((f) => readArtifact<SynthesisData>(f)),
  );

  // Compute expected_principles from mapping aggregate (high + medium consensus only)
  const expectedPrinciples = Array.from(
    new Set(
      mappingArtifact.data.aggregate
        .filter((m) => m.consensus_level === "high" || m.consensus_level === "medium")
        .map((m) => m.primary_principle_consensus)
        .filter((p): p is string => p !== null),
    ),
  );

  // Per-run analysis
  const synthesisTopPerRun = synthesisArtifacts.map((s) =>
    s.data.principleOutputs
      .filter((p) => p.relevanceScore >= 7)
      .map((p) => p.principleCode),
  );

  // Metric 1: ground_truth_coverage
  const matchesPerRun = synthesisTopPerRun.map(
    (top) => top.filter((p) => expectedPrinciples.includes(p)).length,
  );
  const coveragePctPerRun = matchesPerRun.map((m) =>
    expectedPrinciples.length === 0 ? 100 : (m / expectedPrinciples.length) * 100,
  );
  const avgCoverage =
    coveragePctPerRun.reduce((a, b) => a + b, 0) / coveragePctPerRun.length;

  // Metric 2: hallucination_rate
  const unmappedHighScoresPerRun = synthesisTopPerRun.map((top) =>
    top.filter((p) => !expectedPrinciples.includes(p)),
  );
  const ratePctPerRun = unmappedHighScoresPerRun.map((u, i) =>
    synthesisTopPerRun[i].length === 0 ? 0 : (u.length / synthesisTopPerRun[i].length) * 100,
  );
  const avgRate = ratePctPerRun.reduce((a, b) => a + b, 0) / ratePctPerRun.length;

  // Metric 3: ctm_axis_match
  const expectedAxes = Array.from(
    new Set(expectedPrinciples.map((p) => CTM_AXIS[p]).filter(Boolean)),
  );
  const synthesisTopAxisPerRun = synthesisArtifacts.map((s) => {
    const top = s.data.principleOutputs
      .slice()
      .sort((a, b) => b.relevanceScore - a.relevanceScore)[0];
    return top ? CTM_AXIS[top.principleCode] ?? null : null;
  });
  const axisMatchesPerRun = synthesisTopAxisPerRun.map(
    (axis) => axis !== null && expectedAxes.includes(axis),
  );
  const axisMatchPct =
    (axisMatchesPerRun.filter(Boolean).length / axisMatchesPerRun.length) * 100;

  // Metric 4: stability (only meaningful if N runs >= 2)
  const variancePerPrinciple: ComparisonMetrics["stability"]["score_variance_per_principle"] = [];
  if (synthesisArtifacts.length >= 2) {
    const allPrincipleCodes = synthesisArtifacts[0].data.principleOutputs.map((p) => p.principleCode);
    for (const code of allPrincipleCodes) {
      const scores = synthesisArtifacts.map(
        (s) => s.data.principleOutputs.find((p) => p.principleCode === code)?.relevanceScore ?? 0,
      );
      variancePerPrinciple.push({
        principle: code,
        scores,
        max_minus_min: Math.max(...scores) - Math.min(...scores),
      });
    }
  }
  const maxVariance = variancePerPrinciple.length > 0
    ? Math.max(...variancePerPrinciple.map((v) => v.max_minus_min))
    : 0;

  // Metric 5: evidence_density
  const highScoreQuoteCounts: number[] = [];
  for (const s of synthesisArtifacts) {
    for (const p of s.data.principleOutputs) {
      if (p.relevanceScore >= 7) highScoreQuoteCounts.push(p.evidenceQuotes.length);
    }
  }
  const avgQuotesPerHighScore = highScoreQuoteCounts.length > 0
    ? highScoreQuoteCounts.reduce((a, b) => a + b, 0) / highScoreQuoteCounts.length
    : 0;

  // Metric 6: disqualifier_engagement
  const triggeredCountPerRun = synthesisArtifacts.map((s) =>
    s.data.principleOutputs.reduce(
      (sum, p) => sum + p.disqualifiersChecked.filter((d) => d.triggered).length,
      0,
    ),
  );
  const highScoreWithTriggeredPerRun = synthesisArtifacts.map((s) =>
    s.data.principleOutputs.filter(
      (p) =>
        p.relevanceScore >= 7 &&
        p.disqualifiersChecked.some((d) => d.triggered),
    ).length,
  );

  // Metric 7: competing_pair_resolution
  const pairsWithBothPerRun = synthesisArtifacts.map((s) =>
    s.data.principleOutputs.filter(
      (p) =>
        p.competingPrincipleResolution.thisPrincipleSignalsPresent &&
        p.competingPrincipleResolution.competingPrincipleSignalsPresent,
    ).length,
  );
  const tiebreakersUsedPerRun = synthesisArtifacts.map((s) =>
    s.data.principleOutputs.filter((p) => p.competingPrincipleResolution.tiebreakerApplied).length,
  );
  const softLandingsPerRun = synthesisArtifacts.map((s) =>
    s.data.principleOutputs.filter(
      (p) =>
        p.competingPrincipleResolution.tiebreakerOutcome === "both_score_low_per_meta_policy",
    ).length,
  );

  // Metric 8: score_spread
  const stdDevPerRun = synthesisArtifacts.map((s) =>
    stdDev(s.data.principleOutputs.map((p) => p.relevanceScore)),
  );
  const avgStdDev = stdDevPerRun.reduce((a, b) => a + b, 0) / stdDevPerRun.length;

  // Metric 9: validation_quality_propagation
  const validationQuality = extractionArtifact.data._validation?.quality ?? "unknown";

  // Metric 10: metadata_consistency
  const promptVersions = new Set(synthesisArtifacts.map((s) => s.metadata.prompt_version));
  const playbookVersions = new Set(synthesisArtifacts.map((s) => s.metadata.playbook_version));
  const inputHashes = new Set(synthesisArtifacts.map((s) => s.metadata.input_bundle_hash_sha256));

  // Thresholds (per test-subjects.md strategy)
  const COVERAGE_THRESHOLD = 60;
  const HALLUCINATION_THRESHOLD = 30;
  const AXIS_MATCH_THRESHOLD = 60;
  const STABILITY_THRESHOLD = 1.5;
  const EVIDENCE_MIN_QUOTES = 1;
  const SCORE_SPREAD_THRESHOLD = 2.0;

  const metrics: ComparisonMetrics = {
    ground_truth_coverage: {
      description: "% of principles ranked ≥7 by synthesis that match the mapper's expected primaries (consensus high+medium).",
      expected_principles: expectedPrinciples,
      synthesis_top_principles_per_run: synthesisTopPerRun,
      matches_per_run: matchesPerRun,
      coverage_pct_per_run: coveragePctPerRun,
      average_coverage_pct: avgCoverage,
      threshold_pct: COVERAGE_THRESHOLD,
      pass: avgCoverage >= COVERAGE_THRESHOLD,
    },
    hallucination_rate: {
      description: "% of synthesis principles ranked ≥7 that DO NOT appear in mapper's expected primaries.",
      high_score_principles_per_run: synthesisTopPerRun,
      unmapped_high_scores_per_run: unmappedHighScoresPerRun,
      rate_pct_per_run: ratePctPerRun,
      average_rate_pct: avgRate,
      threshold_pct: HALLUCINATION_THRESHOLD,
      pass: avgRate <= HALLUCINATION_THRESHOLD,
    },
    ctm_axis_match: {
      description: "Whether the top-scoring principle's CTM axis matches the mapper's expected axes.",
      expected_primary_axis: expectedAxes,
      synthesis_top_axis_per_run: synthesisTopAxisPerRun,
      matches_per_run: axisMatchesPerRun,
      match_pct: axisMatchPct,
      threshold_pct: AXIS_MATCH_THRESHOLD,
      pass: axisMatchPct >= AXIS_MATCH_THRESHOLD,
    },
    stability: {
      description: "Max score range (max-min) across runs for any principle. Lower = more stable.",
      n_runs: synthesisArtifacts.length,
      score_variance_per_principle: variancePerPrinciple,
      max_variance_observed: maxVariance,
      threshold: STABILITY_THRESHOLD,
      pass: maxVariance <= STABILITY_THRESHOLD,
    },
    evidence_density: {
      description: "Average number of evidence quotes per high-score principle.",
      high_score_principles_per_run: synthesisTopPerRun.map((t) => t.length),
      avg_quotes_per_high_score: avgQuotesPerHighScore,
      threshold_min_quotes: EVIDENCE_MIN_QUOTES,
      pass: avgQuotesPerHighScore >= EVIDENCE_MIN_QUOTES,
    },
    disqualifier_engagement: {
      description: "Disqualifiers should be triggered when applicable; high scores should not coexist with triggered disqualifiers.",
      triggered_count_per_run: triggeredCountPerRun,
      high_score_with_triggered_disqualifier_per_run: highScoreWithTriggeredPerRun,
      pass: highScoreWithTriggeredPerRun.every((c) => c === 0),
    },
    competing_pair_resolution: {
      description: "When competing pairs both fire, tiebreaker should be applied. No 'both_high' soft landings.",
      pairs_with_both_signals_per_run: pairsWithBothPerRun,
      tiebreakers_used_per_run: tiebreakersUsedPerRun,
      soft_landings_per_run: softLandingsPerRun,
      pass: pairsWithBothPerRun.every((p, i) => p === 0 || tiebreakersUsedPerRun[i] >= p / 2),
    },
    score_spread: {
      description: "Std dev of relevanceScore distribution. Low std dev = no discrimination (lazy analysis).",
      score_std_dev_per_run: stdDevPerRun,
      average_std_dev: avgStdDev,
      threshold_min: SCORE_SPREAD_THRESHOLD,
      pass: avgStdDev >= SCORE_SPREAD_THRESHOLD,
    },
    validation_quality_propagation: {
      description: "If extraction is low-quality, decision gates do not apply.",
      extraction_validation_quality: validationQuality,
      decision_gate_eligible: validationQuality === "high",
    },
    metadata_consistency: {
      description: "All synthesis runs must share prompt version, playbook version, and input bundle hash.",
      all_runs_use_same_prompt_version: promptVersions.size === 1,
      all_runs_use_same_playbook_version: playbookVersions.size === 1,
      all_runs_use_same_input_bundle_hash: inputHashes.size === 1,
      pass:
        promptVersions.size === 1 &&
        playbookVersions.size === 1 &&
        inputHashes.size === 1,
    },
  };

  // Summary
  const decisionGates = [
    metrics.ground_truth_coverage.pass,
    metrics.hallucination_rate.pass,
    metrics.ctm_axis_match.pass,
    metrics.stability.pass,
    metrics.evidence_density.pass,
    metrics.disqualifier_engagement.pass,
    metrics.competing_pair_resolution.pass,
    metrics.score_spread.pass,
    metrics.metadata_consistency.pass,
  ];
  const passedCount = decisionGates.filter(Boolean).length;
  const summary = {
    decision_gate_eligible: metrics.validation_quality_propagation.decision_gate_eligible,
    passed_count: passedCount,
    total_count: decisionGates.length,
    overall: passedCount === decisionGates.length ? "all_pass" : "partial_or_fail",
  };

  // Write
  const playbookInfo = await readPlaybookVersion();
  const aggregateMetadata: ArtifactMetadata = {
    candidate_slug: slug,
    artifact_type: "comparison",
    prompt_version: synthesisArtifacts[0].metadata.prompt_version,
    prompt_hash_sha256: synthesisArtifacts[0].metadata.prompt_hash_sha256,
    playbook_version: playbookInfo.version,
    playbook_hash_sha256: playbookInfo.hash,
    model: "deterministic (no LLM)",
    temperature: 0,
    run_number: 0,
    timestamp_iso: new Date().toISOString(),
    input_bundle_hash_sha256: extractionArtifact.metadata.input_bundle_hash_sha256,
    cost_usd: 0,
    usage: { input_tokens: 0, output_tokens: 0 },
  };

  const filename = `comparison__v${synthesisArtifacts[0].metadata.prompt_version}__${todayDate()}.json`;
  const outPath = path.join(RUNS_ROOT, "comparisons", slug, filename);
  await writeArtifact(
    outPath,
    wrapArtifact(aggregateMetadata, { metrics, summary }),
  );

  console.log(`[compare] ✓ wrote ${outPath}`);
  console.log(``);
  console.log(`[compare] decision gate summary:`);
  console.log(`  - decision_gate_eligible: ${summary.decision_gate_eligible}`);
  console.log(`  - passed: ${summary.passed_count}/${summary.total_count}`);
  console.log(`  - overall: ${summary.overall}`);
  console.log(``);
  console.log(`[compare] per-metric pass/fail:`);
  console.log(`  - ground_truth_coverage: ${metrics.ground_truth_coverage.pass ? "PASS" : "FAIL"} (${metrics.ground_truth_coverage.average_coverage_pct.toFixed(1)}% / ${metrics.ground_truth_coverage.threshold_pct}%)`);
  console.log(`  - hallucination_rate: ${metrics.hallucination_rate.pass ? "PASS" : "FAIL"} (${metrics.hallucination_rate.average_rate_pct.toFixed(1)}% / ≤${metrics.hallucination_rate.threshold_pct}%)`);
  console.log(`  - ctm_axis_match: ${metrics.ctm_axis_match.pass ? "PASS" : "FAIL"} (${metrics.ctm_axis_match.match_pct.toFixed(1)}% / ${metrics.ctm_axis_match.threshold_pct}%)`);
  console.log(`  - stability: ${metrics.stability.pass ? "PASS" : "FAIL"} (max variance ${metrics.stability.max_variance_observed.toFixed(2)} / ≤${metrics.stability.threshold})`);
  console.log(`  - evidence_density: ${metrics.evidence_density.pass ? "PASS" : "FAIL"} (avg ${metrics.evidence_density.avg_quotes_per_high_score.toFixed(2)} quotes / ≥${metrics.evidence_density.threshold_min_quotes})`);
  console.log(`  - disqualifier_engagement: ${metrics.disqualifier_engagement.pass ? "PASS" : "FAIL"}`);
  console.log(`  - competing_pair_resolution: ${metrics.competing_pair_resolution.pass ? "PASS" : "FAIL"}`);
  console.log(`  - score_spread: ${metrics.score_spread.pass ? "PASS" : "FAIL"} (std dev ${metrics.score_spread.average_std_dev.toFixed(2)} / ≥${metrics.score_spread.threshold_min})`);
  console.log(`  - metadata_consistency: ${metrics.metadata_consistency.pass ? "PASS" : "FAIL"}`);
}

main().catch((err) => {
  console.error(`[compare] ERROR: ${(err as Error).message}`);
  process.exit(1);
});
