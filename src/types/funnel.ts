export type BusinessField =
  | "fashion"
  | "tech"
  | "food"
  | "services"
  | "education"
  | "health"
  | "realEstate"
  | "tourism"
  | "personalBrand"
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
  | "whatsapp"
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

// ═══════════════════════════════════════════════
// Personal Brand Types
// ═══════════════════════════════════════════════

export interface DiagnosticQuestion {
  id: string;
  section: string;
  question: { he: string; en: string };
  type: "slider" | "choice";
  options?: { label: { he: string; en: string }; value: number }[];
}

export interface ExecutionTemplate {
  id: string;
  name: { he: string; en: string };
  description: { he: string; en: string };
  steps: { he: string; en: string }[];
  timeline: { he: string; en: string };
  priority: "high" | "medium" | "low";
}

export interface BrandDiagnosticResult {
  totalScore: number;
  tier: "strong" | "gaps" | "pivot" | "restart";
  sections: {
    name: { he: string; en: string };
    score: number;
    maxScore: number;
  }[];
  recommendedTemplates: ExecutionTemplate[];
}

export interface PersonalBrandData {
  positioningTips: { he: string; en: string }[];
  signalPriority: { signal: string; name: { he: string; en: string }; description: { he: string; en: string } }[];
  authenticityGuidance: { he: string; en: string }[];
}

// ═══════════════════════════════════════════════
// Neuro-Storytelling Types
// ═══════════════════════════════════════════════

export interface NeuroVector {
  id: "cortisol" | "oxytocin" | "dopamine";
  name: { he: string; en: string };
  emoji: string;
  color: string;
  biologicalFunction: { he: string; en: string };
  copyApplication: { he: string; en: string };
  intensityTips: { he: string; en: string }[];
}

export interface NeuroPromptTemplate {
  stage: string;
  stageName: { he: string; en: string };
  template: { he: string; en: string };
  vectors: ("cortisol" | "oxytocin" | "dopamine")[];
}

export interface EntropyGuide {
  definition: { he: string; en: string };
  overloadSigns: { he: string; en: string }[];
  collapseSigns: { he: string; en: string }[];
  balanceTips: { he: string; en: string }[];
}

export interface NeuroStorytellingData {
  vectors: NeuroVector[];
  promptTemplates: NeuroPromptTemplate[];
  entropyGuide: EntropyGuide;
  axiom: { he: string; en: string };
}

export interface FunnelResult {
  id: string;
  funnelName: { he: string; en: string };
  stages: FunnelStage[];
  totalBudget: { min: number; max: number };
  overallTips: { he: string; en: string }[];
  hookTips: HookTip[];
  copyLab: CopyLabData;
  kpis: { name: { he: string; en: string }; target: string; confidence?: "high" | "medium" | "low" }[];
  createdAt: string;
  formData: FormData;
  personalBrand?: PersonalBrandData;
  neuroStorytelling?: NeuroStorytellingData;
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
