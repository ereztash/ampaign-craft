import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { PricingTier, Feature, canAccess } from "@/lib/pricingTiers";
import { UserRole, canPerform as canPerformAction } from "@/types/governance";
import { safeStorage } from "@/lib/safeStorage";
import { logger } from "@/lib/logger";
import { ALLOW_LOCAL_AUTH } from "@/lib/validateEnv";
import { Analytics, getUTM } from "@/lib/analytics";

// Fire signup_from_share if the user arrived via a referral link (?ref=CODE)
async function trackReferralSignup(userId: string): Promise<void> {
  const utm = getUTM();
  if (utm.ref) {
    await Analytics.signupFromShare(utm.ref, userId);
  }
}

// ═══════════════════════════════════════════════
// Auth Context — Dual mode: Supabase (if available) or Local fallback
// ═══════════════════════════════════════════════

// Minimal user type that works with or without Supabase
interface AppUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  tier: PricingTier;
  setTier: (tier: PricingTier) => void;
  /** Re-read tier from the database (Supabase mode). No-op in local auth. */
  refreshTier: () => Promise<void>;
  canUse: (feature: Feature) => boolean;
  canPerform: (action: string) => boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isLocalAuth: boolean; // true = local fallback, false = Supabase
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ═══ Local Auth Helpers (localStorage-based) ═══

const LOCAL_USERS_KEY = "funnelforge-users";
const LOCAL_SESSION_KEY = "funnelforge-session";
const LOCAL_AUTH_VERSION_KEY = "funnelforge-auth-version";
const CURRENT_AUTH_VERSION = "v2"; // v2 = PBKDF2 (replaces v1 SHA-256)

interface LocalUserRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  tier: PricingTier;
  role?: UserRole;
  createdAt: string;
}

function getLocalUsers(): LocalUserRecord[] {
  if (typeof window === "undefined") return [];
  return safeStorage.getJSON<LocalUserRecord[]>(LOCAL_USERS_KEY, []);
}

function saveLocalUsers(users: LocalUserRecord[]) {
  if (typeof window === "undefined") return;
  safeStorage.setJSON(LOCAL_USERS_KEY, users);
}

function getLocalSession(): { userId: string; email: string } | null {
  if (typeof window === "undefined") return null;
  return safeStorage.getJSON<{ userId: string; email: string } | null>(LOCAL_SESSION_KEY, null);
}

function setLocalSession(session: { userId: string; email: string } | null) {
  if (typeof window === "undefined") return;
  if (session) {
    safeStorage.setJSON(LOCAL_SESSION_KEY, session);
  } else {
    safeStorage.remove(LOCAL_SESSION_KEY);
  }
}

// PBKDF2 password hashing via Web Crypto API (100k iterations).
// For local/offline fallback only — Supabase handles production auth.
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const salt = encoder.encode("funnelforge-2026-local-pbkdf2");
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100_000 },
    keyMaterial,
    256,
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Migrate local auth storage to current version.
// On version mismatch (e.g. SHA-256 → PBKDF2), clear stored users so the
// admin seed is re-created with the new hash algorithm.
function migrateLocalAuthIfNeeded() {
  if (typeof window === "undefined") return;
  const stored = safeStorage.getJSON<string>(LOCAL_AUTH_VERSION_KEY, "v1");
  if (stored !== CURRENT_AUTH_VERSION) {
    safeStorage.remove(LOCAL_USERS_KEY);
    safeStorage.remove(LOCAL_SESSION_KEY);
    safeStorage.setJSON(LOCAL_AUTH_VERSION_KEY, CURRENT_AUTH_VERSION);
  }
}

// ═══ Typed Supabase profiles accessor ═══
// The generated client doesn't have runtime types for custom tables,
// so we wrap with a minimal typed interface instead of using `as any`.

type ProfileRecord = { display_name?: string; tier?: string };
type ProfilesClient = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        single: () => Promise<{ data: ProfileRecord | null; error: unknown }>;
      };
    };
    upsert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
  };
};
function profilesDb(supa: unknown): ProfilesClient {
  return supa as ProfilesClient;
}

function isPricingTier(value: unknown): value is PricingTier {
  return value === "free" || value === "pro" || value === "business";
}

// ═══ Admin seed ═══
// Seeds the built-in admin account on first load. ONLY in development —
// guarded so the seed never lands in a real user's browser if a production
// Supabase outage flips them into local-auth mode.
// Plain-text password is never stored — only the PBKDF2-derived hash.

const ADMIN_SEED_ID = "admin-erez-seed";

