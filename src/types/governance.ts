// ═══════════════════════════════════════════════
// Data Governance Types — RBAC, Consent, Audit
// ═══════════════════════════════════════════════

export type UserRole = "owner" | "admin" | "editor" | "viewer";

export interface ConsentRecord {
  dataProcessing: boolean;
  trainingDataOptIn: boolean;
  marketingEmails: boolean;
  analytics: boolean;
  consentedAt: string;
  version: string; // consent form version (e.g. "1.0")
}

export interface AuditEntry {
  action: string;
  actor: string;      // userId
  target: string;     // what was acted on (planId, userId, etc.)
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export const DEFAULT_CONSENT: ConsentRecord = {
  dataProcessing: false,
  trainingDataOptIn: false,
  marketingEmails: false,
  analytics: false,
  consentedAt: "",
  version: "2.0",
};

// Role-based permission matrix
const ROLE_PERMISSIONS: Record<UserRole, Set<string>> = {
  owner: new Set([
    "view_health_score", "view_financials", "edit_plan", "export_data",
    "manage_team", "view_churn_risk", "delete_data", "manage_consent",
    "view_audit_log", "manage_billing",
  ]),
  admin: new Set([
    "view_health_score", "view_financials", "edit_plan", "export_data",
    "manage_team", "view_churn_risk", "view_audit_log",
  ]),
  editor: new Set([
    "view_health_score", "edit_plan", "export_data", "view_churn_risk",
  ]),
  viewer: new Set([
    "view_health_score", "view_churn_risk",
  ]),
};

export function canPerform(role: UserRole, action: string): boolean {
  return ROLE_PERMISSIONS[role]?.has(action) ?? false;
}
