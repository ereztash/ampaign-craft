#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════
// Market Gap Report Generator
//
// Produces reports/MARKET_GAP_REPORT.md and prints the
// final CAMPAIGN CRAFT AUDIT block to the console.
//
// Usage: npx tsx scripts/generate-market-gap-report.ts
// ═══════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { scoreMarketGap, MARKET_AVG_PCT, TOP_COMPETITOR_PCT, type ParameterScore } from "./score-market-gap";
import { differentiationCheck } from "./differentiation-check";
import { TOTAL_PARAMETERS } from "./map-parameters";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const REPORTS_DIR = path.join(REPO_ROOT, "reports");
const REPORT_PATH = path.join(REPORTS_DIR, "MARKET_GAP_REPORT.md");
const ENGINE_AUDIT_PATH = path.join(REPORTS_DIR, "engine-audit.json");

// ───────────────────────────────────────────────
// Verdict
// ───────────────────────────────────────────────

type Verdict = "GAP_CONFIRMED" | "GAP_NARROW" | "GAP_UNPROVEN";

function pickVerdict(shippedScore: number, realDifferentiation: number): Verdict {
  // Order matters: check the strongest condition first.
  if (shippedScore < 0.6 || realDifferentiation <= 2 / 5) return "GAP_UNPROVEN";
  if (shippedScore >= 0.72 && realDifferentiation >= 4 / 5) return "GAP_CONFIRMED";
  if ((shippedScore >= 0.6 && shippedScore < 0.72) || Math.abs(realDifferentiation - 3 / 5) < 1e-9) {
    return "GAP_NARROW";
  }
  // Fallthrough — if differentiation is high enough but shipped < 0.72, treat as narrow.
  return "GAP_NARROW";
}

// ───────────────────────────────────────────────
// Quick wins
// ───────────────────────────────────────────────

interface QuickWin {
  param: ParameterScore;
  recommendedEngine: string;
  recommendedPage: string;
}

const PAGE_HINTS: Record<string, string> = {
  predictiveContentScoreEngine: "src/pages/ContentLab.tsx",
  abTestEngine: "src/pages/CommandCenter.tsx",
  predictiveEngine: "src/pages/StrategyCanvas.tsx",
  campaignAnalyticsEngine: "src/pages/Dashboard.tsx",
  churnPredictionEngine: "src/pages/RetentionEntry.tsx",
  behavioralCohortEngine: "src/pages/Dashboard.tsx",
  funnelEngine: "src/pages/Wizard.tsx",
  costOfInactionEngine: "src/pages/Wizard.tsx",
  bottleneckEngine: "src/pages/StrategyCanvas.tsx",
  gapEngine: "src/pages/StrategyCanvas.tsx",
  nextStepEngine: "src/pages/CommandCenter.tsx",
  salesPipelineEngine: "src/pages/SalesEntry.tsx",
  pricingIntelligenceEngine: "src/pages/PricingEntry.tsx",
  retentionFlywheelEngine: "src/pages/RetentionEntry.tsx",
  retentionGrowthEngine: "src/pages/RetentionEntry.tsx",
  clgEngine: "src/pages/RetentionEntry.tsx",
  healthScoreEngine: "src/pages/Dashboard.tsx",
  pulseEngine: "src/pages/CommandCenter.tsx",
  copyQAEngine: "src/pages/ContentLab.tsx",
  perplexityBurstiness: "src/pages/ContentLab.tsx",
  emotionalPerformanceEngine: "src/pages/ContentLab.tsx",
  promptOptimizerEngine: "src/pages/ContentLab.tsx",
  seoContentEngine: "src/pages/ContentLab.tsx",
  guidanceEngine: "src/pages/Wizard.tsx",
  stylomeEngine: "src/pages/ContentLab.tsx",
  visualExportEngine: "src/pages/ResultsDashboard.tsx",
  exportEngine: "src/pages/ResultsDashboard.tsx",
  trainingDataEngine: "src/pages/Dashboard.tsx",
  userKnowledgeGraph: "src/pages/Wizard.tsx",
  dataImportEngine: "src/pages/DataHub.tsx",
  integrationEngine: "src/pages/DataHub.tsx",
  brandVectorEngine: "src/pages/Differentiate.tsx",
  businessFingerprintEngine: "src/pages/Differentiate.tsx",
  differentiationEngine: "src/pages/Differentiate.tsx",
  differentiationPhases: "src/pages/Differentiate.tsx",
  crossDomainBenchmarkEngine: "src/pages/Differentiate.tsx",
};

