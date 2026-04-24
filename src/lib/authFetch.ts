import { supabase } from "@/integrations/supabase/client";

/** fetch wrapper that automatically injects the Supabase JWT if available. */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(input, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  });
}
