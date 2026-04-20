// Visible auth diagnostic log. Records auth-related events to sessionStorage
// so they survive reloads, and mirrors them to console for DevTools users.
// Keeps only the last MAX_EVENTS entries so the ring buffer never grows.

import { safeSessionStorage } from "./safeStorage";

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
  const prefix = `[AUTH] ${entry.phase} ${entry.ok ? "ok" : "FAIL"}`;
  if (entry.ok) {
    // eslint-disable-next-line no-console
    console.info(prefix, entry.message ?? "", entry.meta ?? "");
  } else {
    // eslint-disable-next-line no-console
    console.warn(prefix, entry.message ?? "", entry.meta ?? "");
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