function pickQuickWins(parameters: ParameterScore[]): QuickWin[] {
  // Promote PARTIAL first (1 step away), then PAPER (2 steps away).
  // Within each tier, sort by total backing engine count desc.
  const candidates = parameters.filter(
    (p) => p.status === "PARTIAL" || p.status === "PAPER",
  );

  candidates.sort((a, b) => {
    const tier = (s: string) => (s === "PARTIAL" ? 0 : 1);
    const ta = tier(a.status);
    const tb = tier(b.status);
    if (ta !== tb) return ta - tb;
    return b.totalConsumers - a.totalConsumers;
  });

  return candidates.slice(0, 10).map((param) => {
    const candidate = param.resolutions.find((r) => r.kind === "src-engine") ?? param.resolutions[0];
    const engineName = candidate?.name ?? "(unknown)";
    return {
      param,
      recommendedEngine: engineName,
      recommendedPage: PAGE_HINTS[engineName] ?? "src/pages/Dashboard.tsx",
    };
  });
}

// ───────────────────────────────────────────────
// Markdown rendering
// ───────────────────────────────────────────────

function renderParameterTable(parameters: ParameterScore[]): string {
  const rows: string[] = [
    "| # | Parameter | Backing Engines | Status | Consumer Count |",
    "|---|---|---|---|---|",
  ];
  for (const p of parameters) {
    const engineCol = p.resolutions
      .map((r) => `${r.name}${r.exists ? "" : " *(missing)*"}`)
      .join(", ");
    rows.push(
      `| ${p.index} | ${p.name} | ${engineCol} | ${p.status} | ${p.totalConsumers} |`,
    );
  }
  return rows.join("\n");
}

function renderPillarTable(check: ReturnType<typeof differentiationCheck>): string {
  const rows: string[] = [
    "| Pillar | Shipped | Live Engines Count |",
    "|---|---|---|",
  ];
  for (const p of check.pillars) {
    rows.push(`| ${p.pillar} | ${p.shipped ? "yes" : "no"} | ${p.liveEngineCount} |`);
  }
  return rows.join("\n");
}

// ───────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────

interface FinalNumbers {
  filesCreated: number;
  filesModified: number;
  engineCounts: { LIVE: number; ORPHAN: number; DEAD: number };
}

function loadEngineCounts(): { LIVE: number; ORPHAN: number; DEAD: number } {
  if (!fs.existsSync(ENGINE_AUDIT_PATH)) {
    throw new Error(
      `Missing ${ENGINE_AUDIT_PATH}. Run \`npx tsx scripts/audit-engines.ts\` first.`,
    );
  }
  const raw = JSON.parse(fs.readFileSync(ENGINE_AUDIT_PATH, "utf8")) as {
    counts: { LIVE: number; ORPHAN: number; DEAD: number };
  };
  return raw.counts;
}

