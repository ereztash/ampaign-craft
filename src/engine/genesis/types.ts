// Business profile intermediate representation produced by the Funnel Genesis wizard.
// Maps to the business_profiles Supabase table.

export type TeamSize = "solo" | "2-5" | "6-20" | "21-50" | "50+";
export type SalesMotion = "inbound" | "outbound" | "plg" | "mixed";
export type Bottleneck = "leads" | "conversion" | "churn" | "delivery" | "pricing";
export type Fear = "too_slow" | "wrong_market" | "competition" | "team" | "capital";

export interface Competitor {
  name: string;
  weakness: string;
}

export interface BusinessSpec {
  companyName: string;
  industry: string;
  teamSize: TeamSize;
  foundedYear: number | null;
  offer: string;
  icp: string;
  pricePoint: string;
  salesMotion: SalesMotion;
  competitors: Competitor[];
  differentiator: string;
  bottleneck: Bottleneck;
  winCondition: string;
  fear: Fear;
}

export interface MoatScore {
  total: number;           // 0-100
  clarity: number;         // 0-25 — how specific is the offer + ICP?
  differentiation: number; // 0-25 — competitor awareness + stated edge?
  urgency: number;         // 0-25 — how specific is the bottleneck?
  conviction: number;      // 0-25 — how concrete is the 90-day win?
  label: "weak" | "developing" | "strong" | "fortress";
}
