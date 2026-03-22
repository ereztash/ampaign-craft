export interface MetaAuthState {
  accessToken: string;
  userId: string;
  expiresAt: number;
}

export interface MetaAdAccount {
  id: string;
  name: string;
  currency: string;
  account_status: number;
}

export interface MetaInsights {
  spend: string;
  impressions: string;
  clicks: string;
  cpc: string;
  cpm: string;
  ctr: string;
  reach: string;
  date_start: string;
  date_stop: string;
  actions?: { action_type: string; value: string }[];
  cost_per_action_type?: { action_type: string; value: string }[];
}

export interface MetaMonitorState {
  connected: boolean;
  auth: MetaAuthState | null;
  selectedAccountId: string | null;
  selectedAccountName: string | null;
  lastSync: string | null;
  insights: MetaInsights | null;
}

export interface KpiGap {
  kpiName: { he: string; en: string };
  targetMin: number;
  targetMax: number;
  unit: string;
  actual: number;
  gapPercent: number;
  status: "good" | "warning" | "critical";
}

export interface GuidanceAction {
  he: string;
  en: string;
}

export interface GuidanceItem {
  priority: "high" | "medium" | "low";
  area: { he: string; en: string };
  issue: { he: string; en: string };
  actions: GuidanceAction[];
  metric: string;
}
