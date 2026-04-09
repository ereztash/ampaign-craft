// ═══════════════════════════════════════════════
// QA System Type Definitions
// Multi-agent quality assurance for generated plans
// ═��═════════════════════════════════════════════

// ═══════════════════════════════════════════════
// SEVERITY & FINDING TYPES
// ═══════════════════════════════════════════════

export type QASeverity = "critical" | "warning" | "info";

export type QACategory =
  | "consistency"     // Internal contradictions
  | "completeness"    // Missing required fields
  | "accuracy"        // Unrealistic numbers or claims
  | "cultural"        // Israeli market / Hebrew issues
  | "brand"           // Brand consistency
  | "cta"             // CTA clarity and effectiveness
  | "security"        // PII leaks, injection risks
  | "template"        // Unsafe template patterns
  | "budget"          // Budget math errors
  | "kpi";            // Unrealistic KPIs

export interface QAFinding {
  id: string;
  category: QACategory;
  severity: QASeverity;
  message: { he: string; en: string };
  location?: string;       // e.g. "stage[2].channels" or "hooks[0]"
  suggestion?: { he: string; en: string };
  autoFixable: boolean;
}

// ═══════════════════════════════════════════════
// STATIC ANALYSIS RESULT
// ═══════════════════════════════════════════════

export interface QAStaticResult {
  findings: QAFinding[];
  budgetValid: boolean;
  kpisRealistic: boolean;
  fieldsComplete: boolean;
  score: number; // 0-100
}

// ═══════════════════════════════════════════════
// CONTENT QUALITY RESULT (LLM-powered)
// ═══════════════════════════════════════════════

export interface QAContentResult {
  findings: QAFinding[];
  culturalScore: number;     // 0-100, Israeli market fit
  brandConsistency: number;  // 0-100
  ctaClarity: number;        // 0-100
  hebrewQuality: number;     // 0-100
  overallScore: number;      // 0-100
}

// ═══════════════════════════════════════════════
// SECURITY AUDIT RESULT
// ═══════════════════════════════════════════════

export interface QASecurityResult {
  findings: QAFinding[];
  piiDetected: boolean;
  injectionRisks: number;
  unsafeTemplates: number;
  score: number; // 0-100 (100 = fully safe)
}

// ═══════════════════════════════════════════════
// OVERALL QA SCORE
// ═══════════════════════════════════════════════

export interface QAOverallScore {
  staticScore: number;
  contentScore: number;
  securityScore: number;
  overallScore: number;       // weighted average
  grade: "A" | "B" | "C" | "D" | "F";
  totalFindings: number;
  criticalFindings: number;
  passedAt: string | null;    // ISO timestamp if score >= 70
  recommendations: { he: string; en: string }[];
}
