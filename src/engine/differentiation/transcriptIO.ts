// ═══════════════════════════════════════════════
// Transcript I/O
//
// - Read .txt / .md / .docx files to plain text (browser).
// - Render a DifferentiationResult + scan to Obsidian-style markdown.
// - Trigger downloads via exportEngine.downloadExport().
// ═══════════════════════════════════════════════

import { downloadExport } from "@/engine/exportEngine";
import { PRINCIPLES, type PrincipleAgentOutput, type ConvergenceReport } from "./principles";
import { STAGES, type StageDetectionReport } from "./conversationStages";

// ───────────────────────────────────────────────
// File reading
// ───────────────────────────────────────────────

export type SupportedFileKind = "txt" | "md" | "docx";

export function detectFileKind(file: File): SupportedFileKind | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".md")) return "md";
  if (name.endsWith(".txt") || file.type.startsWith("text/")) return "txt";
  return null;
}

/**
 * Extract plain text from a browser File.
 * Supports .txt, .md (read as text) and .docx (via mammoth).
 * Throws with a user-facing message on failure.
 */
export async function readFileAsText(file: File): Promise<string> {
  const kind = detectFileKind(file);
  if (!kind) {
    throw new Error(`Unsupported file type: ${file.name}. Use .txt, .md, or .docx.`);
  }

  if (kind === "docx") {
    // Dynamic import so the ~500KB mammoth bundle isn't in the main chunk.
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || "";
  }

  return await file.text();
}

// ───────────────────────────────────────────────
// Obsidian-style markdown export
// ───────────────────────────────────────────────

export interface TranscriptExportInput {
  clientName: string;
  industry?: string;
  differentiationStatus?: string;
  transcript: string;
  stageReport: StageDetectionReport;
  principleOutputs: PrincipleAgentOutput[];
  convergence: ConvergenceReport;
  /** 3 phrasings chosen in step 5. Optional — may be skipped. */
  differentiationDraft?: {
    oneSentence: string;
    paragraph: string;
    marketCheck: string;
  };
  createdAt?: string;
}

