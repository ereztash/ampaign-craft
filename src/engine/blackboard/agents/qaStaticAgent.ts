// ═══════════════════════════════════════════════
// QA Static Analysis Agent — Heuristic-based plan validation
// Checks: budget math, KPI realism, field completeness,
// internal contradictions. No LLM needed.
// ═══════════════════════════════════════════════

import type { AgentDefinition } from "../agentRunner";
import type { QAStaticResult, QAFinding, QASeverity } from "@/types/qa";
import type { FunnelResult, FormData } from "@/types/funnel";

export const qaStaticAgent: AgentDefinition = {
  name: "qaStatic",
  dependencies: ["funnel"],
  writes: ["qaStaticResult"],
  run: (board) => {
    const formData = board.get("formData");
    const funnelResult = board.get("funnelResult");
    if (!formData || !funnelResult) return;

    const result = runStaticAnalysis(formData, funnelResult);
    board.set("qaStaticResult", result);
  },
};

export function runStaticAnalysis(formData: FormData, funnelResult: FunnelResult): QAStaticResult {
  const findings: QAFinding[] = [];
  let findingId = 0;

  const addFinding = (
    category: QAFinding["category"],
    severity: QASeverity,
    messageHe: string,
    messageEn: string,
    location?: string,
    suggestionHe?: string,
    suggestionEn?: string,
    autoFixable = false
  ) => {
    findings.push({
      id: `static-${++findingId}`,
      category,
      severity,
      message: { he: messageHe, en: messageEn },
      location,
      suggestion: suggestionHe ? { he: suggestionHe, en: suggestionEn || "" } : undefined,
      autoFixable,
    });
  };

  // ── Budget Validation ──
  const budgetValid = validateBudget(funnelResult, formData, addFinding);

  // ── KPI Realism ──
  const kpisRealistic = validateKPIs(funnelResult, formData, addFinding);

  // ── Field Completeness ──
  const fieldsComplete = validateCompleteness(formData, addFinding);

  // ── Internal Consistency ──
  validateConsistency(formData, funnelResult, addFinding);

  // Calculate score: start at 100, deduct per finding
  const deductions = findings.reduce((sum, f) => {
    if (f.severity === "critical") return sum + 15;
    if (f.severity === "warning") return sum + 5;
    return sum + 1;
  }, 0);
  const score = Math.max(0, 100 - deductions);

  return { findings, budgetValid, kpisRealistic, fieldsComplete, score };
}

// ═══════════════════════════════════════════════
// BUDGET VALIDATION
// ═══════════════════════════════════════════════

function validateBudget(
  result: FunnelResult,
  formData: FormData,
  addFinding: (...args: any[]) => void
): boolean {
  let valid = true;

  // Check that stage budget percentages sum to ~100%
  const totalPercent = result.stages.reduce((sum, s) => sum + (s.budgetPercent || 0), 0);
  if (totalPercent > 0 && Math.abs(totalPercent - 100) > 5) {
    addFinding(
      "budget", "warning",
      `סה"כ חלוקת תקציב: ${totalPercent}% (צריך להיות 100%)`,
      `Budget allocation total: ${totalPercent}% (should be 100%)`,
      "stages.budgetPercent"
    );
    valid = false;
  }

  // Check for zero-budget stages
  for (let i = 0; i < result.stages.length; i++) {
    const stage = result.stages[i];
    if (stage.budgetPercent === 0 && stage.channels && stage.channels.length > 0) {
      addFinding(
        "budget", "warning",
        `שלב "${stage.name?.he || stage.name?.en}" מכיל ערוצים אבל תקציב 0%`,
        `Stage "${stage.name?.en || stage.name?.he}" has channels but 0% budget`,
        `stages[${i}]`
      );
    }
  }

  // Check total budget against business size
  const budget = result.totalBudget;
  if (budget && formData.averagePrice) {
    const monthlyRevenue = formData.averagePrice * 10; // rough estimate
    if (budget > monthlyRevenue * 3) {
      addFinding(
        "budget", "warning",
        "תקציב השיווק המוצע גבוה מאוד ביחס למחיר המוצר",
        "Proposed marketing budget is very high relative to product price",
        "totalBudget",
        "שקול להקטין תקציב או להעלות מחיר",
        "Consider reducing budget or raising price"
      );
    }
  }

  return valid;
}

// ═══════════════════════════════════════════════
// KPI VALIDATION
// ═══════════════════════════════════════════════