function main(numbers: FinalNumbers): void {
  const score = scoreMarketGap();
  const diff = differentiationCheck();
  const quickWins = pickQuickWins(score.parameters);
  const verdict = pickVerdict(score.summary.shippedScore, diff.realDifferentiation);

  const paperPct = (score.summary.paperScore * 100).toFixed(1);
  const shippedPct = (score.summary.shippedScore * 100).toFixed(1);
  const partialPct = (score.summary.partialCreditScore * 100).toFixed(1);

  const deltaMarket = (Number(shippedPct) - MARKET_AVG_PCT).toFixed(1);
  const deltaTop = (Number(shippedPct) - TOP_COMPETITOR_PCT).toFixed(1);
  const realDiffPct = (diff.realDifferentiation * 100).toFixed(0);
  const claimGap = (96 - Number(realDiffPct)).toFixed(0);

  const preWireEnv = process.env.PRE_WIRING_BASELINE_PCT;
  const preWireLine = preWireEnv
    ? `Pre-wiring honest baseline: **${preWireEnv}%** — captured under the hardened metric (honest consumerCount, LIB/ENGINE thresholds) before any Phase 1+ wiring.`
    : `_Pre-wiring honest baseline not provided. Re-run with \`PRE_WIRING_BASELINE_PCT=<n>\` to record it here._`;

  const md = [
    "# Market Gap Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Repository: campaign-craft`,
    "",
    "## Honest Metric Baseline",
    "",
    preWireLine,
    `Post-wiring result: **${shippedPct}%** (${score.summary.shippedCount}/${TOTAL_PARAMETERS}).`,
    "",
    "The metric was hardened on 2026-04-10 to count a file as a consumer only when it both imports a binding and actually calls it (CallExpression or JSX). Pure re-exports are excluded. Two location-aware thresholds apply: 1 consumer for `src/lib/` + `src/services/` + edge functions, 3 consumers for `src/engine/`. An engine with `isLive: true` in its manifest requires at least one real call site in `src/pages/` or `src/components/` — enforced by `scripts/verify-runtime-calls.ts` as a gate.",
    "",
    "## Paper vs Shipped",
    "",
    renderParameterTable(score.parameters),
    "",
    "## Score Summary",
    "",
    `- Paper score: ${score.parameters.filter((p) => p.resolutions.some((r) => r.exists)).length}/${TOTAL_PARAMETERS} (${paperPct}%)`,
    `- Shipped score: ${score.summary.shippedCount}/${TOTAL_PARAMETERS} (${shippedPct}%)`,
    `- Partial credit score: ${(score.summary.shippedCount + 0.5 * score.summary.partialCount).toFixed(1)}/${TOTAL_PARAMETERS} (${partialPct}%)`,
    `- Delta vs market average (${MARKET_AVG_PCT}%): ${Number(deltaMarket) >= 0 ? "+" : ""}${deltaMarket} points`,
    `- Delta vs top competitor (${TOP_COMPETITOR_PCT}%): ${Number(deltaTop) >= 0 ? "+" : ""}${deltaTop} points`,
    "",
    "## Differentiation Pillars",
    "",
    renderPillarTable(diff),
    "",
    `Real differentiation: ${diff.pillarsShipped}/5 (${realDiffPct}%)`,
    "",
    `Prior claim: 96%`,
    "",
    `Gap between claim and reality: ${claimGap} points`,
    "",
    "## Verdict",
    "",
    `**${verdict}**`,
    "",
    verdictExplanation(verdict, score.summary.shippedScore, diff.realDifferentiation),
    "",
    "## Top 10 Quick Wins to Raise Shipped Score",
    "",
    renderQuickWins(quickWins),
    "",
  ].join("\n");

  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  fs.writeFileSync(REPORT_PATH, md);

  // Final console block
  console.log("");
  console.log("--- CAMPAIGN CRAFT AUDIT ---");
  console.log(`Files created: ${numbers.filesCreated}`);
  console.log(`Files modified: ${numbers.filesModified}`);
  console.log(
    `Engines classified: LIVE=${numbers.engineCounts.LIVE} ORPHAN=${numbers.engineCounts.ORPHAN} DEAD=${numbers.engineCounts.DEAD}`,
  );
  console.log(
    `Paper score: ${score.parameters.filter((p) => p.resolutions.some((r) => r.exists)).length}/${TOTAL_PARAMETERS} (${paperPct}%)`,
  );
  console.log(`Shipped score: ${score.summary.shippedCount}/${TOTAL_PARAMETERS} (${shippedPct}%)`);
  console.log(`Real differentiation: ${diff.pillarsShipped}/5 pillars shipped`);
  console.log(`Verdict: ${verdict}`);
  console.log(
    `Market delta: ${Number(deltaMarket) >= 0 ? "+" : ""}${deltaMarket} points vs ${MARKET_AVG_PCT}% market average`,
  );
  console.log(`Reports: reports/engine-audit.json, reports/MARKET_GAP_REPORT.md`);
  console.log("----------------------------");
}

function verdictExplanation(
  verdict: Verdict,
  shippedScore: number,
  realDifferentiation: number,
): string {
  const parts: string[] = [];
  parts.push(
    `Shipped score = ${(shippedScore * 100).toFixed(1)}%, real differentiation = ${(realDifferentiation * 100).toFixed(0)}%.`,
  );
  if (verdict === "GAP_CONFIRMED") {
    parts.push("Both shipped score and pillar coverage clear the GAP_CONFIRMED bar.");
  } else if (verdict === "GAP_NARROW") {
    parts.push(
      "Either shipped score is in the 60-72% band or real differentiation is exactly 3/5 — the gap exists but is not yet decisive.",
    );
  } else {
    parts.push(
      "Shipped score is below 60% or pillar coverage is at 2/5 or worse — the historical 96% differentiation claim is unproven by the live codebase.",
    );
  }
  return parts.join(" ");
}

function renderQuickWins(wins: QuickWin[]): string {
  if (wins.length === 0) return "_No PARTIAL/PAPER parameters left to promote._";
  const rows: string[] = [
    "| # | Parameter | Current Status | Engine to Wire | Page to Consume It |",
    "|---|---|---|---|---|",
  ];
  wins.forEach((w, i) => {
    rows.push(
      `| ${i + 1} | ${w.param.name} | ${w.param.status} | \`${w.recommendedEngine}\` | \`${w.recommendedPage}\` |`,
    );
  });
  return rows.join("\n");
}

// ───────────────────────────────────────────────
// Numbers passed in via env (set by run-audit script)
// ───────────────────────────────────────────────

const filesCreated = Number(process.env.FILES_CREATED ?? 0);
const filesModified = Number(process.env.FILES_MODIFIED ?? 0);
const engineCounts = loadEngineCounts();

main({ filesCreated, filesModified, engineCounts });
