// ═══════════════════════════════════════════════
// AARRR Growth Dashboard — /admin/aarrr
//
// Internal admin page showing all 5 AARRR metrics live.
// Source: event_queue table, aggregated via Supabase.
// Protected: requires role=admin OR isLocalAuth=true.
// ═══════════════════════════════════════════════

import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, FunnelChart, Funnel,
  LabelList,
} from "recharts";
import { supabaseLoose as db } from "@/integrations/supabase/loose";
import { NORTH_STAR_METRIC } from "@/lib/analytics";
import { logger } from "@/lib/logger";

// ─── Types ──────────────────────────────────────

interface MetricCard {
  stage: string;
  label: string;
  labelHe: string;
  value: number;
  target: number;
  score: number; // 0-110
  color: string;
  events: string[];
}

interface DailyPoint {
  date: string;
  acquisition: number;
  activation: number;
  retention: number;
  revenue: number;
  referral: number;
}

// ─── Score helpers ───────────────────────────────

function toScore(value: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(110, Math.round((value / target) * 100));
}

const STAGE_META: MetricCard[] = [
  {
    stage: "acquisition",
    label: "Acquisition",
    labelHe: "רכישה",
    value: 0,
    target: 50,
    score: 0,
    color: "#3b82f6",
    events: [
      "aarrr.acquisition.signup_completed",
      "aarrr.acquisition.landing_view",
      "aarrr.acquisition.onboarding_started",
    ],
  },
  {
    stage: "activation",
    label: "Activation",
    labelHe: "הפעלה",
    value: 0,
    target: 30,
    score: 0,
    color: "#10b981",
    events: [
      "aarrr.activation.first_plan_generated",
      "aarrr.activation.aha_moment",
      "aarrr.activation.archetype_revealed",
    ],
  },
  {
    stage: "retention",
    label: "Retention",
    labelHe: "שימור",
    value: 0,
    target: 20,
    score: 0,
    color: "#f59e0b",
    events: [
      "aarrr.retention.weekly_active",
      "aarrr.retention.pulse_opened",
      "aarrr.retention.reactivated",
    ],
  },
  {
    stage: "revenue",
    label: "Revenue",
    labelHe: "הכנסות",
    value: 0,
    target: 10,
    score: 0,
    color: "#ef4444",
    events: [
      "aarrr.revenue.conversion_completed",
      "aarrr.revenue.upgrade",
      "aarrr.revenue.checkout_started",
    ],
  },
  {
    stage: "referral",
    label: "Referral",
    labelHe: "הפניות",
    value: 0,
    target: 5,
    score: 0,
    color: "#8b5cf6",
    events: [
      "aarrr.referral.signup_from_share",
      "aarrr.referral.share_created",
      "aarrr.referral.reward_earned",
    ],
  },
];

// ─── Component ───────────────────────────────────