function slugify(s: string): string {
  return s
    .trim()
    .replace(/[\s/\\:*?"<>|]+/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "Client";
}

/**
 * Render the full session as an Obsidian-ready markdown document.
 * Target path (for the user to drop into their vault):
 *   Obsidian Clients/[name]/Differentiation.md
 */
export function renderDifferentiationMarkdown(input: TranscriptExportInput): string {
  const createdAt = input.createdAt || new Date().toISOString();
  const lines: string[] = [];

  lines.push("---");
  lines.push(`client: "${input.clientName}"`);
  if (input.industry) lines.push(`industry: "${input.industry}"`);
  if (input.differentiationStatus) lines.push(`status: "${input.differentiationStatus}"`);
  lines.push(`created: ${createdAt}`);
  lines.push(`convergence: ${input.convergence.convergence}`);
  lines.push("tags: [differentiation, client]");
  lines.push("---");
  lines.push("");
  lines.push(`# Differentiation — ${input.clientName}`);
  lines.push("");

  // Convergence summary
  lines.push("## Convergence Summary");
  lines.push("");
  lines.push(`- **Signal strength:** ${input.convergence.convergence.toUpperCase()}`);
  lines.push(`- **Strong principles (score ≥ 8):** ${input.convergence.strongSignals.length}`);
  lines.push(`- **Weak principles (6–7.9):** ${input.convergence.weakSignals.length}`);
  lines.push(`- **Core principles:** ${input.convergence.corePrinciples.join(", ") || "(none)"}`);
  lines.push("");

  // Differentiation draft
  if (input.differentiationDraft) {
    lines.push("## Differentiation Draft");
    lines.push("");
    lines.push("**One sentence:**");
    lines.push(`> ${input.differentiationDraft.oneSentence}`);
    lines.push("");
    lines.push("**Paragraph:**");
    lines.push(input.differentiationDraft.paragraph);
    lines.push("");
    lines.push("**Market check:**");
    lines.push(input.differentiationDraft.marketCheck);
    lines.push("");
  }

  // Principle scan table
  lines.push("## Principle Scan (P1–P12)");
  lines.push("");
  lines.push("| # | Principle | Score | Observation |");
  lines.push("|---|-----------|------:|-------------|");
  for (const p of PRINCIPLES) {
    const out = input.principleOutputs.find((o) => o.principleCode === p.code);
    const score = out ? out.relevanceScore.toFixed(1) : "–";
    const obs = out?.summaryObservation?.replace(/\|/g, "\\|") || "";
    lines.push(`| ${p.code} | ${p.name.en} | ${score} | ${obs} |`);
  }
  lines.push("");

  // Per-principle evidence
  lines.push("## Evidence by Principle");
  lines.push("");
  const sorted = [...input.principleOutputs].sort((a, b) => b.relevanceScore - a.relevanceScore);
  for (const out of sorted) {
    if (out.failed) continue;
    const def = PRINCIPLES.find((p) => p.code === out.principleCode);
    lines.push(`### ${out.principleCode} — ${def?.name.en ?? out.principleName} (score ${out.relevanceScore.toFixed(1)})`);
    lines.push("");
    if (out.evidenceQuotes.length > 0) {
      for (const q of out.evidenceQuotes) {
        lines.push(`> ${q.replace(/\n/g, " ")}`);
      }
      lines.push("");
    }
    if (out.differentiationHypothesis) {
      lines.push(`**Hypothesis:** ${out.differentiationHypothesis}`);
      lines.push("");
    }
  }

  // Conversation stages coverage
  lines.push("## Conversation Stage Coverage");
  lines.push("");
  lines.push(`Coverage: **${Math.round(input.stageReport.coverage * 100)}%** (${input.stageReport.detectedStages.filter((d) => d.detected).length}/${STAGES.length})`);
  lines.push("");
  for (const stage of STAGES) {
    const d = input.stageReport.detectedStages.find((s) => s.stageId === stage.id);
    const mark = d?.detected ? "[x]" : "[ ]";
    lines.push(`- ${mark} **${stage.number}. ${stage.name.en}** — ${stage.description.en}`);
  }
  if (input.stageReport.criticalMissing.length > 0) {
    lines.push("");
    lines.push(`> ⚠ Critical stages missing: ${input.stageReport.criticalMissing.join(", ")}`);
  }
  lines.push("");

  lines.push("---");
  lines.push("*Generated by FunnelForge Differentiation Transcript Scan.*");
  lines.push("");

  return lines.join("\n");
}

/**
 * Render the Plan.md Stage-1 stub that gets dropped alongside the
 * Differentiation.md in the Obsidian vault.
 */
export function renderPlanStage1Markdown(input: TranscriptExportInput): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`client: "${input.clientName}"`);
  lines.push("stage: 1");
  lines.push("source: differentiation-transcript-scan");
  lines.push("---");
  lines.push("");
  lines.push(`# Plan — Stage 1 — ${input.clientName}`);
  lines.push("");
  lines.push("## Core principles surfaced");
  if (input.convergence.corePrinciples.length === 0) {
    lines.push("- (weak signal — rerun after more evidence)");
  } else {
    for (const code of input.convergence.corePrinciples) {
      const def = PRINCIPLES.find((p) => p.code === code);
      lines.push(`- **${code}** — ${def?.name.en ?? code}`);
    }
  }
  lines.push("");
  if (input.differentiationDraft) {
    lines.push("## Working differentiation");
    lines.push(`> ${input.differentiationDraft.oneSentence}`);
    lines.push("");
  }
  lines.push("## Next steps");
  lines.push("- [ ] Validate core principles with the client");
  lines.push("- [ ] Draft Stage-2 plan (marketing / sales implications)");
  lines.push("");
  return lines.join("\n");
}

// ───────────────────────────────────────────────
// Download helpers
// ───────────────────────────────────────────────

function markdownToArrayBuffer(md: string): ArrayBuffer {
  return new TextEncoder().encode(md).buffer as ArrayBuffer;
}

export function downloadDifferentiationMarkdown(input: TranscriptExportInput): void {
  const md = renderDifferentiationMarkdown(input);
  downloadExport({
    data: markdownToArrayBuffer(md),
    filename: `${slugify(input.clientName)}-Differentiation.md`,
    mimeType: "text/markdown;charset=utf-8",
  });
}

export function downloadPlanStage1Markdown(input: TranscriptExportInput): void {
  const md = renderPlanStage1Markdown(input);
  downloadExport({
    data: markdownToArrayBuffer(md),
    filename: `${slugify(input.clientName)}-Plan-Stage1.md`,
    mimeType: "text/markdown;charset=utf-8",
  });
}

export const _internal = { slugify };
