import { describe, it, expect } from "vitest";
import { getVisibleSteps, shouldShowAgeRange, shouldShowAveragePrice, canProceed } from "../adaptiveFormRules";

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
