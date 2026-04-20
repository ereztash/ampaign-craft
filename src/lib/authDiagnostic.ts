// Visible auth diagnostic log.
//
// Dual purpose:
//  1. Always mirror auth failures to the central logger (Sentry) so we
//     get signal on prod errors. Failure events never include PII.
//  2. When a debug flag is explicitly set (?debug=auth or
//     "ff.debug.auth"=1 via safeStorage), ALSO persist a short ring
//     buffer of events to session storage for the AuthDebugPanel to
//     render. Without the flag, no events are stored in the browser
//     and no PII is collected client-side.
//
// safeSessionStorage is loaded lazily via dynamic import so tests that
// mock @/lib/safeStorage without exporting safeSessionStorage (the vast
// majority of existing tests) are not broken by importing this module.

import { safeStorage } from "./safeStorage";
import { logger } from "./logger";

const STORAGE_KEY = "funnelforge.auth.debug";
const ENABLE_KEY = "ff.debug.auth";
const MAX_EVENTS = 20;

export interface AuthEvent {
  t: number;
  phase: string;
  ok: boolean;
  message?: string;
  meta?: Record<string, unknown>;
}

type SessionStore = typeof import("./safeStorage").safeSessionStorage;

async function loadSessionStore(): Promise<SessionStore | null> {
  try {
    const mod = await import("./safeStorage");
    return mod.safeSessionStorage ?? null;
  } catch {
    return null;
  }
}

function isDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("debug") === "auth") {
      safeStorage.setString(ENABLE_KEY, "1");
      return true;
    }
    return safeStorage.getString(ENABLE_KEY) === "1";
  } catch {
    return false;
  }
}

export function recordAuthEvent(event: Omit<AuthEvent, "t">): void {
  // Always surface real failures to Sentry via the central logger.
  // Phase + message only. No email / IDs / tokens.
  if (!event.ok) {
    logger.warn(`auth.${event.phase}`, event.message ?? "failed");
  }

  // Panel-visible ring buffer is opt-in only.
  if (!isDebugEnabled()) return;

  void (async () => {
    const store = await loadSessionStore();
    if (!store) return;
    try {
      const entry: AuthEvent = { t: Date.now(), ...event };
      const existing = store.getJSON<AuthEvent[]>(STORAGE_KEY, []);
      const next = [...existing, entry].slice(-MAX_EVENTS);
      store.setJSON(STORAGE_KEY, next);
      window.dispatchEvent(new CustomEvent("funnelforge:auth-debug"));
    } catch {
      // storage unavailable (Safari private mode, etc.) - skip.
    }
  })();
}

export async function readAuthEvents(): Promise<AuthEvent[]> {
  const store = await loadSessionStore();
  if (!store) return [];
  try {
    return store.getJSON<AuthEvent[]>(STORAGE_KEY, []);
  } catch {
    return [];
  }
}

export async function clearAuthEvents(): Promise<void> {
  const store = await loadSessionStore();
  if (!store) return;
  try {
    store.remove(STORAGE_KEY);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("funnelforge:auth-debug"));
    }
  } catch {
    // ignore
  }
}
