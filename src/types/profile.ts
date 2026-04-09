import type {
  BusinessField,
  AudienceType,
  MainGoal,
  SalesModel,
  ExperienceLevel,
  Channel,
  BudgetRange,
  FormData,
} from "@/types/funnel";
import type { DifferentiationFormData, MarketContext } from "@/types/differentiation";

export type ValuePriority = "speed" | "quality" | "cost" | "innovation";

export interface UnifiedProfile {
  businessField: BusinessField;
  audienceType: AudienceType;
  mainGoal: MainGoal;
  salesModel: SalesModel;
  experienceLevel: ExperienceLevel;

  pricePositioning: number;
  competitiveIntensity: number;
  budgetCapacity: number;
  teamSize: number;
  marketMaturity: number;

  valuePriorities: ValuePriority[];

  ageRange: [number, number];
  channels: Channel[];

  productDescription?: string;
  interests?: string;
  businessName?: string;
  industry?: string;
}

export const INITIAL_UNIFIED_PROFILE: UnifiedProfile = {
  businessField: "other",
  audienceType: "b2c",
  mainGoal: "sales",
  salesModel: "oneTime",
  experienceLevel: "beginner",
  pricePositioning: 50,
  competitiveIntensity: 50,
  budgetCapacity: 50,
  teamSize: 20,
  marketMaturity: 50,
  valuePriorities: ["speed", "quality", "cost", "innovation"],
  ageRange: [25, 55],
  channels: ["facebook", "google", "instagram"],
};

const INDUSTRY_SLIDER_DEFAULTS: Record<BusinessField, {
  audienceType: AudienceType;
  salesModel: SalesModel;
  ageRange: [number, number];
  channels: Channel[];
  pricePositioning: number;
  competitiveIntensity: number;
  budgetCapacity: number;
  teamSize: number;
  marketMaturity: number;
}> = {
  fashion:       { audienceType: "b2c", salesModel: "oneTime",     ageRange: [18, 45], channels: ["instagram", "facebook", "tikTok"],            pricePositioning: 50, competitiveIntensity: 75, budgetCapacity: 45, teamSize: 25, marketMaturity: 70 },
  tech:          { audienceType: "b2b", salesModel: "subscription", ageRange: [25, 55], channels: ["google", "linkedIn", "content"],              pricePositioning: 70, competitiveIntensity: 80, budgetCapacity: 70, teamSize: 50, marketMaturity: 55 },
  food:          { audienceType: "b2c", salesModel: "oneTime",     ageRange: [20, 55], channels: ["instagram", "facebook", "whatsapp"],          pricePositioning: 30, competitiveIntensity: 70, budgetCapacity: 30, teamSize: 20, marketMaturity: 85 },
  services:      { audienceType: "b2b", salesModel: "leads",       ageRange: [25, 55], channels: ["google", "linkedIn", "facebook"],             pricePositioning: 55, competitiveIntensity: 60, budgetCapacity: 50, teamSize: 30, marketMaturity: 65 },
  education:     { audienceType: "b2c", salesModel: "subscription", ageRange: [18, 40], channels: ["facebook", "google", "content", "instagram"], pricePositioning: 45, competitiveIntensity: 55, budgetCapacity: 45, teamSize: 25, marketMaturity: 50 },
  health:        { audienceType: "b2c", salesModel: "leads",       ageRange: [25, 60], channels: ["google", "facebook", "content"],              pricePositioning: 55, competitiveIntensity: 65, budgetCapacity: 50, teamSize: 25, marketMaturity: 60 },
  realEstate:    { audienceType: "b2b", salesModel: "leads",       ageRange: [28, 60], channels: ["google", "facebook", "linkedIn"],             pricePositioning: 75, competitiveIntensity: 80, budgetCapacity: 70, teamSize: 35, marketMaturity: 80 },
  tourism:       { audienceType: "b2c", salesModel: "oneTime",     ageRange: [22, 55], channels: ["instagram", "facebook", "google"],            pricePositioning: 50, competitiveIntensity: 70, budgetCapacity: 45, teamSize: 20, marketMaturity: 75 },
  personalBrand: { audienceType: "b2c", salesModel: "oneTime",     ageRange: [18, 40], channels: ["instagram", "tikTok", "content"],             pricePositioning: 40, competitiveIntensity: 50, budgetCapacity: 25, teamSize: 10, marketMaturity: 40 },
  other:         { audienceType: "b2c", salesModel: "oneTime",     ageRange: [25, 55], channels: ["facebook", "google", "instagram"],            pricePositioning: 50, competitiveIntensity: 50, budgetCapacity: 50, teamSize: 20, marketMaturity: 50 },
};

