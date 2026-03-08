export type BusinessField =
  | "fashion"
  | "tech"
  | "food"
  | "services"
  | "education"
  | "health"
  | "realEstate"
  | "tourism"
  | "other";

export type AudienceType = "b2c" | "b2b" | "both";

export type SalesModel = "oneTime" | "subscription" | "leads";

export type BudgetRange = "low" | "medium" | "high" | "veryHigh";

export type MainGoal = "awareness" | "leads" | "sales" | "loyalty";

export type Channel =
  | "facebook"
  | "instagram"
  | "google"
  | "content"
  | "email"
  | "tikTok"
  | "linkedIn"
  | "other";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export interface FormData {
  businessField: BusinessField | "";
  audienceType: AudienceType | "";
  ageRange: [number, number];
  interests: string;
  productDescription: string;
  averagePrice: number;
  salesModel: SalesModel | "";
  budgetRange: BudgetRange | "";
  mainGoal: MainGoal | "";
  existingChannels: Channel[];
  experienceLevel: ExperienceLevel | "";
}

export interface FunnelStage {
  id: string;
  name: { he: string; en: string };
  budgetPercent: number;
  channels: ChannelRecommendation[];
  description: { he: string; en: string };
}

export interface ChannelRecommendation {
  channel: string;
  name: { he: string; en: string };
  budgetPercent: number;
  kpis: { he: string; en: string }[];
  tips: { he: string; en: string }[];
}

export interface HookTip {
  law: string;
  lawName: { he: string; en: string };
  formula: { he: string; en: string };
  example: { he: string; en: string };
  channels: string[];
}

export interface CopyFormula {
  name: { he: string; en: string };
  origin: string;
  structure: { he: string; en: string };
  example: { he: string; en: string };
  bestFor: string[];
  conversionLift: string;
}

export interface ReaderProfile {
  level: number;
  name: { he: string; en: string };
  description: { he: string; en: string };
  copyArchitecture: { he: string; en: string };
  principles: { he: string; en: string }[];
}

export interface WritingTechnique {
  name: { he: string; en: string };
  description: { he: string; en: string };
  doExample: { he: string; en: string };
  dontExample: { he: string; en: string };
  metric: string;
}

export interface CopyLabData {
  readerProfile: ReaderProfile;
  formulas: CopyFormula[];
  writingTechniques: WritingTechnique[];
}

export interface FunnelResult {
  id: string;
  funnelName: { he: string; en: string };
  stages: FunnelStage[];
  totalBudget: { min: number; max: number };
  overallTips: { he: string; en: string }[];
  hookTips: HookTip[];
  copyLab: CopyLabData;
  kpis: { name: { he: string; en: string }; target: string }[];
  createdAt: string;
  formData: FormData;
}

export interface SavedPlan {
  id: string;
  name: string;
  result: FunnelResult;
  savedAt: string;
}

export const initialFormData: FormData = {
  businessField: "",
  audienceType: "b2b",
  ageRange: [25, 55],
  interests: "",
  productDescription: "",
  averagePrice: 0,
  salesModel: "",
  budgetRange: "",
  mainGoal: "",
  existingChannels: [],
  experienceLevel: "",
};
