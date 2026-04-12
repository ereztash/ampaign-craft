import { describe, it, expect } from "vitest";
import { getVisibleSteps, shouldShowAgeRange, shouldShowAveragePrice, canProceed, getStepValidationError } from "../adaptiveFormRules";

describe("getVisibleSteps", () => {
  it("returns 7 steps for default form", () => {
    const steps = getVisibleSteps({});
    expect(steps).toHaveLength(7);
  });

  it("skips audience for personalBrand", () => {
    const steps = getVisibleSteps({ businessField: "personalBrand" });
    const ids = steps.map((s) => s.id);
    expect(ids).not.toContain("audience");
    expect(steps).toHaveLength(6);
  });

  it("skips channels for low budget", () => {
    const steps = getVisibleSteps({ budgetRange: "low" });
    const ids = steps.map((s) => s.id);
    expect(ids).not.toContain("channels");
    expect(steps).toHaveLength(6);
  });

  it("skips both for personalBrand + low budget", () => {
    const steps = getVisibleSteps({ businessField: "personalBrand", budgetRange: "low" });
    expect(steps).toHaveLength(5);
  });

  it("channels step is skippable", () => {
    const steps = getVisibleSteps({});
    const channels = steps.find((s) => s.id === "channels");
    expect(channels?.skippable).toBe(true);
  });

  it("first step is always businessField", () => {
    expect(getVisibleSteps({})[0].id).toBe("businessField");
  });
});

describe("shouldShowAgeRange", () => {
  it("hides for b2b", () => {
    expect(shouldShowAgeRange({ audienceType: "b2b" })).toBe(false);
  });

  it("shows for b2c", () => {
    expect(shouldShowAgeRange({ audienceType: "b2c" })).toBe(true);
  });

  it("shows for both", () => {
    expect(shouldShowAgeRange({ audienceType: "both" })).toBe(true);
  });
});

describe("shouldShowAveragePrice", () => {
  it("hides for beginner", () => {
    expect(shouldShowAveragePrice({ experienceLevel: "beginner" })).toBe(false);
  });

  it("shows for intermediate", () => {
    expect(shouldShowAveragePrice({ experienceLevel: "intermediate" })).toBe(true);
  });
});

describe("canProceed", () => {
  it("businessField requires value", () => {
    expect(canProceed("businessField", {})).toBe(false);
    expect(canProceed("businessField", { businessField: "tech" })).toBe(true);
  });

  it("channels always passes", () => {
    expect(canProceed("channels", {})).toBe(true);
  });

  it("product requires description + salesModel", () => {
    expect(canProceed("product", {})).toBe(false);
    expect(canProceed("product", { productDescription: "test", salesModel: "subscription" })).toBe(true);
  });

  it("unknown step returns false", () => {
    expect(canProceed("unknown", {})).toBe(false);
  });
});

describe("getStepValidationError", () => {
  it("returns null when the step is complete", () => {
    expect(getStepValidationError("businessField", { businessField: "tech" })).toBeNull();
    expect(getStepValidationError("channels", {})).toBeNull();
    expect(
      getStepValidationError("product", {
        productDescription: "An AI coach for Hebrew founders",
        salesModel: "subscription",
      }),
    ).toBeNull();
  });

  it("returns a bilingual reason for empty businessField", () => {
    const err = getStepValidationError("businessField", {});
    expect(err).not.toBeNull();
    expect(err?.he).toContain("תחום");
    expect(err?.en.toLowerCase()).toContain("business field");
  });

  it("returns a bilingual reason for empty experienceLevel", () => {
    const err = getStepValidationError("experienceLevel", {});
    expect(err).not.toBeNull();
    expect(err?.he).toContain("ניסיון");
    expect(err?.en.toLowerCase()).toContain("experience");
  });

  it("returns a bilingual reason for empty audience", () => {
    const err = getStepValidationError("audience", {});
    expect(err).not.toBeNull();
    expect(err?.he).toContain("קהל");
    expect(err?.en.toLowerCase()).toContain("audience");
  });

  it("returns a bilingual reason for empty budget", () => {
    const err = getStepValidationError("budget", {});
    expect(err).not.toBeNull();
    expect(err?.he).toContain("תקציב");
    expect(err?.en.toLowerCase()).toContain("budget");
  });

  it("returns a bilingual reason for empty goal", () => {
    const err = getStepValidationError("goal", {});
    expect(err).not.toBeNull();
    expect(err?.he).toContain("מטרה");
    expect(err?.en.toLowerCase()).toContain("goal");
  });

  it("product step lists both missing fields when neither is filled", () => {
    const err = getStepValidationError("product", {});
    expect(err).not.toBeNull();
    expect(err?.en.toLowerCase()).toContain("product description");
    expect(err?.en.toLowerCase()).toContain("sales model");
    expect(err?.he).toContain("תיאור מוצר");
    expect(err?.he).toContain("מודל מכירה");
  });

  it("product step lists only salesModel when description is filled", () => {
    const err = getStepValidationError("product", { productDescription: "has content" });
    expect(err).not.toBeNull();
    expect(err?.en.toLowerCase()).toContain("sales model");
    expect(err?.en.toLowerCase()).not.toContain("product description");
  });

  it("product step lists only description when salesModel is filled", () => {
    const err = getStepValidationError("product", { salesModel: "subscription" });
    expect(err).not.toBeNull();
    expect(err?.en.toLowerCase()).toContain("product description");
    expect(err?.en.toLowerCase()).not.toContain("sales model");
  });

  it("unknown step returns a generic bilingual reason", () => {
    const err = getStepValidationError("unknown-step", {});
    expect(err).not.toBeNull();
    expect(typeof err?.he).toBe("string");
    expect(typeof err?.en).toBe("string");
  });
});
