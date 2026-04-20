import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { readAuthEvents, clearAuthEvents, type AuthEvent } from "@/lib/authDiagnostic";
import { safeStorage, safeSessionStorage } from "@/lib/safeStorage";

// Visible on-screen auth diagnostic panel. Toggled via either:
//   - URL flag: ?debug=auth
//   - persisted flag: set "ff.debug.auth"=1 via safeStorage
// so we can turn it on in production without redeploying.

const ENABLE_KEY = "ff.debug.auth";
const DISMISS_KEY = "ff.debug.auth.dismissed";
const SUPA_TOKEN_PREFIX = "sb-";

function isEnabled(): boolean {
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

function findSupabaseSessionKey(): string | null {
  const keys = safeStorage.keysWithPrefix(SUPA_TOKEN_PREFIX);
  const match = keys.find((k) => k.endsWith("-auth-token"));
  return match ?? null;
}

function shortTime(t: number): string {
  const d = new Date(t);
  return d.toLocaleTimeString(undefined, { hour12: false });
}

export default function AuthDebugPanel() {
  const { user, loading, tier, isLocalAuth } = useAuth();
  const [enabled, setEnabled] = useState<boolean>(() => isEnabled());
  const [dismissed, setDismissed] = useState<boolean>(
    () => safeSessionStorage.getJSON<string>(DISMISS_KEY, "") === "1",
  );
  const [events, setEvents] = useState<AuthEvent[]>([]);
  const [sessionKey, setSessionKey] = useState<string | null>(() => findSupabaseSessionKey());

  useEffect(() => {
    setEvents(readAuthEvents());
    setSessionKey(findSupabaseSessionKey());
    const onUpdate = () => {
      setEvents(readAuthEvents());
      setSessionKey(findSupabaseSessionKey());
    };
    window.addEventListener("funnelforge:auth-debug", onUpdate);
    const interval = setInterval(() => setSessionKey(findSupabaseSessionKey()), 2000);
    return () => {
      window.removeEventListener("funnelforge:auth-debug", onUpdate);
      clearInterval(interval);
    };
  }, []);

  if (!enabled || dismissed) {
    if (enabled && dismissed) {
      return (
        <button
          onClick={() => {
            safeSessionStorage.remove(DISMISS_KEY);
            setDismissed(false);
          }}
          className="fixed bottom-2 right-2 z-[9999] bg-amber-500 text-white text-xs font-mono px-2 py-1 rounded shadow-lg opacity-70 hover:opacity-100"
        >
          AUTH
        </button>
      );
    }
    return null;
  }

  const last5 = events.slice(-5).reverse();

  const snapshot = {
    user: user ? { id: user.id, email: user.email, role: user.role, displayName: user.displayName } : null,
    loading,
    tier,
    isLocalAuth,
    sessionKey,
    events,
  };

  return (
    <div className="fixed bottom-2 right-2 z-[9999] w-[360px] max-w-[95vw] rounded-lg border border-amber-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xl text-xs font-mono">
      <div className="flex items-center justify-between px-2 py-1 bg-amber-500 text-white rounded-t-lg">
        <span className="font-bold">AUTH DEBUG</span>
        <div className="flex gap-1">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(JSON.stringify(snapshot, null, 2)).catch(() => {});
            }}
            className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded"
            title="Copy full diagnostics to clipboard"
          >
            copy
          </button>
          <button
            onClick={() => { clearAuthEvents(); setEvents([]); }}
            className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded"
            title="Clear event log"
          >
            clear
          </button>
          <button
            onClick={() => {
              safeStorage.remove(ENABLE_KEY);
              setEnabled(false);
            }}
            className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded"
            title="Turn off panel (removes ff.debug.auth)"
          >
            off
          </button>
          <button
            onClick={() => {
              safeSessionStorage.setJSON(DISMISS_KEY, "1");
              setDismissed(true);
            }}
            className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded"
            title="Hide panel for this session"
          >
            hide
          </button>
        </div>
      </div>
      <div className="p-2 space-y-1">
        <Row label="user">{user ? `${user.email} (${user.role})` : "null"}</Row>
        <Row label="loading">{String(loading)}</Row>
        <Row label="isLocalAuth">{String(isLocalAuth)}</Row>
        <Row label="tier">{tier}</Row>
        <Row label="session">{sessionKey ? "present" : "missing"}</Row>
      </div>
      <div className="border-t border-zinc-200 dark:border-zinc-700 p-2">
        <div className="text-[10px] uppercase text-zinc-500 mb-1">last events</div>
        {last5.length === 0 ? (
          <div className="text-zinc-400">none</div>
        ) : (
          <ul className="space-y-0.5">
            {last5.map((e, i) => (
              <li key={i} className={e.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                <span className="text-zinc-400">{shortTime(e.t)}</span> {e.ok ? "ok" : "FAIL"} {e.phase}
                {e.message ? <span className="text-zinc-500"> | {e.message}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="text-zinc-500 w-20 shrink-0">{label}</span>
      <span className="flex-1 break-all">{children}</span>
    </div>
  );
}
