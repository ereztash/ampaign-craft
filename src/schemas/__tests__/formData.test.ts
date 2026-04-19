import { describe, it, expect } from "vitest";
import {
  validateFormData,
  formatZodErrors,
  businessFieldSchema,
  audienceTypeSchema,
  salesModelSchema,
  budgetRangeSchema,
  mainGoalSchema,
  channelSchema,
  experienceLevelSchema,
} from "@/schemas/formData";

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

  it("accepts empty existingChannels array", () => {
    expect(validateFormData({ ...valid, existingChannels: [] }).ok).toBe(true);
  });

  it("rejects price over 1_000_000", () => {
    expect(validateFormData({ ...valid, averagePrice: 1_000_001 }).ok).toBe(false);
  });

  it("accepts description of exactly 10 characters", () => {
    expect(validateFormData({ ...valid, productDescription: "1234567890" }).ok).toBe(true);
  });

  it("rejects description over 2000 characters", () => {
    expect(validateFormData({ ...valid, productDescription: "x".repeat(2001) }).ok).toBe(false);
  });

  it("rejects age below 13", () => {
    expect(validateFormData({ ...valid, ageRange: [12, 30] }).ok).toBe(false);
  });

  it("accepts equal min and max age", () => {
    expect(validateFormData({ ...valid, ageRange: [30, 30] }).ok).toBe(true);
  });
});

describe("Individual field schemas", () => {
  it("businessFieldSchema accepts all 10 values", () => {
    const vals = ["fashion","tech","food","services","education","health","realEstate","tourism","personalBrand","other"];
    for (const v of vals) expect(businessFieldSchema.safeParse(v).success).toBe(true);
  });

  it("businessFieldSchema rejects unknown value", () => {
    expect(businessFieldSchema.safeParse("crypto").success).toBe(false);
  });

  it("audienceTypeSchema accepts b2c, b2b, both", () => {
    for (const v of ["b2c","b2b","both"]) expect(audienceTypeSchema.safeParse(v).success).toBe(true);
  });

  it("salesModelSchema accepts oneTime, subscription, leads", () => {
    for (const v of ["oneTime","subscription","leads"]) expect(salesModelSchema.safeParse(v).success).toBe(true);
  });

  it("budgetRangeSchema accepts low, medium, high, veryHigh", () => {
    for (const v of ["low","medium","high","veryHigh"]) expect(budgetRangeSchema.safeParse(v).success).toBe(true);
  });

  it("mainGoalSchema accepts awareness, leads, sales, loyalty", () => {
    for (const v of ["awareness","leads","sales","loyalty"]) expect(mainGoalSchema.safeParse(v).success).toBe(true);
  });

  it("channelSchema accepts all 9 channels", () => {
    const channels = ["facebook","instagram","google","content","email","tikTok","linkedIn","whatsapp","other"];
    for (const v of channels) expect(channelSchema.safeParse(v).success).toBe(true);
  });

  it("experienceLevelSchema accepts beginner, intermediate, advanced", () => {
    for (const v of ["beginner","intermediate","advanced"]) expect(experienceLevelSchema.safeParse(v).success).toBe(true);
  });
});

describe("formatZodErrors", () => {
  it("returns English prefix by default", () => {
    const res = validateFormData({ ...valid, averagePrice: -1 });
    if (!res.ok) {
      const msg = formatZodErrors(res.errors);
      expect(msg).toMatch(/Invalid fields/);
    }
  });

  it("returns Hebrew prefix when lang=he", () => {
    const res = validateFormData({ ...valid, averagePrice: -1 });
    if (!res.ok) {
      const msg = formatZodErrors(res.errors, "he");
      expect(msg).toMatch(/שדות שגויים/);
    }
  });
});
