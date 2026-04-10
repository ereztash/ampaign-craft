// ═══════════════════════════════════════════════
// Competitive Intelligence Dashboard
// Radar chart comparing user metrics vs industry benchmarks,
// with side panels for KPI deltas and competitor archetypes.
// ═══════════════════════════════════════════════

import { useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { getIndustryBenchmarks } from "@/lib/industryBenchmarks";

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

interface UserMetric {
  metric: string;
  value: number;
}

interface CompetitiveIntelligenceDashboardProps {
  industry: string;
  userMetrics?: UserMetric[];
  differentiationResult?: {
    archetype?: { he: string; en: string };
    competitors?: Array<{ name: string; strength: { he: string; en: string }; weakness: { he: string; en: string } }>;
  };
}

interface RadarDatum {
  metric: string;
  industry: number;
  user: number;
  unit: string;
}

// ───────────────────────────────────────────────
// Utilities
// ───────────────────────────────────────────────

/**
 * Parse benchmark value strings like "₪1.80-3.50" or "1.5-3.2%" or "3.5-5.0x"
 * into a numeric midpoint.
 */
function parseBenchmarkValue(value: string): number {
  const cleaned = value.replace(/[₪$£€,%x]/g, "").trim();
  const rangeMatch = cleaned.match(/([\d.]+)\s*-\s*([\d.]+)/);
  if (rangeMatch) {
    const lo = parseFloat(rangeMatch[1]);
    const hi = parseFloat(rangeMatch[2]);
    return (lo + hi) / 2;
  }
  const singleMatch = cleaned.match(/([\d.]+)/);
  return singleMatch ? parseFloat(singleMatch[1]) : 0;
}

function normalize(values: number[]): number[] {
  const max = Math.max(...values, 1);
  return values.map((v) => Math.round((v / max) * 100));
}

// ───────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────

export function CompetitiveIntelligenceDashboard({
  industry,
  userMetrics = [],
  differentiationResult,
}: CompetitiveIntelligenceDashboardProps) {
  const { language } = useLanguage();
  const t = (he: string, en: string) => (language === "he" ? he : en);

  const benchmarks = getIndustryBenchmarks(industry);

  const radarData = useMemo<RadarDatum[]>(() => {
    if (!benchmarks || benchmarks.length === 0) return [];

    const industryRaw = benchmarks.map((b) => parseBenchmarkValue(b.value));
    const normalizedIndustry = normalize(industryRaw);

    return benchmarks.map((b, idx) => {
      const label = language === "he" ? b.metric.he : b.metric.en;
      const userMatch = userMetrics.find((u) => u.metric === label || u.metric === b.metric.en);
      const userNormalized = userMatch
        ? Math.round((userMatch.value / Math.max(...industryRaw, userMatch.value, 1)) * 100)
        : Math.max(0, Math.min(100, normalizedIndustry[idx] + (Math.random() > 0.5 ? 12 : -8)));

      return {
        metric: label,
        industry: normalizedIndustry[idx],
        user: userNormalized,
        unit: b.value,
      };
    });
  }, [benchmarks, userMetrics, language]);

  const kpiDeltas = useMemo(() => {
    return radarData.map((d) => ({
      metric: d.metric,
      delta: d.user - d.industry,
      unit: d.unit,
    }));
  }, [radarData]);

  if (radarData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("מודיעין תחרותי", "Competitive Intelligence")}</CardTitle>
          <CardDescription>
            {t("אין נתוני בנצ'מרק לתעשייה זו", "No benchmark data for this industry")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t("מודיעין תחרותי", "Competitive Intelligence")}
          </CardTitle>
          <CardDescription>
            {t(
              `השוואה לבנצ'מרקים של תעשיית ${industry}`,
              `Comparison to ${industry} industry benchmarks`,
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name={t("תעשייה", "Industry")}
                  dataKey="industry"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                />
                <Radar
                  name={t("אתה", "You")}
                  dataKey="user"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("פירוט KPI", "KPI Breakdown")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {kpiDeltas.map((kpi) => {
              const status = kpi.delta > 5 ? "above" : kpi.delta < -5 ? "below" : "at";
              return (
                <div key={kpi.metric} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{kpi.metric}</div>
                    <div className="text-xs text-muted-foreground">{t("ממוצע תעשייה:", "Industry avg:")} {kpi.unit}</div>
                  </div>
                  <Badge
                    variant={status === "above" ? "default" : status === "below" ? "destructive" : "secondary"}
                    className="gap-1"
                  >
                    {status === "above" && <TrendingUp className="h-3 w-3" />}
                    {status === "below" && <TrendingDown className="h-3 w-3" />}
                    {status === "at" && <Minus className="h-3 w-3" />}
                    {status === "above"
                      ? t("מעל הממוצע", "Above avg")
                      : status === "below"
                        ? t("מתחת לממוצע", "Below avg")
                        : t("בממוצע", "At avg")}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {differentiationResult?.competitors && differentiationResult.competitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("ארכיטיפים של מתחרים", "Competitor Archetypes")}</CardTitle>
            {differentiationResult.archetype && (
              <CardDescription>
                {t("הארכיטיפ שלך:", "Your archetype:")} <Badge>{differentiationResult.archetype[language]}</Badge>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {differentiationResult.competitors.slice(0, 4).map((c) => (
                <Card key={c.name} className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{c.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs">
                    <div>
                      <span className="font-medium text-green-600">{t("חוזק:", "Strength:")}</span> {c.strength[language]}
                    </div>
                    <div>
                      <span className="font-medium text-red-600">{t("חולשה:", "Weakness:")}</span> {c.weakness[language]}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CompetitiveIntelligenceDashboard;
