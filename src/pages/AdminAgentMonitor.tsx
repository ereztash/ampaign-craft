import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabaseLoose as db } from "@/integrations/supabase/loose";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Activity, Brain, Database, TrendingUp, Clock, RefreshCw, AlertTriangle } from "lucide-react";

// ─── Types ────────────────────────────────────────

interface AgentRow {
  written_by: string;
  writes: number;
  stages: string[];
  scopes: string[];
  last_active: string;
}

interface EngineRow {
  engine_id: string;
  total: number;
  positive: number;
  negative: number;
  unrated: number;
}

interface ActivityItem {
  concept_key: string;
  written_by: string;
  stage: string;
  updated_at: string;
}

// ─── Constants ────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  discover: "#3b82f6",
  diagnose: "#f59e0b",
  design: "#8b5cf6",
  deploy: "#10b981",
};

// ─── Component ────────────────────────────────────

export default function AdminAgentMonitor() {
  const { user, loading } = useAuth();
  const { language } = useLanguage();

  const [agentRows, setAgentRows] = useState<AgentRow[]>([]);
  const [engineRows, setEngineRows] = useState<EngineRow[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [totalWrites, setTotalWrites] = useState(0);
  const [totalPairs, setTotalPairs] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      // ── Shared context writes ─────────────────
      const { data: ctxRows, error: ctxErr } = await db
        .from("shared_context")
        .select("written_by, stage, concept_key, updated_at")
        .order("updated_at", { ascending: false })
        .limit(500);

      if (ctxErr) logger.warn("AdminAgentMonitor.ctx", ctxErr);

      const rows: Array<{ written_by: string; stage: string; concept_key: string; updated_at: string }> =
        ctxRows ?? [];

      setTotalWrites(rows.length);
      setRecentActivity(rows.slice(0, 30).map((r) => ({
        concept_key: r.concept_key,
        written_by: r.written_by,
        stage: r.stage,
        updated_at: r.updated_at,
      })));

      // Aggregate per agent
      const agentMap = new Map<string, { writes: number; stages: Set<string>; scopes: Set<string>; last_active: string }>();
      for (const row of rows) {
        const agent = row.written_by || "unknown";
        const prev = agentMap.get(agent) ?? {
          writes: 0,
          stages: new Set<string>(),
          scopes: new Set<string>(),
          last_active: row.updated_at,
        };
        prev.writes++;
        prev.stages.add(row.stage);
        const scope = row.concept_key.split("-")[0] ?? "UNKNOWN";
        prev.scopes.add(scope);
        if (row.updated_at > prev.last_active) prev.last_active = row.updated_at;
        agentMap.set(agent, prev);
      }
      setAgentRows(
        Array.from(agentMap.entries())
          .map(([written_by, s]) => ({
            written_by,
            writes: s.writes,
            stages: Array.from(s.stages),
            scopes: Array.from(s.scopes),
            last_active: s.last_active,
          }))
          .sort((a, b) => b.writes - a.writes),
      );

      // ── Training pairs ────────────────────────
      const { data: trainRows, error: trainErr } = await db
        .from("training_pairs")
        .select("engine_id, quality")
        .limit(2000);

      if (trainErr) logger.warn("AdminAgentMonitor.train", trainErr);
      const tRows: Array<{ engine_id: string; quality: string | null }> = trainRows ?? [];
      setTotalPairs(tRows.length);

      const engineMap = new Map<string, { total: number; positive: number; negative: number; unrated: number }>();
      for (const row of tRows) {
        const eng = row.engine_id || "unknown";
        const prev = engineMap.get(eng) ?? { total: 0, positive: 0, negative: 0, unrated: 0 };
        prev.total++;
        if (row.quality === "positive") prev.positive++;
        else if (row.quality === "negative") prev.negative++;
        else prev.unrated++;
        engineMap.set(eng, prev);
      }
      setEngineRows(
        Array.from(engineMap.entries())
          .map(([engine_id, s]) => ({ engine_id, ...s }))
          .sort((a, b) => b.total - a.total),
      );

      setLastRefresh(new Date());
    } catch (err) {
      logger.warn("AdminAgentMonitor", err);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-8 text-center text-muted-foreground text-sm">…</div>;
  if (!user || (user.role !== "owner" && user.role !== "admin")) {
    return <Navigate to="/" replace />;
  }

  const isHe = language === "he";

  return (
    <main className="container mx-auto max-w-6xl px-4 py-6 space-y-6" dir={isHe ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-amber-500" />
          <h1 className="text-xl font-semibold">
            {tx({ he: "ניטור סוכנים — למידה משותפת", en: "Agent Monitor — Shared Learning" }, language)}
          </h1>
          <Badge variant="outline" className="text-amber-600 border-amber-400 text-xs">Owner Only</Badge>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs text-muted-foreground">
              {tx({ he: "עודכן", en: "Refreshed" }, language)}: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={load} disabled={fetching} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${fetching ? "animate-spin" : ""}`} />
            {tx({ he: "רענן", en: "Refresh" }, language)}
          </Button>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Activity className="h-4 w-4" />
              {tx({ he: "כתיבות לוח שחור", en: "Blackboard Writes" }, language)}
            </div>
            <div className="text-2xl font-bold">{totalWrites}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Brain className="h-4 w-4" />
              {tx({ he: "סוכנים פעילים", en: "Active Agents" }, language)}
            </div>
            <div className="text-2xl font-bold">{agentRows.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Database className="h-4 w-4" />
              {tx({ he: "זוגות אימון", en: "Training Pairs" }, language)}
            </div>
            <div className="text-2xl font-bold">{totalPairs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-4 w-4" />
              {tx({ he: "מנועים שנלמדו", en: "Engines Learned" }, language)}
            </div>
            <div className="text-2xl font-bold">{engineRows.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Agent writes bar chart */}
      {agentRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {tx({ he: "כתיבות לפי סוכן", en: "Writes per Agent" }, language)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agentRows.slice(0, 12)} margin={{ top: 0, right: 8, bottom: 50, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="written_by" angle={-35} textAnchor="end" tick={{ fontSize: 10 }} interval={0} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Bar dataKey="writes" fill="#f59e0b" radius={[3, 3, 0, 0]} name={isHe ? "כתיבות" : "Writes"} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Agent table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {tx({ he: "פירוט פעילות סוכנים", en: "Agent Activity Detail" }, language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fetching ? (
            <div className="text-muted-foreground text-sm py-4 text-center">
              {tx({ he: "טוען…", en: "Loading…" }, language)}
            </div>
          ) : agentRows.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-6 justify-center">
              <AlertTriangle className="h-4 w-4" />
              {tx({ he: "אין נתוני סוכנים עדיין — הרץ pipeline כדי לאכלס את הלוח", en: "No agent data yet — run a pipeline to populate the board" }, language)}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="text-muted-foreground text-xs border-b">
                    <th className="text-start pb-2 px-2">{tx({ he: "סוכן", en: "Agent" }, language)}</th>
                    <th className="text-end pb-2 px-2">{tx({ he: "כתיבות", en: "Writes" }, language)}</th>
                    <th className="text-start pb-2 px-2">{tx({ he: "שלבים", en: "Stages" }, language)}</th>
                    <th className="text-start pb-2 px-2">{tx({ he: "היקפים", en: "Scopes" }, language)}</th>
                    <th className="text-start pb-2 px-2">{tx({ he: "פעיל לאחרונה", en: "Last Active" }, language)}</th>
                  </tr>
                </thead>
                <tbody>
                  {agentRows.map((a) => (
                    <tr key={a.written_by} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-2 font-mono text-xs font-medium">{a.written_by}</td>
                      <td className="py-2 px-2 text-end">
                        <span className="font-semibold tabular-nums">{a.writes}</span>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex flex-wrap gap-1">
                          {a.stages.map((s) => (
                            <span
                              key={s}
                              className="rounded px-1.5 py-0.5 text-xs text-white"
                              style={{ backgroundColor: STAGE_COLORS[s] ?? "#6b7280" }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex flex-wrap gap-1">
                          {a.scopes.map((sc) => (
                            <Badge key={sc} variant="outline" className="text-xs py-0 h-5">{sc}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-muted-foreground text-xs tabular-nums">
                        {new Date(a.last_active).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training data chart */}
      {engineRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {tx({ he: "נתוני אימון לפי מנוע (MOAT Flywheel)", en: "Training Data by Engine (MOAT Flywheel)" }, language)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={engineRows.slice(0, 15)} margin={{ top: 0, right: 8, bottom: 60, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="engine_id" angle={-40} textAnchor="end" tick={{ fontSize: 10 }} interval={0} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="positive" stackId="q" fill="#10b981" name={isHe ? "חיובי" : "Positive"} />
                <Bar dataKey="negative" stackId="q" fill="#ef4444" name={isHe ? "שלילי" : "Negative"} />
                <Bar dataKey="unrated" stackId="q" fill="#9ca3af" radius={[3, 3, 0, 0]} name={isHe ? "ללא דירוג" : "Unrated"} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent activity feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {tx({ he: "פעילות אחרונה (30 כתיבות)", en: "Recent Activity (30 writes)" }, language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-muted-foreground text-sm py-4 text-center">
              {tx({ he: "אין פעילות עדיין", en: "No activity yet" }, language)}
            </div>
          ) : (
            <div className="space-y-0.5">
              {recentActivity.map((w, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-border/20 text-xs">
                  <span
                    className="rounded px-1.5 py-0.5 text-white shrink-0 w-16 text-center"
                    style={{ backgroundColor: STAGE_COLORS[w.stage] ?? "#6b7280" }}
                  >
                    {w.stage}
                  </span>
                  <span className="font-mono text-muted-foreground shrink-0 w-24 truncate">{w.written_by}</span>
                  <span className="font-mono truncate flex-1 text-foreground/80">{w.concept_key}</span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {new Date(w.updated_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center pb-4">
        {tx({
          he: "נתוני זיכרון (MetaMetrics, J-gradient, EDP) חיים רק בזמן ריצת pipeline — שורות אלו מבוססות על shared_context ו-training_pairs ב-Supabase.",
          en: "In-memory metrics (MetaMetrics, J-gradient, EDP) live only during a pipeline run — these rows are sourced from shared_context and training_pairs in Supabase.",
        }, language)}
      </p>
    </main>
  );
}
