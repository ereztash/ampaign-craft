// ═══════════════════════════════════════════════
// Audit Log — Ring buffer in localStorage, optional Supabase flush
// Tracks sensitive operations for compliance.
// ═══════════════════════════════════════════════

import type { AuditEntry } from "@/types/governance";
import { safeStorage } from "@/lib/safeStorage";

const STORAGE_KEY = "funnelforge-audit-log";
const MAX_ENTRIES = 500;

function getEntries(): AuditEntry[] {
  return safeStorage.getJSON<AuditEntry[]>(STORAGE_KEY, []);
}

function saveEntries(entries: AuditEntry[]): void {
  safeStorage.setJSON(STORAGE_KEY, entries);
}

/**
 * Append an audit entry. Oldest entries are dropped when the buffer exceeds MAX_ENTRIES.
 */
export function logAudit(entry: AuditEntry): void {
  const entries = getEntries();
  entries.push({
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString(),
  });

  // Ring buffer: drop oldest when over limit
  const trimmed = entries.length > MAX_ENTRIES ? entries.slice(-MAX_ENTRIES) : entries;
  saveEntries(trimmed);
}

/**
 * Read all audit entries (newest last).
 */
export function getAuditLog(): AuditEntry[] {
  return getEntries();
}

/**
 * Clear the audit log.
 */
export function clearAuditLog(): void {
  safeStorage.remove(STORAGE_KEY);
}

/**
 * Convenience: log a plan creation event.
 */
export function auditPlanCreated(userId: string, planId: string): void {
  logAudit({ action: "plan_created", actor: userId, target: planId, timestamp: new Date().toISOString() });
}

/**
 * Convenience: log a data export event.
 */
export function auditDataExported(userId: string): void {
  logAudit({ action: "data_exported", actor: userId, target: "all_data", timestamp: new Date().toISOString() });
}

/**
 * Convenience: log a consent change event.
 */
export function auditConsentChanged(userId: string, consentType: string, value: boolean): void {
  logAudit({
    action: "consent_changed",
    actor: userId,
    target: consentType,
    timestamp: new Date().toISOString(),
    metadata: { value },
  });
}

/**
 * Convenience: log a data deletion event.
 */
export function auditDataDeleted(userId: string): void {
  logAudit({ action: "data_deleted", actor: userId, target: "all_data", timestamp: new Date().toISOString() });
}
