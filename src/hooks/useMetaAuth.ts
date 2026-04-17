import { useState, useEffect, useCallback } from "react";
import { MetaAuthState, MetaAdAccount } from "@/types/meta";
import {
  buildMetaOAuthUrl,
  parseTokenFromHash,
  exchangeForLongLivedToken,
  getAdAccounts,
} from "@/services/metaApi";
import { META_ENABLED } from "@/lib/validateEnv";
import { safeSessionStorage, safeStorage } from "@/lib/safeStorage";
import { logger } from "@/lib/logger";

const STORAGE_KEY = "meta_auth";

// One-time migration from localStorage (legacy) to sessionStorage so existing
// users are transparently downgraded to a per-tab session rather than losing
// access on deploy.
let migrationAttempted = false;
function migrateLegacyStorage(): void {
  if (migrationAttempted || typeof window === "undefined") return;
  migrationAttempted = true;
  const legacy = safeStorage.getJSON<MetaAuthState | null>(STORAGE_KEY, null);
  if (legacy) {
    safeSessionStorage.setJSON(STORAGE_KEY, legacy);
    safeStorage.remove(STORAGE_KEY);
    logger.warn("useMetaAuth", "migrated meta_auth from localStorage to sessionStorage");
  }
}

const loadAuth = (): MetaAuthState | null => {
  migrateLegacyStorage();
  const auth = safeSessionStorage.getJSON<MetaAuthState | null>(STORAGE_KEY, null);
  if (!auth) return null;
  if (Date.now() > auth.expiresAt) {
    safeSessionStorage.remove(STORAGE_KEY);
    return null;
  }
  return auth;
};

const saveAuth = (auth: MetaAuthState) => {
  safeSessionStorage.setJSON(STORAGE_KEY, auth);
};

export const useMetaAuth = () => {
  const [auth, setAuth] = useState<MetaAuthState | null>(() =>
    META_ENABLED ? loadAuth() : null,
  );
  const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle OAuth redirect callback
  useEffect(() => {
    if (!META_ENABLED) return;
    const tokenData = parseTokenFromHash();
    if (!tokenData) return;

    // Clean hash from URL
    window.history.replaceState(null, "", window.location.pathname);

    const exchangeToken = async () => {
      setLoading(true);
      setError(null);
      try {
        const longLived = await exchangeForLongLivedToken(tokenData.access_token);
        const newAuth: MetaAuthState = {
          accessToken: longLived.access_token,
          userId: "me",
          expiresAt: Date.now() + longLived.expires_in * 1000,
        };
        saveAuth(newAuth);
        setAuth(newAuth);
      } catch (err) {
        logger.error("useMetaAuth.exchange", err);
        setError("שגיאה בחיבור לחשבון מטא. נסה שוב.");
      } finally {
        setLoading(false);
      }
    };

    void exchangeToken();
  }, []);

  // Load ad accounts when auth is available
  useEffect(() => {
    if (!META_ENABLED || !auth) return;
    setLoading(true);
    getAdAccounts(auth.accessToken)
      .then(setAccounts)
      .catch((e) => {
        logger.warn("useMetaAuth.getAdAccounts", e);
        setError("שגיאה בטעינת חשבונות הפרסום");
      })
      .finally(() => setLoading(false));
  }, [auth]);

  // React to "meta:reconnect-required" events dispatched by metaApi on 401/403.
  useEffect(() => {
    if (!META_ENABLED) return;
    const handler = () => {
      safeSessionStorage.remove(STORAGE_KEY);
      setAuth(null);
      setAccounts([]);
      setError("ההרשאה פגה — יש לחבר מחדש / Permission expired — please reconnect");
    };
    window.addEventListener("meta:reconnect-required", handler);
    return () => window.removeEventListener("meta:reconnect-required", handler);
  }, []);

  const connect = useCallback(() => {
    if (!META_ENABLED) return;
    window.location.href = buildMetaOAuthUrl();
  }, []);

  const disconnect = useCallback(() => {
    safeSessionStorage.remove(STORAGE_KEY);
    setAuth(null);
    setAccounts([]);
  }, []);

  return { auth, accounts, loading, error, connect, disconnect, disabled: !META_ENABLED };
};
