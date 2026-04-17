// Shared CORS helper for Supabase Edge Functions.
//
// Restricts Access-Control-Allow-Origin to an allow-list rather than "*".
// When the request's Origin is not in the list, we fall back to the first
// production origin. This keeps preflight checks working for approved
// callers while refusing CORS grants to unknown origins.
//
// In development, ALLOWED_ORIGINS can be extended via the
// ALLOWED_ORIGINS env var (comma-separated).

const DEFAULT_ALLOWED: string[] = [
  "https://funnelforge.app",
  "https://www.funnelforge.app",
  "https://funnelforge.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getAllowedOrigins(): string[] {
  const envList = Deno.env.get("ALLOWED_ORIGINS");
  if (!envList) return DEFAULT_ALLOWED;
  return envList
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isOriginAllowed(req: Request): boolean {
  const origin = req.headers.get("origin") ?? "";
  return getAllowedOrigins().includes(origin);
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  const allowed = getAllowedOrigins();
  const origin = req.headers.get("origin") ?? "";
  const resolved = allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": resolved,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function corsDenied(req: Request): Response {
  return new Response(
    JSON.stringify({ error: "Origin not allowed" }),
    {
      status: 403,
      headers: {
        ...buildCorsHeaders(req),
        "Content-Type": "application/json",
      },
    },
  );
}
