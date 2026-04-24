// ═══════════════════════════════════════════════
// Differentiation Wizard — Form Rules & Validation
// ═══════════════════════════════════════════════

import { PhaseId, DifferentiationFormData, detectMarketMode } from "@/types/differentiation";

export function canProceedPhase(phaseId: PhaseId, formData: DifferentiationFormData): boolean {
  // Resolve market mode defensively — some legacy callers pass partial
  // formData without targetMarket (e.g. synthesis step in older tests).
  const mode = formData.targetMarket
    ? detectMarketMode(formData.targetMarket)
    : "b2b";
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
    case "contradiction": {
      // B2C users fill negativeReviewTheme; B2B fills lostDealReason.
      // Hybrid accepts either. getQuestionsForPhase swaps the field.
      const lossFieldFilled =
        mode === "b2c"
          ? formData.negativeReviewTheme.trim().length > 0
          : mode === "b2b"
            ? formData.lostDealReason.trim().length > 0
            : formData.lostDealReason.trim().length > 0 ||
              formData.negativeReviewTheme.trim().length > 0;
      return (
        formData.customerQuote.trim().length > 0 &&
        lossFieldFilled &&
        formData.competitorOverlap.trim().length > 0
      );
    }
    case "hidden":
      return (
        formData.hiddenValues.length >= 4 &&
        formData.ashamedPains.length >= 2
      );
    case "mapping": {
      // B2C uses influenceNetwork + decisionSpeed.
      // B2B uses buyingCommitteeMap + decisionLatency.
      // Hybrid accepts either pairing.
      const audienceMapFilled =
        mode === "b2c"
          ? (formData.influenceNetwork?.length ?? 0) >= 2
          : mode === "b2b"
            ? (formData.buyingCommitteeMap?.length ?? 0) >= 2
            : (formData.buyingCommitteeMap?.length ?? 0) >= 2 ||
              (formData.influenceNetwork?.length ?? 0) >= 2;
      const timingFilled =
        mode === "b2c"
          ? !!formData.decisionSpeed
          : mode === "b2b"
            ? !!formData.decisionLatency
            : !!formData.decisionLatency || !!formData.decisionSpeed;
      return (
        formData.competitorArchetypes.length >= 1 &&
        audienceMapFilled &&
        timingFilled
      );
    }
    case "synthesis":
      return true; // AI-generated, always can proceed
    default:
      return false;
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
