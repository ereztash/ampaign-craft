// ═══════════════════════════════════════════════
// AI Copy Generation Service
// Uses Claude API via Supabase Edge Function to generate
// personalized marketing copy with full context
// ═══════════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";
import { authFetch } from "@/lib/authFetch";
import { LlmError } from "@/lib/llmErrorMessages";
import { selectModel, trackUsage, isOverMonthlyBudget, getMonthlyUsage, getMonthlyCap, wouldExceedCostCap, type CopyTask, type ModelSelection, type PricingTier } from "./llmRouter";
import type { FunnelResult, FormData } from "@/types/funnel";
import { analyzeAIDetection } from "@/engine/perplexityBurstiness";
import { buildCohortPromptSection, type CohortPriors } from "./cohortBenchmarks";
import type { RegimeState } from "@/engine/optimization/regimeDetector";
import { getActivePromptPatches, buildPatchPromptSection } from "@/engine/promptOptimizerLoop";
import { getStoredStylomePrompt } from "@/hooks/useStylomeProfile";

export const ENGINE_MANIFEST = {
  name: "aiCopyService",
  reads: ["USER-copy-*", "USER-form-*"],
  writes: ["USER-copy-*"],
  stage: "design",
  isLive: true,
  parameters: ["LLM copy generation"],
} as const;

export interface CopyGenerationRequest {
  task: CopyTask;
  prompt: string;
  funnelResult?: FunnelResult;
  formData?: FormData;
  stylomePrompt?: string;
  qualityPriority?: "speed" | "balanced" | "quality";
  language?: "he" | "en";
  /** Optional cohort priors — when provided, top-converting patterns are injected into the prompt. */
  cohortPriors?: CohortPriors | null;
  /** Optional user regime — "crisis" escalates model tier one step. */
  regime?: RegimeState;
}

export interface CopyGenerationResult {
  text: string;
  model: string;
  humanScore: number;
  humanVerdict: string;
  suggestions: { he: string; en: string }[];
  modelSelection: ModelSelection;
}

/**
 * Build the system prompt from all available context.
 */
function buildSystemPrompt(request: CopyGenerationRequest): string {
  const parts: string[] = [];
  const lang = request.language || "he";

  if (lang === "he") {
    parts.push("אתה קופירייטר ישראלי מומחה. כתוב בעברית טבעית, לא תרגום מאנגלית.");
    parts.push("השתמש בשפה ישירה, דוגרית, עם אנרגיה — כמו שישראלי אמיתי מדבר.");
  } else {
    parts.push("You are an expert copywriter. Write naturally engaging marketing copy.");
  }

  // Stylome context (voice cloning)
  if (request.stylomePrompt) {
    parts.push("");
    parts.push("=== VOICE PROFILE ===");
    parts.push(request.stylomePrompt);
    parts.push("Match this writing style precisely.");
  }

  // Funnel context
  if (request.funnelResult) {
    parts.push("");
    parts.push("=== FUNNEL CONTEXT ===");
    parts.push(`Funnel: ${request.funnelResult.funnelName[lang === "he" ? "he" : "en"]}`);
    if (request.funnelResult.hormoziValue) {
      const hv = request.funnelResult.hormoziValue;
      parts.push(`Value Equation Score: ${hv.overallScore}/100 (${hv.offerGrade})`);
      parts.push(`Priority: ${hv.optimizationPriority[lang === "he" ? "he" : "en"]}`);
    }
  }

  // FormData context
  const fd = request.formData || request.funnelResult?.formData;
  if (fd) {
    parts.push("");
    parts.push("=== BUSINESS CONTEXT ===");
    if (fd.businessField) parts.push(`Industry: ${fd.businessField}`);
    if (fd.productDescription) parts.push(`Product: ${fd.productDescription}`);
    if (fd.averagePrice) parts.push(`Price: ₪${fd.averagePrice}`);
    if (fd.audienceType) parts.push(`Audience: ${fd.audienceType}`);
    if (fd.mainGoal) parts.push(`Goal: ${fd.mainGoal}`);
  }

  // Cohort priors (MOAT flywheel): inject anonymized pick-rate patterns
  // for users in the same archetype cohort. Empty string when below threshold.
  const cohortSection = buildCohortPromptSection(request.cohortPriors ?? null, lang);
  if (cohortSection) {
    parts.push("");
    parts.push(cohortSection);
  }

  // Self-healing prompt patches (Phi_META loop): pull cached patches
  // generated from negative feedback on training_pairs. Zero latency —
  // reads from safeStorage, never blocks.
  const patches = getActivePromptPatches("aiCopyService");
  const patchSection = buildPatchPromptSection(patches, lang);
  if (patchSection) {
    parts.push("");
    parts.push(patchSection);
  }

  // Task-specific instructions
  parts.push("");
  parts.push("=== TASK ===");
  const taskInstructions: Record<string, string> = {
    "ad-copy": lang === "he"
      ? "כתוב מודעה ממומנת. כותרת חדה, 2-3 שורות גוף, CTA ברור. השתמש ב-Hook מבוסס Loss Aversion."
      : "Write a paid ad. Sharp headline, 2-3 body lines, clear CTA. Use a Loss Aversion-based hook.",
    "email-sequence": lang === "he"
      ? "כתוב רצף של 3 אימיילים: (1) ערך חינמי (2) Social Proof (3) CTA + דחיפות"
      : "Write a 3-email sequence: (1) Free value (2) Social Proof (3) CTA + urgency",
    "landing-page": lang === "he"
      ? "כתוב תוכן לעמוד נחיתה: Hero section + Benefits + Social Proof + CTA. השתמש בנוסחת AIDA."
      : "Write landing page content: Hero section + Benefits + Social Proof + CTA. Use AIDA formula.",
    "whatsapp-message": lang === "he"
      ? "כתוב הודעת וואטסאפ קצרה (עד 160 מילים). ישירה, אישית, CTA ברור."
      : "Write a short WhatsApp message (up to 160 words). Direct, personal, clear CTA.",
    "social-post": lang === "he"
      ? "כתוב פוסט לרשת חברתית. Hook חזק בשורה ראשונה, ערך, CTA."
      : "Write a social media post. Strong hook in first line, value, CTA.",
    "headline": lang === "he"
      ? "כתוב 5 כותרות חלופיות. השתמש ב-Curiosity Gap, מספרים ספציפיים, ו-Power Words."
      : "Write 5 alternative headlines. Use Curiosity Gap, specific numbers, and Power Words.",
    "deep-analysis": lang === "he"
      ? "נתח לעומק את האסטרטגיה השיווקית והצע שיפורים מבוססי מדע התנהגותי."
      : "Deeply analyze the marketing strategy and suggest behavioral science-based improvements.",
    "strategy": lang === "he"
      ? "בנה אסטרטגיה שיווקית מפורטת עם תוכנית פעולה ל-90 יום."
      : "Build a detailed marketing strategy with a 90-day action plan.",
  };
  parts.push(taskInstructions[request.task] || "");

  return parts.join("\n");
}

