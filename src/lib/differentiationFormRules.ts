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
        formData.buyingCommitteeMap.length >= 2 &&
        !!formData.decisionLatency
      );
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
