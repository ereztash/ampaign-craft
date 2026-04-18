import { FormData } from "@/types/funnel";
import { DifferentiationResult } from "@/types/differentiation";
import { safeStorage } from "./safeStorage";

export interface StepConfig {
  id: string;
  stepNumber: number; // original step number for rendering
  skippable: boolean;
}

/**
 * Check if differentiation data is available in localStorage.
 * If so, we can pre-fill form fields and skip redundant steps.
 */
export function getDifferentiationPreFill(): Partial<FormData> | null {
  const diff = safeStorage.getJSON<DifferentiationResult | null>("funnelforge-differentiation-result", null);
  if (!diff) return null;
  const fd = diff.formData;
  if (!fd) return null;

  // Map differentiation fields to funnel FormData
  const preFill: Partial<FormData> = {};

  // Industry → businessField (best effort mapping)
  if (fd.industry) {
    const industry = fd.industry.toLowerCase();
    if (industry.includes("fashion") || industry.includes("אופנה")) preFill.businessField = "fashion";
    else if (industry.includes("tech") || industry.includes("saas") || industry.includes("טכנו")) preFill.businessField = "tech";
    else if (industry.includes("food") || industry.includes("מזון")) preFill.businessField = "food";
    else if (industry.includes("health") || industry.includes("בריאות")) preFill.businessField = "health";
    else if (industry.includes("education") || industry.includes("חינוך")) preFill.businessField = "education";
    else if (industry.includes("real estate") || industry.includes("נדל")) preFill.businessField = "realEstate";
    else if (industry.includes("tourism") || industry.includes("תיירות")) preFill.businessField = "tourism";
    else if (industry.includes("service") || industry.includes("שירות") || industry.includes("consult") || industry.includes("ייעוץ")) preFill.businessField = "services";
    else preFill.businessField = "other";
  }

  // targetMarket → audienceType
  if (fd.targetMarket) {
    preFill.audienceType = fd.targetMarket.startsWith("b2b") ? "b2b" : "b2c";
  }

  // priceRange → approximate averagePrice
  if (fd.priceRange === "budget") preFill.averagePrice = 100;
  else if (fd.priceRange === "mid") preFill.averagePrice = 500;
  else if (fd.priceRange === "premium") preFill.averagePrice = 2000;
  else if (fd.priceRange === "enterprise") preFill.averagePrice = 10000;

  return preFill;
}

/**
 * Determines which form steps should be visible based on current form data.
 * Steps are identified by their original number (1-7) but may be filtered/reordered.
 *
 * Step mapping:
 *  1 = Business Field
 *  2 = Experience Level (MOVED from step 7 — assessment-first pattern)
 *  3 = Audience Type + Age + Interests
 *  4 = Product + Price + Sales Model
 *  5 = Budget Range
 *  6 = Main Goal
 *  7 = Existing Channels (optional)
 */
export function getVisibleSteps(formData: Partial<FormData>): StepConfig[] {
  const steps: StepConfig[] = [
    { id: "businessField", stepNumber: 1, skippable: false },
    { id: "experienceLevel", stepNumber: 2, skippable: false },
    { id: "audience", stepNumber: 3, skippable: false },
    { id: "product", stepNumber: 4, skippable: false },
    { id: "budget", stepNumber: 5, skippable: false },
    { id: "goal", stepNumber: 6, skippable: false },
    { id: "channels", stepNumber: 7, skippable: true },
  ];

  const result: StepConfig[] = [];

  for (const step of steps) {
    // Skip audience details for personalBrand (auto-set to b2c)
    if (step.id === "audience" && formData.businessField === "personalBrand") {
      continue;
    }

    // Skip channels step for low budget (engine will auto-recommend)
    if (step.id === "channels" && formData.budgetRange === "low") {
      continue;
    }

    // Skip budget step for advanced users (auto-set high)
    if (step.id === "budget" && formData.experienceLevel === "advanced") {
      continue;
    }

    // Skip businessField + audience if differentiation pre-fill exists
    const diffPreFill = getDifferentiationPreFill();
    if (diffPreFill) {
      if (step.id === "businessField" && diffPreFill.businessField) continue;
      if (step.id === "audience" && diffPreFill.audienceType) continue;
    }

    result.push(step);
  }

  return result;
}

/**
 * Determines if a sub-question should be shown within a step.
 */
export function shouldShowAgeRange(formData: Partial<FormData>): boolean {
  // B2B targeting is by role/company, not age
  return formData.audienceType !== "b2b";
}

export function shouldShowAveragePrice(formData: Partial<FormData>): boolean {
  // Beginners can skip price (optional for them)
  if (formData.experienceLevel === "beginner") return false;
  return true;
}

/**
 * Validates whether the current step is complete enough to proceed.
 */
export function canProceed(stepId: string, formData: Partial<FormData>): boolean {
  switch (stepId) {
    case "businessField":
      return formData.businessField !== "" && formData.businessField !== undefined;
    case "experienceLevel":
      return formData.experienceLevel !== "" && formData.experienceLevel !== undefined;
    case "audience":
      return formData.audienceType !== "" && formData.audienceType !== undefined;
    case "product":
      return (
        (formData.productDescription || "").length > 0 &&
        formData.salesModel !== "" &&
        formData.salesModel !== undefined
      );
    case "budget":
      return formData.budgetRange !== "" && formData.budgetRange !== undefined;
    case "goal":
      return formData.mainGoal !== "" && formData.mainGoal !== undefined;
    case "channels":
      return true; // always optional
    default:
      return false;
  }
}

/**
 * Returns a bilingual human-readable reason for why the step is blocked,
 * or null if it's ready to proceed. Used by the form UI to surface inline
 * validation errors so users understand why the Next button is disabled.
 */
export function getStepValidationError(
  stepId: string,
  formData: Partial<FormData>,
): { he: string; en: string } | null {
  if (canProceed(stepId, formData)) return null;

  switch (stepId) {
    case "businessField":
      return { he: "בחר תחום עסקי כדי להמשיך", en: "Select a business field to continue" };
    case "experienceLevel":
      return { he: "בחר רמת ניסיון כדי להמשיך", en: "Select an experience level to continue" };
    case "audience":
      return { he: "בחר סוג קהל יעד כדי להמשיך", en: "Select an audience type to continue" };
    case "product": {
      const missing: string[] = [];
      const missingHe: string[] = [];
      if (!(formData.productDescription || "").length) {
        missing.push("product description");
        missingHe.push("תיאור מוצר");
      }
      if (!formData.salesModel) {
        missing.push("sales model");
        missingHe.push("מודל מכירה");
      }
      return {
        he: `מלא: ${missingHe.join(" ו")}`,
        en: `Fill in: ${missing.join(" and ")}`,
      };
    }
    case "budget":
      return { he: "בחר טווח תקציב כדי להמשיך", en: "Select a budget range to continue" };
    case "goal":
      return { he: "בחר מטרה ראשית כדי להמשיך", en: "Select a main goal to continue" };
    default:
      return { he: "שדות חובה חסרים", en: "Required fields are missing" };
  }
}