async function seedAdminUser() {
  if (!import.meta.env.DEV) return; // never seed in production builds
  const users = getLocalUsers();
  if (users.some((u) => u.id === ADMIN_SEED_ID)) return; // already seeded
  const hash = await hashPassword("10031999");
  const adminUser: LocalUserRecord = {
    id: ADMIN_SEED_ID,
    email: "erez",
    displayName: "ארז",
    passwordHash: hash,
    tier: "pro",
    role: "admin",
    createdAt: new Date().toISOString(),
  };
  users.push(adminUser);
  saveLocalUsers(users);
}

// ═══ Supabase availability check ═══

let supabaseAvailable: boolean | null = null;

async function checkSupabase(): Promise<boolean> {
  if (supabaseAvailable !== null) return supabaseAvailable;
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (!url) { supabaseAvailable = false; return false; }
    const resp = await fetch(`${url}/rest/v1/`, {
      method: "HEAD",
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "" },
      signal: AbortSignal.timeout(3000),
    });
    supabaseAvailable = resp.ok;
  } catch {
    supabaseAvailable = false;
  }
  return supabaseAvailable;
}

// ═══ Provider ═══

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tier, setTierState] = useState<PricingTier>("free");
  const [isLocalAuth, setIsLocalAuth] = useState(true);

  const canUse = useCallback((feature: Feature) => canAccess(tier, feature), [tier]);
  const canPerform = useCallback((action: string) => canPerformAction(user?.role ?? "viewer", action), [user?.role]);

  const setTier = useCallback((newTier: PricingTier) => {
    setTierState(newTier);
    // Persist tier for local users
    if (user) {
      const users = getLocalUsers();
      const updated = users.map((u) => u.id === user.id ? { ...u, tier: newTier } : u);
      saveLocalUsers(updated);
    }
  }, [user]);

  // Re-read tier from the profiles table. Used after returning from Stripe
  // checkout so the UI reflects the webhook-applied tier without a reload.
  const refreshTier = useCallback(async () => {
    if (!user || isLocalAuth) return;
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await profilesDb(supabase).from("profiles").select("tier").eq("id", user.id).single();
      if (isPricingTier(data?.tier)) setTierState(data.tier);
    } catch { /* ignore — tier stays as last known */ }
  }, [user, isLocalAuth]);

  // Initialize: try Supabase, fallback to local
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // DEV-only: always seed the local admin account and check for a persisted
      // local session BEFORE talking to Supabase. This lets the owner sign in
      // with the local admin credentials (erez / 10031999) even when Supabase
      // is reachable — so the admin panel is always accessible in development.
      if (import.meta.env.DEV && ALLOW_LOCAL_AUTH) {
        migrateLocalAuthIfNeeded();
        await seedAdminUser();
        const localSession = getLocalSession();
        if (localSession) {
          const localUsers = getLocalUsers();
          const localFound = localUsers.find((u) => u.id === localSession.userId);
          if (localFound) {
            setIsLocalAuth(true);
            setUser({ id: localFound.id, email: localFound.email, displayName: localFound.displayName, role: localFound.role ?? "owner" });
            setTierState(localFound.tier);
            if (!cancelled) setLoading(false);
            return;
          }
        }
      }

      const hasSupabase = await checkSupabase();

      if (hasSupabase && !cancelled) {
        // Dynamic import to avoid hard dependency
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          setIsLocalAuth(false);

          const { data: { session: s } } = await supabase.auth.getSession();
          if (s?.user && !cancelled) {
            setUser({ id: s.user.id, email: s.user.email || "", displayName: s.user.email?.split("@")[0] || "", role: "owner" });
            // Fetch tier from the dedicated tier column. The Stripe webhook
            // writes to this column on checkout.session.completed.
            const { data: profile } = await profilesDb(supabase).from("profiles").select("tier").eq("id", s.user.id).single();
            if (isPricingTier(profile?.tier)) {
              setTierState(profile.tier);
            }
          }

          // Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, sess) => {
            if (cancelled) return;
            if (sess?.user) {
              setUser({ id: sess.user.id, email: sess.user.email || "", displayName: sess.user.email?.split("@")[0] || "", role: "owner" });
              const { data: prof } = await profilesDb(supabase).from("profiles").select("tier").eq("id", sess.user.id).single();
              if (isPricingTier(prof?.tier)) {
                setTierState(prof.tier);
              }
              // Flush any buffered training pairs captured while unauthenticated
              try {
                const { flushTrainingBuffer } = await import("@/engine/trainingDataEngine");
                void flushTrainingBuffer(sess.user.id).catch(() => {});
              } catch { /* ignore */ }
              // Flush buffered outcome-loop events
              try {
                const { flushOutcomeBuffer } = await import("@/engine/outcomeLoopEngine");
                void flushOutcomeBuffer(sess.user.id).catch(() => {});
              } catch { /* ignore */ }
            } else {
              setUser(null);
              setTierState("free");
            }
          });

          if (!cancelled) setLoading(false);
          return () => { cancelled = true; subscription.unsubscribe(); };
        } catch {
          // Supabase import failed, fall through to local
        }
      }

      // Local auth fallback
      if (!cancelled) {
        if (!ALLOW_LOCAL_AUTH) {
          // Production with Supabase down: don't silently flip the user into
          // a fresh local account. Surface the failure so they can retry.
          logger.error(
            "AuthContext.bootstrap",
            "Supabase unreachable and VITE_ALLOW_LOCAL_AUTH is false — refusing to fall back to local auth in production.",
          );
          setIsLocalAuth(false);
          setUser(null);
          setLoading(false);
          return;
        }
        if (!import.meta.env.DEV) {
          logger.warn(
            "AuthContext.bootstrap",
            "Supabase unreachable — falling back to local auth (VITE_ALLOW_LOCAL_AUTH=true).",
          );
        }
        setIsLocalAuth(true);
        migrateLocalAuthIfNeeded();
        await seedAdminUser();
        const session = getLocalSession();
        if (session) {
          const users = getLocalUsers();
          const found = users.find((u) => u.id === session.userId);
          if (found) {
            setUser({ id: found.id, email: found.email, displayName: found.displayName, role: found.role ?? "owner" });
            setTierState(found.tier);
          }
        }
        setLoading(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

  // ═══ Sign Up ═══
  const signUp = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!isLocalAuth) {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) return { error: error.message };
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          await profilesDb(supabase).from("profiles").upsert({ id: newUser.id, display_name: email.split("@")[0], visit_count: 1 });
          void trackReferralSignup(newUser.id);
        }
        return { error: null };
      } catch (err) {
        return { error: String(err) };
      }
    }

    // Local sign up
    const users = getLocalUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { error: "Email already registered" };
    }

    const hash = await hashPassword(password);
    const newUser: LocalUserRecord = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      displayName: email.split("@")[0],
      passwordHash: hash,
      tier: "pro", // Local users get Pro by default (for testing)
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveLocalUsers(users);
    setLocalSession({ userId: newUser.id, email: newUser.email });
    setUser({ id: newUser.id, email: newUser.email, displayName: newUser.displayName, role: "owner" });
    setTierState(newUser.tier);
    void trackReferralSignup(newUser.id);

    return { error: null };
  }, [isLocalAuth]);

  // ═══ Sign In ═══
  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!isLocalAuth) {
      let supabaseError: string | null = null;
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) return { error: null };
        supabaseError = error.message;
      } catch (err) {
        supabaseError = String(err);
      }

      // DEV fallback: if Supabase auth failed, try the local user store.
      // This lets the local admin account (erez / 10031999) work even when
      // Supabase is reachable and doesn't know about this user.
      if (import.meta.env.DEV && ALLOW_LOCAL_AUTH) {
        const localUsers = getLocalUsers();
        const localFound = localUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (localFound) {
          const hash = await hashPassword(password);
          if (localFound.passwordHash === hash) {
            setLocalSession({ userId: localFound.id, email: localFound.email });
            setIsLocalAuth(true);
            setUser({ id: localFound.id, email: localFound.email, displayName: localFound.displayName, role: localFound.role ?? "owner" });
            setTierState(localFound.tier);
            return { error: null };
          }
        }
      }

      return { error: supabaseError };
    }

    // Local sign in
    const users = getLocalUsers();
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!found) {
      return { error: "User not found" };
    }

    const hash = await hashPassword(password);
    if (found.passwordHash !== hash) {
      return { error: "Invalid password" };
    }

    setLocalSession({ userId: found.id, email: found.email });
    setUser({ id: found.id, email: found.email, displayName: found.displayName, role: found.role ?? "owner" });
    setTierState(found.tier);

    return { error: null };
  }, [isLocalAuth]);

  // ═══ Sign Out ═══
  const signOut = useCallback(async () => {
    if (!isLocalAuth) {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        await supabase.auth.signOut();
      } catch { /* ignore */ }
    }
    setLocalSession(null);
    setUser(null);
    setTierState("free");
  }, [isLocalAuth]);

  return (
    <AuthContext.Provider value={{ user, loading, tier, setTier, refreshTier, canUse, canPerform, signUp, signIn, signOut, isLocalAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
