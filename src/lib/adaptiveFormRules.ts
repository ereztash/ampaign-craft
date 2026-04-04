import { FormData } from "@/types/funnel";

export interface StepConfig {
  id: string;
  stepNumber: number; // original step number for rendering
  skippable: boolean;
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
