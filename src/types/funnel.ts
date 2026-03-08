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

export interface FunnelResult {
  id: string;
  funnelName: { he: string; en: string };
  stages: FunnelStage[];
  totalBudget: { min: number; max: number };
  overallTips: { he: string; en: string }[];
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
  audienceType: "",
  ageRange: [18, 65],
  interests: "",
  productDescription: "",
  averagePrice: 0,
  salesModel: "",
  budgetRange: "",
  mainGoal: "",
  existingChannels: [],
  experienceLevel: "",
};
