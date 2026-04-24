// ═══════════════════════════════════════════════
// Differentiation Wizard — Form Rules & Validation
// ═══════════════════════════════════════════════

import { PhaseId, DifferentiationFormData } from "@/types/differentiation";

export function canProceedPhase(phaseId: PhaseId, formData: DifferentiationFormData): boolean {
  switch (phaseId) {
    case "surface":
      return (
        formData.businessName.trim().length > 0 &&
        formData.industry.trim().length > 0 &&
        !!formData.targetMarket &&
        !!formData.companySize &&
        formData.currentPositioning.trim().length > 10 &&
        formData.topCompetitors.filter((c) => c.trim().length > 0).length >= 1 &&
        !!formData.priceRange
      );
    case "contradiction":
      return (
        formData.customerQuote.trim().length > 0 &&
        formData.lostDealReason.trim().length > 0 &&
        formData.competitorOverlap.trim().length > 0
      );
    case "hidden":
      return (
        formData.hiddenValues.length >= 4 &&
        formData.ashamedPains.length >= 2
      );
    case "mapping":
      return (
        formData.competitorArchetypes.length >= 1 &&
        (formData.buyingCommitteeMap?.length ?? 0) >= 2 &&
        !!formData.decisionLatency
      );
    case "synthesis":
      return true; // AI-generated, always can proceed
    default:
      return false;
  }
}

/**
 * Returns a single-line, bilingual description of what the user still has
 * to do on this phase before `canProceedPhase` flips true. Returns null
 * when the phase is complete. The wizard surfaces this next to the Next /
 * Analyze button so a disabled state is never mysterious.
 *
 * Keep the field list here in sync with canProceedPhase — both describe
 * the same B2B-shaped questions the wizard actually renders today.
 */
export function describeBlockingField(
  phaseId: PhaseId,
  formData: DifferentiationFormData,
): { he: string; en: string } | null {
  switch (phaseId) {
    case "surface":
      if (formData.businessName.trim().length === 0)
        return { he: "מלא/י שם עסק", en: "Fill in the business name" };
      if (formData.industry.trim().length === 0)
        return { he: "בחר/י תעשייה", en: "Pick an industry" };
      if (!formData.targetMarket)
        return { he: "בחר/י שוק יעד", en: "Pick a target market" };
      if (!formData.companySize)
        return { he: "בחר/י גודל חברה", en: "Pick company size" };
      if (formData.currentPositioning.trim().length <= 10)
        return {
          he: "כתוב/י לפחות 10 תווים על המיצוב הנוכחי",
          en: "Describe the current positioning (at least 10 characters)",
        };
      if (formData.topCompetitors.filter((c) => c.trim().length > 0).length < 1)
        return { he: "הוסף/י מתחרה אחד לפחות", en: "Add at least one competitor" };
      if (!formData.priceRange)
        return { he: "בחר/י טווח מחירים", en: "Pick a price range" };
      return null;
    case "contradiction":
      if (formData.customerQuote.trim().length === 0)
        return { he: "הוסף/י ציטוט לקוח", en: "Add a customer quote" };
      if (formData.lostDealReason.trim().length === 0)
        return {
          he: "תאר/י למה הפסדת את הדיל האחרון",
          en: "Describe why the last deal was lost",
        };
      if (formData.competitorOverlap.trim().length === 0)
        return {
          he: "תאר/י איפה המתחרים נשמעים כמוך",
          en: "Describe where competitors sound like you",
        };
      return null;
    case "hidden":
      if (formData.hiddenValues.length < 4)
        return {
          he: "דרג/י לפחות 4 ערכים נסתרים",
          en: "Rate at least 4 hidden values",
        };
      if (formData.ashamedPains.length < 2)
        return {
          he: "תאר/י לפחות 2 כאבים נסתרים",
          en: "Describe at least 2 hidden pains",
        };
      return null;
    case "mapping":
      if (formData.competitorArchetypes.length < 1)
        return {
          he: "סווג/י לפחות מתחרה אחד",
          en: "Classify at least one competitor",
        };
      if ((formData.buyingCommitteeMap?.length ?? 0) < 2)
        return {
          he: "בחר/י לפחות 2 תפקידים בוועדת הקנייה",
          en: "Pick at least 2 roles on the buying committee",
        };
      if (!formData.decisionLatency)
        return { he: "בחר/י משך החלטה", en: "Pick a decision latency" };
      return null;
    case "synthesis":
    default:
      return null;
  }
}

export function isPhaseComplete(phaseId: PhaseId, formData: DifferentiationFormData): boolean {
  return canProceedPhase(phaseId, formData);
}

const PHASE_COLORS: Record<number, string> = {
  1: "#3B82F6", // Blue
  2: "#F59E0B", // Amber
  3: "#8B5CF6", // Purple
  4: "#10B981", // Emerald
  5: "#B87333", // Copper
};

export function getPhaseColor(phaseNumber: number): string {
  return PHASE_COLORS[phaseNumber] || "#6B7280";
}
