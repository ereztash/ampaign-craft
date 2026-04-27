import { MetaAdAccount, MetaInsights } from "@/types/meta";
import {
  metaAdAccountListSchema,
  metaErrorSchema,
  metaInsightsListSchema,
  metaTokenExchangeSchema,
} from "@/schemas/metaApi";
import { logger } from "@/lib/logger";
import { safeSessionStorage } from "@/lib/safeStorage";

const GRAPH_URL = "https://graph.facebook.com/v19.0";

export class MetaAuthExpiredError extends Error {
  constructor(msg = "Meta auth expired") {
    super(msg);
    this.name = "MetaAuthExpiredError";
  }
}

function dispatchReconnectRequired(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("meta:reconnect-required"));
  }
}

async function fetchJson(url: string, init?: RequestInit, attempt = 0): Promise<unknown> {
  const res = await fetch(url, init);
  if (res.status === 401 || res.status === 403) {
    dispatchReconnectRequired();
    throw new MetaAuthExpiredError();
  }
  if (res.status === 429 && attempt < 3) {
    const wait = Math.pow(2, attempt) * 1000;
    await new Promise((r) => setTimeout(r, wait));
    return fetchJson(url, init, attempt + 1);
  }

  const body = await res.json().catch(() => ({}));
  const asError = metaErrorSchema.safeParse(body);
  if (asError.success) {
    logger.warn("metaApi.errorPayload", asError.data.error);
    throw new Error(asError.data.error.message);
  }
  if (!res.ok) {
    throw new Error(`Meta API ${res.status}`);
  }
  return body;
}

export const getAdAccounts = async (token: string): Promise<MetaAdAccount[]> => {
  const url = `${GRAPH_URL}/me/adaccounts?fields=id,name,currency,account_status&access_token=${token}`;
  const raw = await fetchJson(url);
  const parsed = metaAdAccountListSchema.safeParse(raw);
  if (!parsed.success) {
    logger.error("metaApi.getAdAccounts.parse", parsed.error);
    return [];
  }
  return parsed.data.data as MetaAdAccount[];
};

export const getCampaignInsights = async (
  accountId: string,
  token: string,
  datePreset: "last_7d" | "last_14d" | "last_30d" = "last_7d"
): Promise<MetaInsights | null> => {
  const fields = [
    "spend",
    "impressions",
    "clicks",
    "cpc",
    "cpm",
    "ctr",
    "reach",
    "actions",
    "cost_per_action_type",
  ].join(",");

  const url = `${GRAPH_URL}/${accountId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${token}`;
  const raw = await fetchJson(url);
  const parsed = metaInsightsListSchema.safeParse(raw);
  if (!parsed.success) {
    logger.error("metaApi.getCampaignInsights.parse", parsed.error);
    return null;
  }
  return (parsed.data.data?.[0] as unknown as MetaInsights) ?? null;
};

export const exchangeForLongLivedToken = async (
  shortLivedToken: string
): Promise<{ access_token: string; expires_in: number }> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(`${supabaseUrl}/functions/v1/meta-token-exchange`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ shortLivedToken }),
  });
  const data = await res.json().catch(() => ({}));
  const asError = metaErrorSchema.safeParse(data);
  if (asError.success) throw new Error(asError.data.error.message);
  if ((data as { error?: string }).error) throw new Error(String((data as { error?: string }).error));
  const parsed = metaTokenExchangeSchema.safeParse(data);
  if (!parsed.success) {
    logger.error("metaApi.exchangeForLongLivedToken.parse", parsed.error);
    throw new Error("Invalid Meta token response");
  }
  return { access_token: parsed.data.access_token, expires_in: parsed.data.expires_in };
};

// Key used to persist the CSRF state across the OAuth redirect.
const META_OAUTH_STATE_KEY = "meta_oauth_state";

// Generates a CSRF state, persists it to sessionStorage, and returns the
// OAuth URL with the state parameter included. Required by Meta (and the
// OAuth 2.0 spec) to defend against the return of an attacker-chosen token
// to the victim's session. See CRIT-05 in the security audit.
export const buildMetaOAuthUrl = (): string => {
  const appId = import.meta.env.VITE_META_APP_ID;
  const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
  const scope = encodeURIComponent("ads_read");

  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  const stored = safeSessionStorage.setJSON(META_OAUTH_STATE_KEY, state);
  if (!stored) {
    // sessionStorage unavailable (private mode, SSR). Without it the
    // callback cannot validate state, so refuse to start the flow.
    throw new Error("sessionStorage unavailable; cannot start OAuth flow safely");
  }

  return `https://www.facebook.com/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}&state=${state}`;
};

// Parses and validates the OAuth hash. Returns the token only when the
// state parameter matches the value we stored before redirect. A mismatched
// or missing state is treated as a CSRF attempt and the token is dropped.
export const parseTokenFromHash = (): { access_token: string; expires_in: string } | null => {
  const hash = window.location.hash.substring(1);
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const access_token = params.get("access_token");
  const expires_in = params.get("expires_in");
  const returnedState = params.get("state");
  if (!access_token) return null;

  const expectedState = safeSessionStorage.getJSON<string | null>(META_OAUTH_STATE_KEY, null);
  safeSessionStorage.remove(META_OAUTH_STATE_KEY);

  if (!expectedState || !returnedState || expectedState !== returnedState) {
    return null;
  }

  return { access_token, expires_in: expires_in ?? "3600" };
};
