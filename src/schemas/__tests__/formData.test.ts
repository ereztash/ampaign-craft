import { describe, it, expect } from "vitest";
import { validateFormData } from "@/schemas/formData";

const valid = {
  businessField: "tech",
  audienceType: "b2b",
  ageRange: [25, 55] as [number, number],
  interests: "cloud ops",
  productDescription: "A developer platform for cloud ops and observability.",
  averagePrice: 199,
  salesModel: "subscription",
  budgetRange: "medium",
  mainGoal: "leads",
  existingChannels: ["google", "linkedIn"],
  experienceLevel: "intermediate",
};

describe("validateFormData", () => {
  it("accepts a fully-populated form", () => {
    const res = validateFormData(valid);
    expect(res.ok).toBe(true);
  });

  it("rejects empty business field", () => {
    const res = validateFormData({ ...valid, businessField: "" });
    expect(res.ok).toBe(false);
  });

  it("rejects zero price", () => {
    const res = validateFormData({ ...valid, averagePrice: 0 });
    expect(res.ok).toBe(false);
  });

  it("rejects too-short description", () => {
    const res = validateFormData({ ...valid, productDescription: "short" });
    expect(res.ok).toBe(false);
  });

  it("rejects inverted age range", () => {
    const res = validateFormData({ ...valid, ageRange: [60, 20] });
    expect(res.ok).toBe(false);
  });

  it("rejects unknown channel", () => {
    const res = validateFormData({ ...valid, existingChannels: ["bogus"] });
    expect(res.ok).toBe(false);
  });
});
