import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { safeStorage } from "@/lib/safeStorage";

const STORAGE_KEY = "funnelforge-data-sources";

export type DataSourceStatus = "connected" | "disconnected" | "syncing" | "error";

export type DataSourceCategory =
  | "advertising"
  | "analytics"
  | "crm"
  | "messaging"
  | "manual"
  | "business_profile";

export interface DataSource {
  id: string;
  platform: string;
  label: { he: string; en: string };
  category: DataSourceCategory;
  status: DataSourceStatus;
  lastSync: string | null;
  recordCount: number;
  feeds: { he: string; en: string }[];
}

export interface DataSourceState {
  sources: DataSource[];
  totalRecords: number;
  lastGlobalSync: string | null;
  dataQualityScore: number;
}

interface DataSourceContextValue extends DataSourceState {
  setSourceStatus: (id: string, status: DataSourceStatus, lastSync?: string | null) => void;
  setSourceRecords: (id: string, count: number) => void;
  upsertSource: (source: DataSource) => void;
  refreshFromProfile: (hasFormData: boolean) => void;
}

const defaultSources = (): DataSource[] => [
  {
    id: "meta",
    platform: "meta",
    label: { he: "מודעות מטא", en: "Meta Ads" },
    category: "advertising",
    status: "disconnected",
    lastSync: null,
    recordCount: 0,
    feeds: [
      { he: "אנליטיקה, KPI, המלצות קמפיין", en: "Analytics, KPIs, campaign guidance" },
    ],
  },
  {
    id: "google_ads",
    platform: "google_ads",
    label: { he: "Google Ads", en: "Google Ads" },
    category: "advertising",
    status: "disconnected",
    lastSync: null,
    recordCount: 0,
    feeds: [
      { he: "ביצועי קמפיינים", en: "Campaign performance" },
      { he: "עלות להמרה", en: "Cost per conversion" },
      { he: "מילות מפתח", en: "Keywords" },
    ],
  },
  {
    id: "ga4",
    platform: "ga4",
    label: { he: "Google Analytics", en: "Google Analytics" },
    category: "analytics",
    status: "disconnected",
    lastSync: null,
    recordCount: 0,
    feeds: [{ he: "משפכים, התנהגות", en: "Funnels, behavior" }],
  },
  {
    id: "mailchimp",
    platform: "mailchimp",
    label: { he: "Mailchimp", en: "Mailchimp" },
    category: "crm",
    status: "disconnected",
    lastSync: null,
    recordCount: 0,
    feeds: [{ he: "אימייל, קהלים", en: "Email, audiences" }],
  },
  {
    id: "manual_import",
    platform: "manual_import",
    label: { he: "ייבוא CSV / Excel", en: "CSV / Excel import" },
    category: "manual",
    status: "disconnected",
    lastSync: null,
    recordCount: 0,
    feeds: [{ he: "נתונים מותאמים", en: "Custom datasets" }],
  },
  {
    id: "business_profile",
    platform: "business_profile",
    label: { he: "פרופיל עסק (שאלון)", en: "Business profile (questionnaire)" },
    category: "business_profile",
    status: "disconnected",
    lastSync: null,
    recordCount: 0,
    feeds: [
      { he: "כל המודולים", en: "All modules" },
    ],
  },
];

function loadState(): DataSourceState {
  const parsed = safeStorage.getJSON<Partial<DataSourceState> | null>(STORAGE_KEY, null);
  if (!parsed) {
    return {
      sources: defaultSources(),
      totalRecords: 0,
      lastGlobalSync: null,
      dataQualityScore: 0,
    };
  }
  const sources = parsed.sources?.length ? parsed.sources : defaultSources();
  const totalRecords = sources.reduce((s, x) => s + (x.recordCount || 0), 0);
  return {
    sources,
    totalRecords: parsed.totalRecords ?? totalRecords,
    lastGlobalSync: parsed.lastGlobalSync ?? null,
    dataQualityScore: parsed.dataQualityScore ?? Math.min(100, totalRecords > 0 ? 40 + sources.filter((s) => s.status === "connected").length * 15 : 0),
  };
}

function computeQuality(sources: DataSource[], totalRecords: number): number {
  const connected = sources.filter((s) => s.status === "connected").length;
  if (connected === 0 && totalRecords === 0) return 0;
  return Math.min(100, 25 + connected * 18 + Math.min(30, Math.floor(totalRecords / 500)));
}

const DataSourceContext = createContext<DataSourceContextValue | undefined>(undefined);

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataSourceState>(loadState);

  useEffect(() => {
    safeStorage.setJSON(STORAGE_KEY, state);
  }, [state]);

  const setSourceStatus = useCallback((id: string, status: DataSourceStatus, lastSyncArg?: string | null) => {
    setState((prev) => {
      const sources = prev.sources.map((s) => {
        if (s.id !== id) return s;
        const lastSync =
          lastSyncArg !== undefined
            ? lastSyncArg
            : status === "connected"
              ? new Date().toISOString()
              : s.lastSync;
        return { ...s, status, lastSync };
      });
      const totalRecords = sources.reduce((acc, s) => acc + s.recordCount, 0);
      const dq = computeQuality(sources, totalRecords);
      return {
        sources,
        totalRecords,
        lastGlobalSync: sources.some((s) => s.status === "connected") ? new Date().toISOString() : prev.lastGlobalSync,
        dataQualityScore: dq,
      };
    });
  }, []);

  const setSourceRecords = useCallback((id: string, count: number) => {
    setState((prev) => {
      const sources = prev.sources.map((s) => (s.id === id ? { ...s, recordCount: count } : s));
      const totalRecords = sources.reduce((acc, s) => acc + s.recordCount, 0);
      return { ...prev, sources, totalRecords, dataQualityScore: computeQuality(sources, totalRecords) };
    });
  }, []);

  const upsertSource = useCallback((source: DataSource) => {
    setState((prev) => {
      const idx = prev.sources.findIndex((s) => s.id === source.id);
      const sources = idx >= 0 ? prev.sources.map((s, i) => (i === idx ? source : s)) : [...prev.sources, source];
      const totalRecords = sources.reduce((acc, s) => acc + s.recordCount, 0);
      return { ...prev, sources, totalRecords, dataQualityScore: computeQuality(sources, totalRecords) };
    });
  }, []);

  const refreshFromProfile = useCallback((hasFormData: boolean) => {
    if (!hasFormData) return;
    setSourceStatus("business_profile", "connected", new Date().toISOString());
    setSourceRecords("business_profile", 1);
  }, [setSourceStatus, setSourceRecords]);

  const value = useMemo<DataSourceContextValue>(
    () => ({
      ...state,
      setSourceStatus,
      setSourceRecords,
      upsertSource,
      refreshFromProfile,
    }),
    [state, setSourceStatus, setSourceRecords, upsertSource, refreshFromProfile],
  );

  return <DataSourceContext.Provider value={value}>{children}</DataSourceContext.Provider>;
}

export function useDataSources() {
  const ctx = useContext(DataSourceContext);
  if (!ctx) throw new Error("useDataSources must be used within DataSourceProvider");
  return ctx;
}
