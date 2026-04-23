// Shared error helper for Supabase Edge Functions.
//
// Auth/signature failures leak implementation details if the raw error string
// is returned to the client (e.g. "Meta API 401", "Invalid HMAC"). Use this
// helper to log the full error server-side and respond with a generic message.

export function sanitizeClientError(
  err: unknown,
  context: string,
  publicMessage: string,
  status = 400,
  extraHeaders: Record<string, string> = {},
): Response {
  console.error(`[${context}]`, err);
  return new Response(
    JSON.stringify({ error: publicMessage }),
    {
      status,
      headers: { "Content-Type": "application/json", ...extraHeaders },
    },
  );
}
