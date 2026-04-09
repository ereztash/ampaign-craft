// ═══════════════════════════════════════════════
// Research Engine Type Definitions
// Cross-domain research with orchestrator-worker pattern
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
// RESEARCH QUERY & DOMAIN
// ═══════════════════════════════════════════════

export type ResearchDomain = "regulatory" | "market" | "marketing";

export interface ResearchQuery {
  id: string;
  question: string;
  domain: ResearchDomain;
  context: {
    industry: string;
    audienceType: string;
    mainGoal: string;
    country: string; // default "IL"
  };
  priority: "high" | "medium" | "low";
  createdAt: string;
}

export interface SubQuery {
  id: string;
  parentId: string;
  domain: ResearchDomain;
  question: string;
  keywords: string[];
}

// ═══════════════════════════════════════════════
// RESEARCH FINDINGS
// ═══════════════════════════════════════════════

export interface SourceCitation {
  title: string;
  url?: string;
  type: "regulation" | "article" | "report" | "case-study" | "internal-data";
  reliability: "high" | "medium" | "low";
}

export interface ResearchFinding {
  id: string;
  subQueryId: string;
  domain: ResearchDomain;
  insight: { he: string; en: string };
  evidence: string;
  sources: SourceCitation[];
  confidence: number; // 0-1
  actionable: boolean;
  recommendation?: { he: string; en: string };
}

// ═══════════════════════════════════════════════
// DOMAIN-SPECIFIC RESULTS
// ═══════════════════════════════════════════════

export interface RegulatoryFinding extends ResearchFinding {
  domain: "regulatory";
  regulationType: "advertising" | "data-protection" | "consumer" | "industry-specific";
  complianceLevel: "compliant" | "needs-review" | "non-compliant";
}

export interface MarketFinding extends ResearchFinding {
  domain: "market";
  marketAspect: "competitor" | "pricing" | "trend" | "benchmark";
}

export interface MarketingFinding extends ResearchFinding {
  domain: "marketing";
  marketingAspect: "channel" | "content" | "timing" | "audience" | "technology";
}

// ═══════════════════════════════════════════════
// RESEARCH SYNTHESIS
// ═══════════════════════════════════════════════

export interface ResearchSynthesis {
  queryId: string;
  summary: { he: string; en: string };
  keyFindings: ResearchFinding[];
  crossDomainInsights: { he: string; en: string }[];
  strategicRecommendations: {
    priority: "high" | "medium" | "low";
    recommendation: { he: string; en: string };
    supportingFindings: string[]; // finding IDs
  }[];
  overallConfidence: number; // 0-1
  domains: ResearchDomain[];
  totalFindings: number;
  completedAt: string;
}

// ═══════════════════════════════════════════════
// RESEARCH SESSION STATE
// ═══════════════════════════════════════════════

export type ResearchStatus = "idle" | "decomposing" | "researching" | "synthesizing" | "complete" | "error";

export interface ResearchSession {
  query: ResearchQuery;
  subQueries: SubQuery[];
  findings: ResearchFinding[];
  synthesis: ResearchSynthesis | null;
  status: ResearchStatus;
  progress: number; // 0-100
  error?: string;
  startedAt: string;
  completedAt?: string;
}
