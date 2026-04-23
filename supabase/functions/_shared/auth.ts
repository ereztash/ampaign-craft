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

// Validates the JWT against Supabase and returns { id, email, client }.
// Callers should return 401 on null.
export async function requireAuthedUser(req: Request): Promise<AuthedUser | null> {
  const token = extractBearerToken(req);
  if (!token) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email ?? null, supabase };
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

export async function requireAuthOrServiceRole(req: Request): Promise<AuthContext | null> {
  const token = extractBearerToken(req);
  if (!token) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  if (token === SUPABASE_SERVICE_KEY) {
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
