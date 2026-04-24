/**
 * COR-SYS Principle Library — Type Definitions
 *
 * Generated from pilot corpus: 2 trauma-intervention courses + ייעוץ ארגוני.
 * Version 1.0.0 | Pilot | Not yet wired to production.
 *
 * The principle library is the core asset of FunnelForge's MOAT-generator.
 * Each client's Differentiation Module runs the MatchEngine against this library
 * to produce a per-client set of candidate MOATs.
 */

export type ModuleId =
  | "differentiation"
  | "marketing"
  | "sales"
  | "pricing"
  | "retention";

export type PrincipleId = `P${string}`;

export interface Principle {
  /** Stable code (P01-P16). Do not reuse even if a principle is removed. */
  id: PrincipleId;

  /** Hebrew display name. */
  name_he: string;

  /** English display name. */
  name_en: string;

  /** Hebrew definition. 1-3 sentences. */
  definition_he: string;

  /** Named researchers/theorists. */
  research_backbone: string[];

  /** Document IDs (D001..D0NN) where this principle appears. */
  sources: PrincipleSourceRef[];

  /** Count of source docs. Denormalized for ranking. */
  frequency: number;

  /** Which FunnelForge modules this principle can power. */
  module_relevance: ModuleId[];

  // ─── MOAT-generator columns ───
  // These five fields turn a static principle into a generative engine.
  // The MatchEngine consumes them to produce per-client MOATs.

  /**
   * Parameterizable claim. Contains {placeholders} to be replaced
   * with client-specific values during generation.
   */
  claim_template: string;

  /**
   * Positioning angle. The "what to say in the market" statement
   * once the principle is claimed.
   */
  market_stance: string;

  /**
   * Operational signals that prove the principle is alive in the client's
   * current operations. The diagnostic engine scans for these.
   */
  ops_signal: string[];

  /**
   * Keywords to search competitor materials for. If these appear,
   * the principle space is CLAIMED. If absent, it's CLAIMABLE.
   */
  competitor_scan_keywords: string[];

  /**
   * How to defend the claim if a competitor or prospect attacks it.
   * Cites research foundation.
   */
  defense_pattern: string;
}

export type PrincipleSourceRef = string; // e.g. "D001"

export interface PrincipleLibrary {
  version: string;
  generated_at: string;
  pilot_scope: string;
  source_doc_count: number;
  principle_count: number;
  principles: Principle[];
}

// ─── Source document registry ───

export interface SourceDoc {
  id: string; // D001..D0NN
  filename: string;
  course: string;
  folder?: string;
  cluster?: string;
  core_claim: string;
  mechanism: string;
  researchers: string[];
  named_frameworks: string[];
  principles_tagged: PrincipleId[];
  size_bytes: number;
}

export interface SourceRegistry {
  version: string;
  count: number;
  sources: SourceDoc[];
}

// ─── MOAT Matcher I/O ───

/**
 * Per-client diagnostic input consumed by the MatchEngine.
 * Produced by the Differentiation Module wizard.
 */
export interface ClientDiagnostic {
  client_id: string;
  market_category: string; // e.g. "SMB SaaS", "e-commerce", "professional services"
  icp_description: string;
  current_positioning: string;
  competitor_list: CompetitorSnapshot[];
  operational_signals: string[]; // free-form ops descriptions
}

export interface CompetitorSnapshot {
  name: string;
  positioning_copy: string; // scraped homepage/about text
  keywords_detected: string[];
}

/**
 * Output of the MatchEngine for a single client.
 * Ranked candidates, ready for UI presentation.
 */
export interface MatchResult {
  client_id: string;
  generated_at: string;
  candidates: MoatCandidate[];
}

export interface MoatCandidate {
  principle_id: PrincipleId;
  status: "claimed" | "claimable-aligned" | "claimable-unaligned";
  alignment_score: number; // 0..1
  unclaimed_score: number; // 0..1
  overall_score: number;   // 0..1
  rationale: string;       // Hebrew, short
  generated_claim: string; // claim_template with placeholders filled
  generated_defense: string;
  citations: PrincipleSourceRef[];
}

