// ═══════════════════════════════════════════════
// QA Orchestrator Agent — Sequential QA pipeline coordinator
// Runs: static → content → security analysis, then
// aggregates all findings into a unified QA score.
// ═══════════════════════════════════════════════

import type { AgentDefinition } from "../agentRunner";
import type {
  QAStaticResult,
  QAContentResult,
  QASecurityResult,
  QAOverallScore,
  QASeverity,
} from "@/types/qa";

// Score weights for overall calculation
const WEIGHTS = {
  static: 0.35,
  content: 0.40,
  security: 0.25,
} as const;

// Grade thresholds
function computeGrade(score: number): QAOverallScore["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 55) return "D";
  return "F";
}

/**
 * The orchestrator runs AFTER the three QA sub-agents have completed.
 * It reads their results from the board and computes the unified score.
 *
 * Note: The actual qaStatic and qaSecurity agents are synchronous,
 * while qaContent is async (LLM-powered). The async pipeline runner
 * handles execution order — this agent only does aggregation.
 */
export const qaOrchestratorAgent: AgentDefinition = {
  name: "qaOrchestrator",
  dependencies: ["qaStatic", "qaContent", "qaSecurity"],
  writes: ["qaOverallScore"],
  run: (board) => {
    const staticResult = board.get("qaStaticResult");
    const contentResult = board.get("qaContentResult");
    const securityResult = board.get("qaSecurityResult");

    const result = computeOverallScore(staticResult, contentResult, securityResult);
    board.set("qaOverallScore", result);
  },
};

export function computeOverallScore(
  staticResult: QAStaticResult | null,
  contentResult: QAContentResult | null,
  securityResult: QASecurityResult | null
): QAOverallScore {
  // Use actual scores or neutral defaults if agents didn't run
  const staticScore = staticResult?.score ?? 70;
  const contentScore = contentResult?.overallScore ?? 70;
  const securityScore = securityResult?.score ?? 100; // assume safe if not scanned

  // Weighted average
  const overallScore = Math.round(
    staticScore * WEIGHTS.static +
    contentScore * WEIGHTS.content +
    securityScore * WEIGHTS.security
  );

  // Aggregate findings
  const allFindings = [
    ...(staticResult?.findings || []),
    ...(contentResult?.findings || []),
    ...(securityResult?.findings || []),
  ];

  const totalFindings = allFindings.length;
  const criticalFindings = allFindings.filter((f) => f.severity === "critical").length;

  // Override: if there are critical security findings, cap at grade C
  // Note: alphabetically A < B < C, but A is better quality.
  // So "better than C" means baseGrade < "C" (i.e. "A" or "B").
  const baseGrade = computeGrade(overallScore);
  const hasCriticalSecurity = (securityResult?.findings || []).some(
    (f) => f.severity === "critical"
  );
  const grade = hasCriticalSecurity && baseGrade < "C" ? "C" : baseGrade;

  // Build recommendations based on weakest areas
  const recommendations = generateRecommendations(
    staticResult,
    contentResult,
    securityResult
  );

  // Pass threshold: overall >= 70 and no critical findings
  const passedAt = overallScore >= 70 && criticalFindings === 0
    ? new Date().toISOString()
    : null;

  return {
    staticScore,
    contentScore,
    securityScore,
    overallScore,
    grade,
    totalFindings,
    criticalFindings,
    passedAt,
    recommendations,
  };
}

// ═══════════════════════════════════════════════
// RECOMMENDATION GENERATION
// ═══════════════════════════════════════════════

function generateRecommendations(
  staticResult: QAStaticResult | null,
  contentResult: QAContentResult | null,
  securityResult: QASecurityResult | null
): { he: string; en: string }[] {
  const recs: { he: string; en: string }[] = [];

  // Static analysis recommendations
  if (staticResult) {
    if (!staticResult.budgetValid) {
      recs.push({
        he: "בדוק חלוקת תקציב — הסכום אינו מתאזן ל-100%",
        en: "Review budget allocation — total does not balance to 100%",
      });
    }
    if (!staticResult.kpisRealistic) {
      recs.push({
        he: "עדכן מדדי KPI לטווחים ריאליים",
        en: "Update KPI targets to realistic ranges",
      });
    }
    if (!staticResult.fieldsComplete) {
      recs.push({
        he: "השלם שדות חובה חסרים לפני המשך",
        en: "Complete missing required fields before proceeding",
      });
    }
  }

  // Content quality recommendations
  if (contentResult) {
    if (contentResult.culturalScore < 70) {
      recs.push({
        he: "שפר התאמה תרבותית — התוכן אינו מתאים מספיק לשוק הישראלי",
        en: "Improve cultural fit — content doesn't match Israeli market well enough",
      });
    }
    if (contentResult.hebrewQuality < 70) {
      recs.push({
        he: "שפר איכות עברית — בדוק דקדוק וניסוח",
        en: "Improve Hebrew quality — check grammar and phrasing",
      });
    }
    if (contentResult.ctaClarity < 70) {
      recs.push({
        he: "חזק קריאות לפעולה — הן לא מספיק ברורות",
        en: "Strengthen calls to action — they are not clear enough",
      });
    }
  }

  // Security recommendations
  if (securityResult) {
    if (securityResult.piiDetected) {
      recs.push({
        he: "הסר מידע אישי מזוהה מהתוכן שנוצר — חובה לפני הפצה",
        en: "Remove detected PII from generated content — required before distribution",
      });
    }
    if (securityResult.injectionRisks > 0) {
      recs.push({
        he: "הסר תבניות קוד לא בטוחות מהתוכן",
        en: "Remove unsafe code patterns from content",
      });
    }
    if (securityResult.unsafeTemplates > 0) {
      recs.push({
        he: "עדכן תבניות הודעה כדי לעמוד בדרישות WhatsApp/email",
        en: "Update message templates to comply with WhatsApp/email requirements",
      });
    }
  }

  return recs;
}
