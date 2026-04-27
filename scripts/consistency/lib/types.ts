// ═══════════════════════════════════════════════
// Consistency Audit — Shared Types
// ═══════════════════════════════════════════════

export type Severity = "blocker" | "warn";
export type ViolationType =
  | "value_mismatch"
  | "pattern_not_found"
  | "ambiguous_pattern"
  | "unknown_token"
  | "missing_token"
  | "unverifiable"
  | "schema_violation";

// ── Numeric ──────────────────────────────────────

export interface ClaimAppearance {
  file: string;
  pattern: RegExp;
  groupIndex: number;
  context: string;
  minOnly?: boolean; // pass if actual >= claimed (for "275+" style claims)
}

export interface NumericClaim {
  id: string;
  description: string;
  sot: () => number | Promise<number>;
  appearances: ClaimAppearance[];
  tolerance?: number; // absolute delta allowed, default 0
  severity: Severity;
}

// ── Identity ─────────────────────────────────────

export interface ConsumerScan {
  label: string;
  files: string; // glob or dir path
  pattern: RegExp;
  groupIndex: number;
  requiresFullCoverage?: boolean; // flag missing tokens too
}

export interface IdentityClaim {
  id: string;
  description: string;
  canonicalFile: string;
  canonicalExtractor: () => Promise<readonly string[]>;
  consumerScans: ConsumerScan[];
  severity: Severity;
}

// ── Schema ────────────────────────────────────────

export interface SchemaViolation {
  file: string;
  line?: number;
  message: string;
  fixHint?: string;
}

export interface SchemaClaim {
  id: string;
  description: string;
  validate: () => Promise<SchemaViolation[]>;
  severity: Severity;
}

// ── Report ────────────────────────────────────────

export interface NumericViolation {
  claimId: string;
  type: ViolationType;
  file: string;
  expected: number;
  actual: number | null;
  context: string;
  severity: Severity;
  suggestedFix: string;
}

export interface IdentityViolation {
  claimId: string;
  type: ViolationType;
  scanLabel: string;
  file: string;
  line?: number;
  token: string;
  canonical?: readonly string[];
  context: string;
  severity: Severity;
}

export interface ReportSummary {
  checked: number;
  passed: number;
  violations: number;
  allowlisted: number;
  blockers: number;
}

// ── Allowlist ─────────────────────────────────────

export interface AllowlistEntry {
  claim_id: string;
  reason: string;
  expected_until: string; // ISO date
  owner: string;
}

export interface AllowlistFile {
  version: number;
  entries: AllowlistEntry[];
}