export function getIndustryDefaults(field: BusinessField): typeof INDUSTRY_SLIDER_DEFAULTS[BusinessField] {
  return INDUSTRY_SLIDER_DEFAULTS[field];
}

function sliderToBudgetRange(capacity: number): BudgetRange {
  if (capacity < 25) return "low";
  if (capacity < 55) return "medium";
  if (capacity < 80) return "high";
  return "veryHigh";
}

function sliderToAveragePrice(positioning: number, audienceType: AudienceType): number {
  const base = audienceType === "b2b" ? 5000 : 200;
  return Math.round(base * (positioning / 50));
}

function experienceFromPriorities(priorities: ValuePriority[]): ExperienceLevel {
  const first = priorities[0];
  if (first === "speed" || first === "cost") return "beginner";
  if (first === "innovation") return "advanced";
  return "intermediate";
}

export function toFormData(profile: UnifiedProfile): FormData {
  return {
    businessField: profile.businessField,
    audienceType: profile.audienceType,
    ageRange: profile.ageRange,
    interests: profile.interests || "",
    productDescription: profile.productDescription || "",
    averagePrice: sliderToAveragePrice(profile.pricePositioning, profile.audienceType),
    salesModel: profile.salesModel,
    budgetRange: sliderToBudgetRange(profile.budgetCapacity),
    mainGoal: profile.mainGoal,
    existingChannels: profile.channels,
    experienceLevel: profile.experienceLevel,
  };
}

function audienceToMarketContext(at: AudienceType, field: BusinessField): MarketContext {
  if (at === "both") return "both";
  if (at === "b2b") {
    if (field === "tech") return "b2b_smb";
    return "b2b";
  }
  if (field === "personalBrand") return "b2c_creator";
  if (field === "tech") return "b2c_saas";
  if (field === "services") return "b2c_service";
  return "b2c";
}

function sliderToCompanySize(teamSize: number): DifferentiationFormData["companySize"] {
  if (teamSize < 15) return "solo";
  if (teamSize < 35) return "2-10";
  if (teamSize < 60) return "11-50";
  if (teamSize < 80) return "51-200";
  return "200+";
}

function sliderToPriceRange(positioning: number): DifferentiationFormData["priceRange"] {
  if (positioning < 25) return "budget";
  if (positioning < 55) return "mid";
  if (positioning < 80) return "premium";
  return "enterprise";
}

export function toDifferentiationPrefill(profile: UnifiedProfile): Partial<DifferentiationFormData> {
  return {
    businessName: profile.businessName || "",
    industry: profile.industry || profile.businessField,
    targetMarket: audienceToMarketContext(profile.audienceType, profile.businessField),
    companySize: sliderToCompanySize(profile.teamSize),
    priceRange: sliderToPriceRange(profile.pricePositioning),
  };
}

export function fromFormData(fd: FormData): UnifiedProfile {
  const field = (fd.businessField || "other") as BusinessField;
  const defaults = INDUSTRY_SLIDER_DEFAULTS[field];

  let pricePos = defaults.pricePositioning;
  if (fd.averagePrice > 0) {
    const base = fd.audienceType === "b2b" ? 5000 : 200;
    pricePos = Math.min(100, Math.round((fd.averagePrice / base) * 50));
  }

  let budgetCap = defaults.budgetCapacity;
  if (fd.budgetRange) {
    const map: Record<string, number> = { low: 15, medium: 40, high: 65, veryHigh: 90 };
    budgetCap = map[fd.budgetRange] ?? budgetCap;
  }

  const exp = (fd.experienceLevel || "beginner") as ExperienceLevel;
  let priorities: ValuePriority[] = ["speed", "quality", "cost", "innovation"];
  if (exp === "advanced") priorities = ["innovation", "quality", "speed", "cost"];
  else if (exp === "intermediate") priorities = ["quality", "speed", "innovation", "cost"];

  return {
    businessField: field,
    audienceType: (fd.audienceType || defaults.audienceType) as AudienceType,
    mainGoal: (fd.mainGoal || "sales") as MainGoal,
    salesModel: (fd.salesModel || defaults.salesModel) as SalesModel,
    experienceLevel: exp,
    pricePositioning: pricePos,
    competitiveIntensity: defaults.competitiveIntensity,
    budgetCapacity: budgetCap,
    teamSize: defaults.teamSize,
    marketMaturity: defaults.marketMaturity,
    valuePriorities: priorities,
    ageRange: fd.ageRange,
    channels: fd.existingChannels.length > 0 ? fd.existingChannels : defaults.channels,
    productDescription: fd.productDescription || undefined,
    interests: fd.interests || undefined,
  };
}

export { experienceFromPriorities };
