import { z } from "zod";

const ClaimExampleSchema = z.object({
  claim: z.string(),
  evidence: z.string(),
  verified: z.boolean(),
  gap: z.string(),
});

const HiddenValueScoreSchema = z.object({
  valueId: z.enum([
    "legitimacy", "risk", "identity", "cognitive_ease", "status", "narrative",
    "autonomy", "empathy",
    "convenience", "aesthetic", "belonging", "self_expression",
    "guilt_free", "instant_gratification",
  ]),
  score: z.number().min(1).max(5),
  signal: z.string(),
});

const CompetitorArchetypeSchema = z.object({
  name: z.string(),
  archetype: z.enum([
    "laser_focused", "quiet_vendor", "hidden_cost_engineer",
    "political_disruptor", "unexpected_joiner",
    "category_king", "price_anchor", "lifestyle_brand",
    "platform_aggregator", "creator_led",
  ]),
  threat_level: z.enum(["low", "medium", "high"]),
  counter_strategy: z.string(),
});

const TradeoffDeclarationSchema = z.object({
  weakness: z.string(),
  reframe: z.string(),
  beneficiary: z.string(),
});

export const DifferentiationFormDataSchema = z.object({
  businessName: z.string().min(1),
  industry: z.string().min(1),
  targetMarket: z.enum([
    "b2b", "b2b_enterprise", "b2b_smb", "b2b_gov",
    "b2c", "b2c_ecommerce", "b2c_saas", "b2c_service", "b2c_creator",
    "b2b2c", "both",
  ]),
  companySize: z.enum(["solo", "2-10", "11-50", "51-200", "200+"]),
  currentPositioning: z.string(),
  topCompetitors: z.array(z.string()),
  priceRange: z.enum(["budget", "mid", "premium", "enterprise"]),
  claimExamples: z.array(ClaimExampleSchema),
  customerQuote: z.string(),
  lostDealReason: z.string(),
  negativeReviewTheme: z.string(),
  returnReason: z.string(),
  competitorOverlap: z.string(),
  ashamedPains: z.array(z.string()),
  hiddenValues: z.array(HiddenValueScoreSchema),
  internalFriction: z.string(),
  competitorArchetypes: z.array(CompetitorArchetypeSchema),
  buyingCommitteeMap: z.array(z.unknown()).optional(),
  influenceNetwork: z.array(z.unknown()).optional(),
  decisionLatency: z.enum(["days", "weeks", "months", "quarters"]),
  decisionSpeed: z.enum(["impulse", "same_day", "days", "weeks"]).optional(),
  discoveryChannels: z.array(z.string()).optional(),
  confirmedTradeoffs: z.array(TradeoffDeclarationSchema),
  selectedHybridCategory: z.string(),
});

export const SyntheticPersonaSchema = z.object({
  id: z.string().regex(/^p\d{2}$/, "id must be p01..p20"),
  archetype: z.string().min(3),
  bias: z.enum([
    "dunning_kruger", "sunk_cost", "confirmation",
    "skeptic_of_ai", "overload",
  ]).optional(),
  segment: z.enum([
    "b2b_services", "b2c_services", "b2b_saas",
    "b2c_creator", "edge_case", "failure_state",
  ]),
  expectedFailureMode: z.string().optional(),
  formData: DifferentiationFormDataSchema,
  /** 2-3 public posts (LinkedIn / website). Used for stylometric calibration. */
  linkedinPosts: z.array(z.string()).min(2).max(3),
  /** 3 specific friction moments — the last thing said before a deal stopped.
   *  NOT abstract reasons ("budget"). Specific statements. */
  lostDealMoments: z.array(z.string()).min(2).max(3),
  profileUrl: z.string().optional(),
  /** Optional: messages / emails that reveal operational voice (refusals, debrief notes). */
  operationalArtifacts: z.array(z.string()).optional(),
});

export type SyntheticPersona = z.infer<typeof SyntheticPersonaSchema>;

export const PersonaListSchema = z.array(SyntheticPersonaSchema).length(20);

export function validatePersonas(personas: unknown): SyntheticPersona[] {
  return PersonaListSchema.parse(personas);
}
