import type { FormData, BusinessField, MainGoal, AudienceType, SalesModel, BudgetRange, Channel } from "@/types/funnel";

interface IndustryDefaults {
  audienceType: AudienceType;
  salesModel: SalesModel;
  budgetRange: BudgetRange;
  ageRange: [number, number];
  channels: Channel[];
  productDescription: string;
}

const INDUSTRY_DEFAULTS: Record<BusinessField, IndustryDefaults> = {
  fashion:       { audienceType: "b2c", salesModel: "oneTime",      budgetRange: "medium", ageRange: [18, 45], channels: ["instagram", "facebook", "tikTok"],              productDescription: "" },
  tech:          { audienceType: "b2b", salesModel: "subscription",  budgetRange: "high",   ageRange: [25, 55], channels: ["google", "linkedIn", "content"],               productDescription: "" },
  food:          { audienceType: "b2c", salesModel: "oneTime",      budgetRange: "low",    ageRange: [20, 55], channels: ["instagram", "facebook", "whatsapp"],            productDescription: "" },
  services:      { audienceType: "b2b", salesModel: "leads",        budgetRange: "medium", ageRange: [25, 55], channels: ["google", "linkedIn", "facebook"],               productDescription: "" },
  education:     { audienceType: "b2c", salesModel: "subscription",  budgetRange: "medium", ageRange: [18, 40], channels: ["facebook", "google", "content", "instagram"],   productDescription: "" },
  health:        { audienceType: "b2c", salesModel: "leads",        budgetRange: "medium", ageRange: [25, 60], channels: ["google", "facebook", "content"],               productDescription: "" },
  realEstate:    { audienceType: "b2b", salesModel: "leads",        budgetRange: "high",   ageRange: [28, 60], channels: ["google", "facebook", "linkedIn"],               productDescription: "" },
  tourism:       { audienceType: "b2c", salesModel: "oneTime",      budgetRange: "medium", ageRange: [22, 55], channels: ["instagram", "facebook", "google"],              productDescription: "" },
  personalBrand: { audienceType: "b2c", salesModel: "oneTime",      budgetRange: "low",    ageRange: [18, 40], channels: ["instagram", "tikTok", "content"],              productDescription: "" },
  other:         { audienceType: "b2c", salesModel: "oneTime",      budgetRange: "medium", ageRange: [25, 55], channels: ["facebook", "google", "instagram"],              productDescription: "" },
};

export function getSmartDefaults(businessField: BusinessField, mainGoal: MainGoal): FormData {
  const defaults = INDUSTRY_DEFAULTS[businessField];

  return {
    businessField,
    mainGoal,
    experienceLevel: "beginner",
    audienceType: defaults.audienceType,
    ageRange: defaults.ageRange,
    interests: "",
    productDescription: defaults.productDescription,
    averagePrice: 0,
    salesModel: defaults.salesModel,
    budgetRange: defaults.budgetRange,
    existingChannels: defaults.channels,
  };
}
