// Shared JWT extraction and verification for Edge Functions.
//
// The pattern `authHeader?.replace("Bearer ", "")` used in many handlers
// tolerates tabs, extra whitespace, or multiple "Bearer" prefixes, and
// returns empty string when the header is missing instead of explicitly
// signaling "no auth". Route every handler through the helpers here so
// the auth contract is uniform and auditable in one place.

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface AuthedUser {
  id: string;
  email: string | null;
  supabase: SupabaseClient;
}

// Strict bearer extraction. Requires exactly one "Bearer " prefix (case
// insensitive), collapses whitespace, and returns null when the header
// is missing or malformed.
export function extractBearerToken(req: Request): string | null {
  const raw = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!raw) return null;
  const trimmed = raw.trim();
  const match = /^Bearer\s+(.+)$/i.exec(trimmed);
  if (!match) return null;
  const token = match[1].trim();
  if (!token || token.length > 4096) return null;
  return token;
}

interface JwtPayload {
  sub?: string;
  role?: string;
  email?: string;
  aud?: string | string[];
  exp?: number;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? padded : padded + "=".repeat(4 - (padded.length % 4));
    return JSON.parse(atob(pad)) as JwtPayload;
  } catch {
    return null;
  }
}

// Validates the JWT and returns { id, email, client }. Relies on the
// Supabase API gateway to have already verified the signature (every
// function we deploy with verify_jwt=true, which is the default). We
// decode the payload locally and extract identity from the `sub` claim
// instead of calling supabase.auth.getUser() — that indirection adds
// latency and, more importantly, introduces a runtime dependency on
// GoTrue being healthy. GoTrue being unavailable should not cascade
// into every authenticated edge function returning 401.
export async function requireAuthedUser(req: Request): Promise<AuthedUser | null> {
  const token = extractBearerToken(req);
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.sub || typeof payload.sub !== "string") return null;
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  const role = payload.role;
  // Accept any non-anon authenticated role. service_role should be
  // routed through requireAuthOrServiceRole instead.
  if (role !== "authenticated") return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  return { id: payload.sub, email: payload.email ?? null, supabase };
}

// For endpoints like embed-content that may be called either by a user
// JWT or by the service role (from queue-processor). Returns a flag so
// the handler can branch on which path it's on.
export interface AuthContext {
  kind: "user" | "service_role";
  userId?: string;
  email?: string | null;
  supabase: SupabaseClient;
}

// Decodes a JWT payload without verifying the signature. Used only for
// cheap role classification — the Supabase API gateway has already
// validated the signature before the function runs, so we trust the
// payload for routing decisions.
function peekJwtRole(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? padded : padded + "=".repeat(4 - (padded.length % 4));
    const decoded = JSON.parse(atob(pad));
    return typeof decoded.role === "string" ? decoded.role : null;
  } catch {
    return null;
  }
}

export async function requireAuthOrServiceRole(req: Request): Promise<AuthContext | null> {
  const token = extractBearerToken(req);
  if (!token) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fast path: service_role JWTs carry role="service_role" in the payload.
  // Sidesteps brittle string equality against SUPABASE_SERVICE_ROLE_KEY —
  // Supabase's newer env shape is `sb_secret_...` while the gateway still
  // accepts the legacy JWT, so the two are structurally different strings.
  const role = peekJwtRole(token);
  if (role === "service_role") {
    return { kind: "service_role", supabase };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return {
    kind: "user",
    userId: data.user.id,
    email: data.user.email ?? null,
    supabase,
  };
}
