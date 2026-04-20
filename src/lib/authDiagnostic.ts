// Visible auth diagnostic log. Records auth-related events to session
// storage (via safeSessionStorage) so they survive reloads, and mirrors
// failures to the central logger. Bounded ring buffer of MAX_EVENTS.

import { safeSessionStorage } from "./safeStorage";
import { logger } from "./logger";

const STORAGE_KEY = "funnelforge.auth.debug";
const MAX_EVENTS = 20;

export interface AuthEvent {
  t: number;
  phase: string;
  ok: boolean;
  message?: string;
  meta?: Record<string, unknown>;
}

export function recordAuthEvent(event: Omit<AuthEvent, "t">): void {
  const entry: AuthEvent = { t: Date.now(), ...event };
  const existing = safeSessionStorage.getJSON<AuthEvent[]>(STORAGE_KEY, []);
  const next = [...existing, entry].slice(-MAX_EVENTS);
  safeSessionStorage.setJSON(STORAGE_KEY, next);
  if (!entry.ok) {
    logger.warn(`auth.${entry.phase}`, entry.message ?? "failed");
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("funnelforge:auth-debug"));
  }
}

export function readAuthEvents(): AuthEvent[] {
  return safeSessionStorage.getJSON<AuthEvent[]>(STORAGE_KEY, []);
}

export function clearAuthEvents(): void {
  safeSessionStorage.remove(STORAGE_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("funnelforge:auth-debug"));
  }
}