function validateKPIs(
  result: FunnelResult,
  formData: FormData,
  addFinding: (...args: any[]) => void
): boolean {
  let realistic = true;

  // Check if conversion rates are unrealistically high
  for (let i = 0; i < result.stages.length; i++) {
    const stage = result.stages[i];
    for (const channel of (stage.channels || [])) {
      if (channel.kpis) {
        // Check CTR if present
        const ctr = channel.kpis.find((k: any) =>
          k.name?.toLowerCase?.()?.includes("ctr") || k.label?.toLowerCase?.()?.includes("ctr")
        );
        if (ctr) {
          const ctrValue = parseFloat(String(ctr.value || ctr.target || 0));
          if (ctrValue > 15) {
            addFinding(
              "kpi", "warning",
              `CTR של ${ctrValue}% לא ריאלי (ממוצע: 1-5%)`,
              `CTR of ${ctrValue}% is unrealistic (average: 1-5%)`,
              `stages[${i}].channels`,
              "צפה ל-1-5% CTR ברוב הערוצים",
              "Expect 1-5% CTR for most channels"
            );
            realistic = false;
          }
        }
      }
    }
  }

  return realistic;
}

// ═══════════════════════════════════════════════
// COMPLETENESS VALIDATION
// ═══════════════════════════════════════════════

function validateCompleteness(
  formData: FormData,
  addFinding: (...args: any[]) => void
): boolean {
  let complete = true;

  const requiredFields: { field: keyof FormData; nameHe: string; nameEn: string }[] = [
    { field: "businessField", nameHe: "תחום עסקי", nameEn: "Business field" },
    { field: "audienceType", nameHe: "סוג קהל", nameEn: "Audience type" },
    { field: "mainGoal", nameHe: "מטרה עיקרית", nameEn: "Main goal" },
    { field: "budgetRange", nameHe: "טווח תקציב", nameEn: "Budget range" },
  ];

  for (const { field, nameHe, nameEn } of requiredFields) {
    const value = formData[field];
    if (!value || (typeof value === "string" && value.trim() === "")) {
      addFinding(
        "completeness", "critical",
        `שדה חובה חסר: ${nameHe}`,
        `Required field missing: ${nameEn}`,
        `formData.${field}`,
        `מלא את ${nameHe} לפני שממשיכים`,
        `Fill in ${nameEn} before proceeding`,
        false
      );
      complete = false;
    }
  }

  // Warn on empty product description
  if (!formData.productDescription || formData.productDescription.trim().length < 10) {
    addFinding(
      "completeness", "warning",
      "תיאור מוצר קצר מדי — ההמלצות יהיו גנריות",
      "Product description too short — recommendations will be generic",
      "formData.productDescription",
      "הוסף תיאור של 2-3 משפטים",
      "Add a 2-3 sentence description"
    );
  }

  return complete;
}

// ═══════════════════════════════════════════════
// CONSISTENCY VALIDATION
// ═══════════════════════════════════════════════

function validateConsistency(
  formData: FormData,
  result: FunnelResult,
  addFinding: (...args: any[]) => void
): void {
  // B2B with consumer channels
  if (formData.audienceType === "b2b") {
    const consumerChannels = (formData.existingChannels || []).filter((ch: string) =>
      ["tiktok", "snapchat"].includes(ch.toLowerCase())
    );
    if (consumerChannels.length > 0) {
      addFinding(
        "consistency", "info",
        `ערוצי B2C (${consumerChannels.join(", ")}) נבחרו עבור עסק B2B — בדוק שזה מכוון`,
        `B2C channels (${consumerChannels.join(", ")}) selected for B2B business — verify this is intentional`,
        "formData.existingChannels"
      );
    }
  }

  // High budget + beginner experience level
  if (formData.budgetRange === "high" && formData.experienceLevel === "beginner") {
    addFinding(
      "consistency", "warning",
      "תקציב גבוה עם רמת ניסיון מתחיל — שקול ליווי מקצועי",
      "High budget with beginner experience — consider professional guidance",
      "formData",
      "התחל עם תקציב קטן וגדל בהדרגה",
      "Start small and scale gradually"
    );
  }

  // Subscription model without retention focus
  if (formData.salesModel === "subscription" && formData.mainGoal !== "loyalty") {
    addFinding(
      "consistency", "info",
      "מודל מנוי ללא פוקוס על שימור — חשוב לשים לב ל-churn",
      "Subscription model without retention focus — watch churn rates",
      "formData.mainGoal"
    );
  }
}
