import { useState, useEffect, useCallback } from "react";
import { MetaAuthState, MetaAdAccount, MetaMonitorState } from "@/types/meta";
import {
  buildMetaOAuthUrl,
  parseTokenFromHash,
  exchangeForLongLivedToken,
  getAdAccounts,
} from "@/services/metaApi";

const STORAGE_KEY = "meta_auth";

const loadAuth = (): MetaAuthState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const auth: MetaAuthState = JSON.parse(raw);
    if (Date.now() > auth.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return auth;
  } catch {
    return null;
  }
};

const saveAuth = (auth: MetaAuthState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
};

export const useMetaAuth = () => {
  const [auth, setAuth] = useState<MetaAuthState | null>(loadAuth);
  const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle OAuth redirect callback
  useEffect(() => {
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
        setError("שגיאה בחיבור לחשבון מטא. נסה שוב.");
      } finally {
        setLoading(false);
      }
    };

    exchangeToken();
  }, []);

  // Load ad accounts when auth is available
  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    getAdAccounts(auth.accessToken)
      .then(setAccounts)
      .catch(() => setError("שגיאה בטעינת חשבונות הפרסום"))
      .finally(() => setLoading(false));
  }, [auth]);

  const connect = useCallback(() => {
    window.location.href = buildMetaOAuthUrl();
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
    setAccounts([]);
  }, []);

  return { auth, accounts, loading, error, connect, disconnect };
};
