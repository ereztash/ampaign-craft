import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { captureUTM, getUTM } from "@/lib/analytics";
import { logger } from "@/lib/logger";

/**
 * Captures UTM params from the URL on first mount and persists them to
 * profiles.acquisition_source once the user signs up / logs in.
 *
 * Call once at app root — safe to call multiple times (idempotent).
 */
export function useUtmTracking(userId?: string | null) {
  // Capture URL params into sessionStorage on every page load.
  // captureUTM is a no-op when no UTM params are present.
  useEffect(() => {
    captureUTM(userId ?? undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once we have a userId, persist the attribution to the profile row.
  useEffect(() => {
    if (!userId) return;
    const utm = getUTM();
    if (!Object.keys(utm).length) return;

    supabase
      .from("profiles")
      .update({ acquisition_source: utm } as never)
      .eq("id", userId)
      .is("acquisition_source" as never, null) // only write once — never overwrite
      .then(({ error }) => {
        if (error) logger.warn("utm", error.message);
      });
  }, [userId]);
}
