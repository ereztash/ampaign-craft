import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { PricingTier, Feature, canAccess } from "@/lib/pricingTiers";
import { UserRole, canPerform as canPerformAction } from "@/types/governance";

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

interface LocalUserRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  tier: PricingTier;
  createdAt: string;
}

function getLocalUsers(): LocalUserRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || "[]");
  } catch { return []; }
}

function saveLocalUsers(users: LocalUserRecord[]) {
  typeof window !== "undefined" && localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function getLocalSession(): { userId: string; email: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setLocalSession(session: { userId: string; email: string } | null) {
  if (session) {
    typeof window !== "undefined" && localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
  } else {
    typeof window !== "undefined" && localStorage.removeItem(LOCAL_SESSION_KEY);
  }
}

// Simple hash for local storage (NOT cryptographically secure — for demo/local use only)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "funnelforge-salt-2026");
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
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

  // Initialize: try Supabase, fallback to local
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const hasSupabase = await checkSupabase();

      if (hasSupabase && !cancelled) {
        // Dynamic import to avoid hard dependency
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          setIsLocalAuth(false);

          const { data: { session: s } } = await supabase.auth.getSession();
          if (s?.user && !cancelled) {
            setUser({ id: s.user.id, email: s.user.email || "", displayName: s.user.email?.split("@")[0] || "", role: "owner" });
            // Fetch tier from profile
            const { data: profile } = await ((supabase as any).from("profiles")).select("display_name").eq("id", s.user.id).single();
            if (profile?.display_name === "pro" || profile?.display_name === "business") {
              setTierState(profile.display_name);
            }
          }

          // Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, sess) => {
            if (cancelled) return;
            if (sess?.user) {
              setUser({ id: sess.user.id, email: sess.user.email || "", displayName: sess.user.email?.split("@")[0] || "", role: "owner" });
              const { data: prof } = await ((supabase as any).from("profiles")).select("display_name").eq("id", sess.user.id).single();
              if (prof?.display_name === "pro" || prof?.display_name === "business") {
                setTierState(prof.display_name);
              }
              // Flush any buffered training pairs captured while unauthenticated
              try {
                const { flushTrainingBuffer } = await import("@/engine/trainingDataEngine");
                void flushTrainingBuffer(sess.user.id).catch(() => {});
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
        setIsLocalAuth(true);
        const session = getLocalSession();
        if (session) {
          const users = getLocalUsers();
          const found = users.find((u) => u.id === session.userId);
          if (found) {
            setUser({ id: found.id, email: found.email, displayName: found.displayName, role: "owner" });
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
          await ((supabase as any).from("profiles")).upsert({ id: newUser.id, display_name: email.split("@")[0], visit_count: 1 });
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

    return { error: null };
  }, [isLocalAuth]);

  // ═══ Sign In ═══
  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!isLocalAuth) {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        return { error: null };
      } catch (err) {
        return { error: String(err) };
      }
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
    setUser({ id: found.id, email: found.email, displayName: found.displayName, role: "owner" });
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
    <AuthContext.Provider value={{ user, loading, tier, setTier, canUse, canPerform, signUp, signIn, signOut, isLocalAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
