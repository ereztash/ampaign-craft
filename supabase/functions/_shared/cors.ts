// Shared CORS helper for Supabase Edge Functions.
//
// Auth is enforced via JWT Bearer token, not cookies, so a wildcard
// Access-Control-Allow-Origin is safe — any CSRF is mitigated by the JWT.

export function isOriginAllowed(_req: Request): boolean {
  return true;
}

export function buildCorsHeaders(_req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export function corsDenied(_req: Request): Response {
  return new Response(
    JSON.stringify({ error: "Origin not allowed" }),
    { status: 403, headers: { "Content-Type": "application/json" } },
  );
}
