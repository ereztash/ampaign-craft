import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { AllowlistFile, AllowlistEntry } from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ALLOWLIST_PATH = path.resolve(__dirname, "..", "allowlist.json");

export function loadAllowlist(): AllowlistEntry[] {
  if (!fs.existsSync(ALLOWLIST_PATH)) return [];
  const raw = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, "utf8")) as AllowlistFile;
  if (raw.version !== 1) throw new Error("allowlist.json: unsupported version");
  return raw.entries;
}

export function validateAllowlist(entries: AllowlistEntry[]): string[] {
  const errors: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set<string>();

  for (const e of entries) {
    if (!e.claim_id) errors.push(`Entry missing claim_id: ${JSON.stringify(e)}`);
    if (!e.expected_until) errors.push(`Entry "${e.claim_id}" missing expected_until`);
    if (e.expected_until && e.expected_until < today) {
      errors.push(
        `Entry "${e.claim_id}" expired on ${e.expected_until} (today is ${today}). Fix the drift or renew the allowlist entry.`,
      );
    }
    if (seen.has(e.claim_id)) errors.push(`Duplicate allowlist entry: "${e.claim_id}"`);
    seen.add(e.claim_id);
  }
  return errors;
}

export function isAllowlisted(claimId: string, entries: AllowlistEntry[]): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return entries.some((e) => e.claim_id === claimId && e.expected_until >= today);
}
