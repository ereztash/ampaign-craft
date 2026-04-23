import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { PricingTier, Feature, canAccess } from "@/lib/pricingTiers";
import { UserRole, canPerform as canPerformAction } from "@/types/governance";
import { safeStorage } from "@/lib/safeStorage";
import { logger } from "@/lib/logger";
import { ALLOW_LOCAL_AUTH } from "@/lib/validateEnv";
import { Analytics, getUTM } from "@/lib/analytics";
import { recordAuthEvent } from "@/lib/authDiagnostic";

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
  avatarUrl?: string;
  headline?: string;
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
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signInWithProvider: (provider: "google" | "github" | "facebook") => Promise<{ error: string | null }>;
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

type ProfileRecord = { display_name?: string; tier?: string; avatar_url?: string; headline?: string };
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

// Reads the user_roles row for a Supabase user. Maps DB enum (admin/user)
// to the app's UserRole. Defaults to "owner" so existing UI gates (which
// check for owner|admin) keep working for everyone — only AARRRDashboard
// and other admin-strict gates require the explicit "admin" role.
async function fetchSupabaseRole(supa: unknown, userId: string): Promise<UserRole> {
  try {
    const client = supa as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { role?: string } | null }> } } } };
    const { data } = await client.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    if (data?.role === "admin") return "admin";
  } catch { /* ignore — fall through to owner */ }
  return "owner";
}

// Blocks javascript:/data: URLs from OAuth metadata or legacy profile rows
// reaching <img src={...} />. Accepts only absolute https:// URLs.
function sanitizeAvatarUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

// Builds the AppUser from a Supabase session user, hydrating role + profile
// fields (display_name, avatar_url, headline) and seeding profile defaults
// from OAuth provider metadata (Google's full_name + avatar_url) on first login.
type SupaUser = { id: string; email?: string | null; user_metadata?: { full_name?: string; name?: string; avatar_url?: string; picture?: string } };

/**
 * Synchronous minimal AppUser derived from the session user alone.
 * Used to update UI state the moment sign-in returns, without waiting
 * on any DB query. buildSupabaseUser is still called afterwards to
 * enrich the user with role + profile data.
 */
function makeMinimalUser(su: SupaUser): AppUser {
  const meta = su.user_metadata ?? {};
  const name = meta.full_name || meta.name || su.email?.split("@")[0] || "";
  return {
    id: su.id,
    email: su.email || "",
    displayName: name,
    role: "owner",
    avatarUrl: sanitizeAvatarUrl(meta.avatar_url || meta.picture),
  };
}

async function buildSupabaseUser(supa: unknown, su: SupaUser): Promise<{ user: AppUser; tier: string | undefined }> {
  const role = await fetchSupabaseRole(supa, su.id);
  const meta = su.user_metadata ?? {};
  const oauthName = meta.full_name || meta.name;
  const oauthAvatar = sanitizeAvatarUrl(meta.avatar_url || meta.picture);

  let displayName = oauthName || su.email?.split("@")[0] || "";
  let avatarUrl: string | undefined = oauthAvatar;
  let headline: string | undefined;
  let tier: string | undefined;

  try {
    const client = supa as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: ProfileRecord | null }> } } } };
    const { data: prof } = await client.from("profiles").select("display_name,tier,avatar_url,headline").eq("id", su.id).maybeSingle();
    if (prof?.display_name) displayName = prof.display_name;
    const sanitizedProfileAvatar = sanitizeAvatarUrl(prof?.avatar_url);
    if (sanitizedProfileAvatar) avatarUrl = sanitizedProfileAvatar;
    if (prof?.headline) headline = prof.headline;
    tier = prof?.tier;

    // Seed profile from OAuth on first login when columns are empty
    const seed: Record<string, unknown> = { id: su.id };
    if (!prof?.display_name && oauthName) seed.display_name = oauthName;
    if (!sanitizedProfileAvatar && oauthAvatar) seed.avatar_url = oauthAvatar;
    if (Object.keys(seed).length > 1) {
      await profilesDb(supa).from("profiles").upsert(seed);
    }
  } catch { /* ignore */ }

  return {
    user: { id: su.id, email: su.email || "", displayName, role, avatarUrl, headline },
    tier,
  };
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
// We used to make a HEAD request to /rest/v1/ as a health check, but the
// newer sb_publishable_* key format is not accepted by that endpoint (returns
// 401), which caused the entire Supabase init path to be skipped.
// Simply checking for the URL env var is sufficient — if the URL is set the
// Supabase client will handle any actual connectivity errors at call time.
function checkSupabase(): boolean {
  return !!import.meta.env.VITE_SUPABASE_URL;
}