/**
 * Generate marketing copy using Claude via Supabase Edge Function.
 */
export async function generateCopy(
  request: CopyGenerationRequest,
  pricingTier?: PricingTier,
): Promise<CopyGenerationResult> {
  // Pre-generation budget check
  if (pricingTier && isOverMonthlyBudget(pricingTier)) {
    const usage = getMonthlyUsage();
    const cap = getMonthlyCap(pricingTier);
    throw new Error(
      `Monthly AI budget reached (₪${usage.totalCostNIS.toFixed(2)} / ₪${cap}). Upgrade your plan for more AI-powered content.`,
    );
  }

  // Auto-inject the persisted stylome profile when the caller didn't supply one.
  // This makes voice cloning the default behavior once the user has analyzed
  // their writing samples — no per-call wiring required.
  const enrichedRequest: CopyGenerationRequest = {
    ...request,
    stylomePrompt: request.stylomePrompt ?? getStoredStylomePrompt(),
  };

  const modelSelection = selectModel({
    task: enrichedRequest.task,
    textLength: enrichedRequest.task === "landing-page" || enrichedRequest.task === "email-sequence" ? "long" : "medium",
    qualityPriority: enrichedRequest.qualityPriority || "balanced",
    regime: enrichedRequest.regime,
  }, pricingTier);

  const systemPrompt = buildSystemPrompt(enrichedRequest);

  const _resp = await authFetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
      prompt: enrichedRequest.prompt,
      systemPrompt,
      model: modelSelection.model,
      maxTokens: modelSelection.maxTokens,
    }),
      });
  const data = await _resp.json();

  if (!_resp.ok) {
    throw new LlmError(
      {
        error: data?.error || _resp.statusText || "AI copy generation failed",
        code: data?.code,
        hint: data?.hint,
      },
      _resp.status,
    );
  }

  const text = data?.text || "";
  const tokensUsed = data?.tokensUsed || 0;

  // Post-processing: check if generated text passes P&B analysis
  const aiDetection = analyzeAIDetection(text);

  // Track usage
  trackUsage({
    task: request.task,
    model: modelSelection.model,
    tokensUsed,
    costNIS: (tokensUsed / 1000) * (modelSelection.tier === "fast" ? 0.003 : modelSelection.tier === "standard" ? 0.015 : 0.075) * 3.6,
    timestamp: new Date().toISOString(),
  });

  return {
    text,
    model: modelSelection.model,
    humanScore: aiDetection.humanScore,
    humanVerdict: aiDetection.verdict,
    suggestions: aiDetection.tips,
    modelSelection,
  };
}
