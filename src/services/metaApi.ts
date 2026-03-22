import { MetaAdAccount, MetaInsights } from "@/types/meta";

const GRAPH_URL = "https://graph.facebook.com/v19.0";

export const getAdAccounts = async (token: string): Promise<MetaAdAccount[]> => {
  const res = await fetch(
    `${GRAPH_URL}/me/adaccounts?fields=id,name,currency,account_status&access_token=${token}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data ?? [];
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

  const res = await fetch(
    `${GRAPH_URL}/${accountId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${token}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data?.[0] ?? null;
};

export const exchangeForLongLivedToken = async (
  shortLivedToken: string
): Promise<{ access_token: string; expires_in: number }> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(`${supabaseUrl}/functions/v1/meta-token-exchange`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ shortLivedToken }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
};

export const buildMetaOAuthUrl = (): string => {
  const appId = import.meta.env.VITE_META_APP_ID;
  const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
  const scope = encodeURIComponent("ads_read,ads_management");
  return `https://www.facebook.com/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
};

export const parseTokenFromHash = (): { access_token: string; expires_in: string } | null => {
  const hash = window.location.hash.substring(1);
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const access_token = params.get("access_token");
  const expires_in = params.get("expires_in");
  if (!access_token) return null;
  return { access_token, expires_in: expires_in ?? "3600" };
};