// ═══ Provider ═══

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tier, setTierState] = useState<PricingTier>("free");
  const [isLocalAuth, setIsLocalAuth] = useState(true);
  // Tracks the access_token of the session we're currently enriching. When
  // onAuthStateChange fires rapidly (e.g. SIGNED_IN followed by TOKEN_REFRESHED),
  // the awaited buildSupabaseUser of an earlier event can resolve AFTER a later
  // event has already updated state, overwriting fresh data with stale. We
  // gate every setUser(built.user) on this ref still matching the session.
  const latestTokenRef = useRef<string | null>(null);

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

      const hasSupabase = checkSupabase();
      recordAuthEvent({ phase: "init.start", ok: true, meta: { hasSupabase } });

      if (hasSupabase && !cancelled) {
        // Dynamic import to avoid hard dependency
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          setIsLocalAuth(false);

          const { data: { session: s } } = await supabase.auth.getSession();
          recordAuthEvent({ phase: "init.getSession", ok: true, meta: { hasSession: !!s?.user } });
          if (s?.user && !cancelled) {
            const sessionUser = s.user;
            const sessionToken = s.access_token ?? null;
            latestTokenRef.current = sessionToken;
            // Critical invariant: if a session exists we MUST set a user.
            // Set minimal user synchronously first so the UI flips, then enrich.
            setUser(makeMinimalUser(sessionUser));
            try {
              const built = await buildSupabaseUser(supabase, sessionUser);
              if (!cancelled && latestTokenRef.current === sessionToken) {
                setUser(built.user);
                if (isPricingTier(built.tier)) setTierState(built.tier);
                recordAuthEvent({ phase: "init.buildSupabaseUser", ok: true, meta: { role: built.user.role, tier: built.tier } });
              }
            } catch (err) {
              recordAuthEvent({ phase: "init.buildSupabaseUser", ok: false, message: String(err) });
              // Minimal user already set above — UI stays signed-in.
            }
          }

          // Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sess) => {
            if (cancelled) return;
            recordAuthEvent({ phase: "onAuthStateChange", ok: true, meta: { event, hasSession: !!sess?.user } });
            if (sess?.user) {
              const sessionUser = sess.user;
              const sessionToken = sess.access_token ?? null;
              latestTokenRef.current = sessionToken;
              // Same invariant: flip UI immediately via minimal user, then enrich.
              setUser(makeMinimalUser(sessionUser));
              try {
                const built = await buildSupabaseUser(supabase, sessionUser);
                // Guard: if a later event (TOKEN_REFRESHED, another SIGNED_IN)
                // bumped the token while we were awaiting, discard our result.
                if (!cancelled && latestTokenRef.current === sessionToken) {
                  setUser(built.user);
                  if (isPricingTier(built.tier)) setTierState(built.tier);
                }
              } catch (err) {
                recordAuthEvent({ phase: "onAuthStateChange.buildSupabaseUser", ok: false, message: String(err) });
              }
              // Flush any buffered training pairs captured while unauthenticated
              try {
                const { flushTrainingBuffer } = await import("@/engine/trainingDataEngine");
                void flushTrainingBuffer(sessionUser.id).catch(() => {});
              } catch { /* ignore */ }
              // Flush buffered outcome-loop events
              try {
                const { flushOutcomeBuffer } = await import("@/engine/outcomeLoopEngine");
                void flushOutcomeBuffer(sessionUser.id).catch(() => {});
              } catch { /* ignore */ }
            } else {
              latestTokenRef.current = null;
              setUser(null);
              setTierState("free");
            }
          });

          if (!cancelled) setLoading(false);
          return () => { cancelled = true; subscription.unsubscribe(); };
        } catch (err) {
          recordAuthEvent({ phase: "init.supabaseImport", ok: false, message: String(err) });
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
            "Supabase unreachable and VITE_ALLOW_LOCAL_AUTH is false. Refusing to fall back to local auth in production.",
          );
          setIsLocalAuth(false);
          setUser(null);
          setLoading(false);
          return;
        }
        if (!import.meta.env.DEV) {
          logger.warn(
            "AuthContext.bootstrap",
            "Supabase unreachable. Falling back to local auth (VITE_ALLOW_LOCAL_AUTH=true).",
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
        const { error, data } = await supabase.auth.signUp({ email, password });
        if (error) return { error: error.message };
        const newUser = data?.user ?? null;
        if (newUser) {
          await profilesDb(supabase).from("profiles").upsert({ id: newUser.id, display_name: email.split("@")[0], visit_count: 1 });
          void trackReferralSignup(newUser.id);
          // When Supabase returns a session (email confirmation disabled),
          // flip UI immediately via a minimal user, then enrich in background.
          if (data?.session) {
            setUser(makeMinimalUser(newUser));
            void (async () => {
              try {
                const built = await buildSupabaseUser(supabase, newUser);
                setUser(built.user);
                if (isPricingTier(built.tier)) setTierState(built.tier);
              } catch { /* minimal state already set */ }
            })();
          }
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
      // Do not include the submitted email in the payload. The phase is
      // enough signal; avoids client-side PII persistence.
      recordAuthEvent({ phase: "signIn.start", ok: true });
      let supabaseError: string | null = null;
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) {
          recordAuthEvent({ phase: "signIn.supabaseResult", ok: true, meta: { hasUser: !!data?.user, hasSession: !!data?.session } });
          if (data?.user) {
            // Update UI immediately with a minimal user derived from the session.
            // onAuthStateChange also fires and will refine the user further.
            setUser(makeMinimalUser(data.user));
            const supaUser = data.user;
            void (async () => {
              try {
                const built = await buildSupabaseUser(supabase, supaUser);
                setUser(built.user);
                if (isPricingTier(built.tier)) setTierState(built.tier);
                recordAuthEvent({ phase: "signIn.buildSupabaseUser", ok: true, meta: { role: built.user.role, tier: built.tier } });
              } catch (err) {
                recordAuthEvent({ phase: "signIn.buildSupabaseUser", ok: false, message: String(err) });
                // Minimal user already set — UI stays signed-in.
              }
            })();
          }
          return { error: null };
        }
        supabaseError = error.message;
        recordAuthEvent({
          phase: "signIn.supabaseResult",
          ok: false,
          message: error.message,
          meta: { status: (error as { status?: number }).status, name: error.name },
        });
      } catch (err) {
        supabaseError = String(err);
        recordAuthEvent({ phase: "signIn.exception", ok: false, message: String(err) });
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

  // ═══ Reset Password (email link) ═══
  const resetPassword = useCallback(async (email: string): Promise<{ error: string | null }> => {
    if (isLocalAuth) return { error: "Password reset requires Supabase." };
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: String(err) };
    }
  }, [isLocalAuth]);

  // ═══ OAuth / Social Sign In ═══
  const signInWithProvider = useCallback(async (provider: "google" | "github" | "facebook"): Promise<{ error: string | null }> => {
    if (isLocalAuth) return { error: "Social login requires Supabase." };
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: String(err) };
    }
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
    <AuthContext.Provider value={{ user, loading, tier, setTier, refreshTier, canUse, canPerform, signUp, signIn, signOut, resetPassword, signInWithProvider, isLocalAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