export default function AARRRDashboard() {
  const { user, isLocalAuth } = useAuth();
  const [metrics, setMetrics] = useState<MetricCard[]>(STAGE_META);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallScore, setOverallScore] = useState(0);
  const [nsmValue, setNsmValue] = useState(0);
  const [ahaFunnel, setAhaFunnel] = useState<{ name: string; value: number; fill: string }[]>([]);

  // Guard: admin only
  const isAdmin = isLocalAuth || (user as { role?: string } | null)?.role === "admin";
  if (!isAdmin) return <Navigate to="/" replace />;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    loadMetrics();
  }, []);

  async function loadMetrics() {
    setLoading(true);
    try {
      // Count AARRR events per type from event_queue (last 30 days)
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await db
        .from("event_queue")
        .select("event_type, created_at")
        .gte("created_at", since)
        .like("event_type", "aarrr.%");

      if (error) throw error;

      const rows = (data || []) as { event_type: string; created_at: string }[];

      // Aggregate counts per stage
      const stageCounts: Record<string, number> = {};
      const dailyMap: Record<string, Record<string, number>> = {};

      for (const row of rows) {
        const parts = row.event_type.split(".");
        const stage = parts[1] ?? "unknown";
        stageCounts[stage] = (stageCounts[stage] ?? 0) + 1;

        // Daily aggregation
        const day = row.created_at.slice(0, 10);
        if (!dailyMap[day]) dailyMap[day] = {};
        dailyMap[day][stage] = (dailyMap[day][stage] ?? 0) + 1;
      }

      const updated = STAGE_META.map((m) => {
        const value = stageCounts[m.stage] ?? 0;
        return { ...m, value, score: toScore(value, m.target) };
      });

      setMetrics(updated);
      setOverallScore(Math.round(updated.reduce((s, m) => s + m.score, 0) / updated.length));

      // NSM: weekly activated plans (last 7 days)
      const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: nsmData } = await db
        .from("event_queue")
        .select("id")
        .eq("event_type", NORTH_STAR_METRIC.event)
        .gte("created_at", week);
      setNsmValue((nsmData ?? []).length);

      // Aha Funnel: signup → plan → aha → return
      const funnelStages = [
        { event: "aarrr.acquisition.signup_completed", name: "Signup", fill: "#3b82f6" },
        { event: "aarrr.activation.first_plan_generated", name: "First Plan", fill: "#10b981" },
        { event: "aarrr.activation.aha_moment", name: "Aha Moment", fill: "#f59e0b" },
        { event: "aarrr.retention.weekly_active", name: "Week-1 Return", fill: "#8b5cf6" },
      ];
      const funnelCounts = await Promise.all(
        funnelStages.map(async (s) => {
          const { data: fd } = await db
            .from("event_queue")
            .select("id")
            .eq("event_type", s.event)
            .gte("created_at", since);
          return { name: s.name, value: (fd ?? []).length, fill: s.fill };
        })
      );
      setAhaFunnel(funnelCounts);

      // Build daily chart (last 14 days)
      const sortedDays = Object.keys(dailyMap).sort().slice(-14);
      setDaily(
        sortedDays.map((date) => ({
          date: date.slice(5), // MM-DD
          acquisition: dailyMap[date]?.acquisition ?? 0,
          activation: dailyMap[date]?.activation ?? 0,
          retention: dailyMap[date]?.retention ?? 0,
          revenue: dailyMap[date]?.revenue ?? 0,
          referral: dailyMap[date]?.referral ?? 0,
        }))
      );
    } catch (err) {
      logger.error("AARRRDashboard.loadMetrics", err);
      // Show zeros — don't crash
    }
    setLoading(false);
  }

  const SCORE_BG =
    overallScore >= 100
      ? "from-emerald-900/40 to-emerald-800/20"
      : overallScore >= 70
      ? "from-amber-900/30 to-amber-800/20"
      : "from-red-900/30 to-red-800/20";

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-10" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className={`inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-l ${SCORE_BG} border border-white/10 mb-6`}>
          <span className="text-5xl font-black tracking-tight">{loading ? "—" : overallScore}</span>
          <div>
            <p className="text-xl font-bold">ציון AARRR</p>
            <p className="text-sm text-zinc-400">ממוצע 5 מדדים • 30 יום אחרון</p>
          </div>
        </div>
        <h1 className="text-3xl font-bold">דשבורד AARRR Growth</h1>
        <p className="text-zinc-400 mt-1">מדדי פיראטים פנימיים — FunnelForge</p>
      </div>

      {/* ★ North Star Metric Hero */}
      <div className="mb-8 p-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-1">
              ★ North Star Metric
            </p>
            <p className="text-zinc-300 text-sm mb-3">{NORTH_STAR_METRIC.description}</p>
            <div className="flex items-end gap-2">
              <span className="text-6xl font-black text-yellow-400">{loading ? "—" : nsmValue}</span>
              <span className="text-zinc-500 text-sm mb-2">{NORTH_STAR_METRIC.unit.he} • יעד {NORTH_STAR_METRIC.target}</span>
            </div>
            <div className="mt-3 h-2 bg-zinc-800 rounded-full w-64 max-w-full">
              <div
                className="h-2 rounded-full bg-yellow-400 transition-all duration-700"
                style={{ width: `${Math.min(100, Math.round((nsmValue / NORTH_STAR_METRIC.target) * 100))}%` }}
              />
            </div>
            <p className="text-zinc-600 text-xs mt-1">
              {Math.min(100, Math.round((nsmValue / NORTH_STAR_METRIC.target) * 100))}% מיעד שבועי
            </p>
          </div>
          <div className="text-right text-zinc-600 text-xs max-w-xs">
            <p className="font-semibold text-zinc-400 mb-1">מה זה מודד?</p>
            <p>כמה תוכניות שיווק חדשות נוצרו השבוע. מדד זה מייצג ערך ממשי שמשתמשים קיבלו מהמוצר.</p>
            <p className="mt-2 font-semibold text-zinc-400">מתי לפעול?</p>
            <p>אם יורד מתחת ל-{Math.round(NORTH_STAR_METRIC.target * 0.6)} — investigate drop-off בשלב Activation.</p>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        {metrics.map((m) => (
          <div
            key={m.stage}
            className="rounded-2xl border border-white/10 p-4 bg-white/5 hover:bg-white/8 transition"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                {m.label}
              </span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: m.color + "33", color: m.color }}
              >
                {m.labelHe}
              </span>
            </div>
            {/* Score gauge */}
            <div className="relative h-2 bg-zinc-800 rounded-full mb-3">
              <div
                className="absolute h-2 rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, m.score)}%`,
                  background: m.color,
                }}
              />
            </div>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-black" style={{ color: m.color }}>
                {loading ? "—" : m.score}
              </span>
              <span className="text-zinc-500 text-sm mb-0.5">/ 110</span>
            </div>
            <p className="text-zinc-500 text-xs mt-1">{m.value} אירועים • יעד {m.target}</p>
          </div>
        ))}
      </div>

      {/* Score bar chart */}
      <div className="rounded-2xl border border-white/10 p-6 bg-white/5 mb-8">
        <h2 className="text-lg font-bold mb-4">השוואת ציונים</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={metrics} layout="vertical">
            <XAxis type="number" domain={[0, 110]} tick={{ fill: "#71717a", fontSize: 11 }} />
            <YAxis dataKey="labelHe" type="category" tick={{ fill: "#a1a1aa", fontSize: 12 }} width={60} />
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #27272a", color: "#fff" }}
              formatter={(v: number) => [`${v} / 110`, "ציון"]}
            />
            <Bar dataKey="score" radius={[0, 6, 6, 0]}>
              {metrics.map((m) => (
                <Cell key={m.stage} fill={m.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Daily trend */}
      {daily.length > 0 && (
        <div className="rounded-2xl border border-white/10 p-6 bg-white/5 mb-8">
          <h2 className="text-lg font-bold mb-4">טרנד יומי — 14 ימים אחרונים</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", color: "#fff" }} />
              {[
                { key: "acquisition", color: "#3b82f6" },
                { key: "activation", color: "#10b981" },
                { key: "retention", color: "#f59e0b" },
                { key: "revenue", color: "#ef4444" },
                { key: "referral", color: "#8b5cf6" },
              ].map(({ key, color }) => (
                <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Aha Moment Funnel */}
      {ahaFunnel.length > 0 && (
        <div className="rounded-2xl border border-white/10 p-6 bg-white/5 mb-8">
          <h2 className="text-lg font-bold mb-1">Aha Moment Funnel</h2>
          <p className="text-zinc-500 text-xs mb-4">Signup → First Plan → Aha Moment → Week-1 Return · 30 ימים</p>
          <ResponsiveContainer width="100%" height={200}>
            <FunnelChart>
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", color: "#fff" }} />
              <Funnel dataKey="value" data={ahaFunnel} isAnimationActive>
                <LabelList position="right" fill="#a1a1aa" stroke="none" dataKey="name" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
          {ahaFunnel.every((s) => s.value === 0) && (
            <p className="text-center text-zinc-600 text-xs mt-2">Sample — populates after first activated users</p>
          )}
        </div>
      )}

      {/* Cohort Retention Matrix */}
      <div className="rounded-2xl border border-white/10 p-6 bg-white/5 mb-8">
        <h2 className="text-lg font-bold mb-1">Cohort Retention</h2>
        <p className="text-zinc-500 text-xs mb-4">
          {nsmValue === 0
            ? "Sample data — live cohorts populate after first users activate"
            : "Week-over-week retention by signup cohort"}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-center">
            <thead>
              <tr className="text-zinc-500 border-b border-white/10">
                <th className="text-right pb-2 font-medium pr-4">Cohort</th>
                <th className="pb-2 font-medium">W0</th>
                <th className="pb-2 font-medium">W1</th>
                <th className="pb-2 font-medium">W2</th>
                <th className="pb-2 font-medium">W4</th>
              </tr>
            </thead>
            <tbody>
              {(nsmValue === 0
                ? [
                    { cohort: "Sample — Apr W1", w0: 100, w1: 62, w2: 48, w4: 35 },
                    { cohort: "Sample — Apr W2", w0: 100, w1: 58, w2: 44, w4: null },
                    { cohort: "Sample — Apr W3", w0: 100, w1: 55, w2: null, w4: null },
                  ]
                : []
              ).map((row) => (
                <tr key={row.cohort} className="border-b border-white/5">
                  <td className="py-2 text-left pr-4 text-zinc-400">{row.cohort}</td>
                  {[row.w0, row.w1, row.w2, row.w4].map((v, i) => (
                    <td key={i} className="py-2">
                      {v == null ? (
                        <span className="text-zinc-700">—</span>
                      ) : (
                        <span
                          className="px-2 py-0.5 rounded text-xs font-semibold"
                          style={{
                            background: v >= 50 ? "#10b98133" : v >= 30 ? "#f59e0b33" : "#ef444433",
                            color: v >= 50 ? "#10b981" : v >= 30 ? "#f59e0b" : "#ef4444",
                          }}
                        >
                          {v}%
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Target table */}
      <div className="rounded-2xl border border-white/10 p-6 bg-white/5">
        <h2 className="text-lg font-bold mb-4">יעדים ומדידה</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 border-b border-white/10">
                <th className="text-right pb-3 font-medium">מדד</th>
                <th className="text-right pb-3 font-medium">נוסחה</th>
                <th className="text-right pb-3 font-medium">יעד</th>
                <th className="text-right pb-3 font-medium">ציון</th>
                <th className="text-right pb-3 font-medium">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Acquisition", formula: "signups / landing_views", target: "≥8%", score: metrics[0]?.score },
                { label: "Activation", formula: "first_plan / signups", target: "≥70%", score: metrics[1]?.score },
                { label: "Retention W1", formula: "week1_active / new_users", target: "≥55%", score: metrics[2]?.score },
                { label: "Revenue conv.", formula: "paid / signups", target: "≥5%", score: metrics[3]?.score },
                { label: "Referral K-factor", formula: "invited_conv / inviters", target: "≥1.2", score: metrics[4]?.score },
              ].map((row) => (
                <tr key={row.label} className="border-b border-white/5 hover:bg-white/3">
                  <td className="py-3 font-medium">{row.label}</td>
                  <td className="py-3 text-zinc-500 font-mono text-xs">{row.formula}</td>
                  <td className="py-3">{row.target}</td>
                  <td className="py-3 font-bold">{loading ? "—" : row.score}</td>
                  <td className="py-3">
                    {!loading && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          (row.score ?? 0) >= 100
                            ? "bg-emerald-900/50 text-emerald-400"
                            : (row.score ?? 0) >= 70
                            ? "bg-amber-900/50 text-amber-400"
                            : "bg-red-900/50 text-red-400"
                        }`}
                      >
                        {(row.score ?? 0) >= 100 ? "✓ יעד הושג" : (row.score ?? 0) >= 70 ? "בתהליך" : "נדרש שיפור"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-zinc-600 text-xs mt-4">
          * הנתונים מבוססים על event_queue — 30 ימים אחרונים. יעד ציון 110 = 110% מהיעד הכמותי.
        </p>
      </div>
    </div>
  );
}
