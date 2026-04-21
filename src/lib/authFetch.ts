import { supabase } from "@/integrations/supabase/client";

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 500;

/**
 * Decide whether a fetch attempt is worth retrying.
 * Retry only on transient failures: network throws, 5xx (except 501 Not Implemented).
 * Do NOT retry 4xx — those are client-side (auth, bad request, rate limit) and
 * should surface the structured {error, code, hint} payload immediately.
 */
function shouldRetryResponse(status: number): boolean {
  return status >= 500 && status !== 501;
}

/** fetch wrapper that automatically injects the Supabase JWT if available,
 * with exponential-backoff retry on transient 5xx / network errors. */
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const authorizedInit: RequestInit = {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  };

  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, authorizedInit);
      if (!shouldRetryResponse(res.status) || attempt === MAX_RETRIES) {
        return res;
      }
      lastResponse = res;
    } catch (err) {
      lastError = err;
      if (attempt === MAX_RETRIES) break;
    }

    const delay = BASE_DELAY_MS * Math.pow(2, attempt);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  // All retries exhausted. Return the last 5xx Response if any (preserves
  // structured error body), otherwise rethrow the network error.
  if (lastResponse) return lastResponse;
  throw lastError;
}
