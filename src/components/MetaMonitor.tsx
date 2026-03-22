import { useState, useEffect, useCallback } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FunnelResult } from "@/types/funnel";
import { KpiGap, GuidanceItem, MetaInsights } from "@/types/meta";
import { getCampaignInsights } from "@/services/metaApi";
import { computeGaps } from "@/engine/gapEngine";
import { generateGuidance, getOverallHealth } from "@/engine/guidanceEngine";
import { useLanguage } from "@/i18n/LanguageContext";

interface MetaMonitorProps {
  result: FunnelResult;
  accountId: string;
  accessToken: string;
}

type DatePreset = "last_7d" | "last_14d" | "last_30d";

const DATE_LABELS: Record<DatePreset, { he: string; en: string }> = {
  last_7d: { he: "7 ימים", en: "7 days" },
  last_14d: { he: "14 ימים", en: "14 days" },
  last_30d: { he: "30 ימים", en: "30 days" },
};

const StatusIcon = ({ status }: { status: KpiGap["status"] }) => {
  if (status === "good") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
};

const GapRow = ({ gap, isHe }: { gap: KpiGap; isHe: boolean }) => {
  const isOver = gap.gapPercent > 0;
  const TrendIcon = isOver ? TrendingUp : gap.gapPercent < 0 ? TrendingDown : Minus;
  const color =
    gap.status === "good" ? "text-green-600" : gap.status === "warning" ? "text-yellow-600" : "text-red-600";

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2">
        <StatusIcon status={gap.status} />
        <span className="text-sm font-medium">{isHe ? gap.kpiName.he : gap.kpiName.en}</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">
          {isHe ? "יעד" : "Target"}: {gap.targetMin}-{gap.targetMax}{gap.unit}
        </span>
        <span className={`font-semibold ${color} flex items-center gap-1`}>
          <TrendIcon className="h-3 w-3" />
          {gap.actual.toFixed(2)}{gap.unit}
        </span>
        <Badge
          variant="outline"
          className={`text-xs ${
            gap.status === "good"
              ? "border-green-300 text-green-700"
              : gap.status === "warning"
              ? "border-yellow-300 text-yellow-700"
              : "border-red-300 text-red-700"
          }`}
        >
          {isOver ? "+" : ""}
          {gap.gapPercent.toFixed(0)}%
        </Badge>
      </div>
    </div>
  );
};

const GuidanceCard = ({ item, isHe }: { item: GuidanceItem; isHe: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  const borderColor =
    item.priority === "high" ? "border-red-200" : item.priority === "medium" ? "border-yellow-200" : "border-blue-200";
  const bgColor =
    item.priority === "high" ? "bg-red-50/50" : item.priority === "medium" ? "bg-yellow-50/50" : "bg-blue-50/50";
  const badgeClass =
    item.priority === "high" ? "bg-red-100 text-red-700" : item.priority === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700";

  return (
    <Card className={`${borderColor} ${bgColor}`}>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
                {item.priority === "high" ? (isHe ? "דחוף" : "Urgent") : item.priority === "medium" ? (isHe ? "חשוב" : "Important") : (isHe ? "שפר" : "Improve")}
              </span>
              <span className="text-sm font-medium">{isHe ? item.area.he : item.area.en}</span>
            </div>
            <p className="text-sm text-muted-foreground">{isHe ? item.issue.he : item.issue.en}</p>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            {isHe ? "פעולות לשבוע הקרוב" : "Actions for this week"}
          </p>
          <ol className="space-y-2">
            {item.actions.map((action, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="font-bold text-primary shrink-0">{i + 1}.</span>
                <span>{isHe ? action.he : action.en}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      )}
    </Card>
  );
};

const MetaMonitor = ({ result, accountId, accessToken }: MetaMonitorProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const [datePreset, setDatePreset] = useState<DatePreset>("last_7d");
  const [insights, setInsights] = useState<MetaInsights | null>(null);
  const [gaps, setGaps] = useState<KpiGap[]>([]);
  const [guidance, setGuidance] = useState<GuidanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const sync = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCampaignInsights(accountId, accessToken, datePreset);
      if (!data) {
        setError(isHe ? "אין נתונים לתקופה זו. בדוק שהקמפיינים פעילים." : "No data for this period. Check that campaigns are active.");
        return;
      }
      setInsights(data);
      const computedGaps = computeGaps(result, data);
      setGaps(computedGaps);
      setGuidance(generateGuidance(computedGaps, result));
      setLastSync(new Date().toLocaleTimeString(isHe ? "he-IL" : "en-US"));
    } catch (err) {
      setError(isHe ? "שגיאה בטעינת נתונים מ-Meta. בדוק שהחשבון פעיל." : "Error loading data from Meta.");
    } finally {
      setLoading(false);
    }
  }, [accountId, accessToken, datePreset, result, isHe]);

  useEffect(() => {
    sync();
  }, [sync]);

  const health = getOverallHealth(gaps);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold">
            {isHe ? "ניטור ביצועים" : "Performance Monitor"}
          </h3>
          {lastSync && (
            <p className="text-xs text-muted-foreground">
              {isHe ? `עדכון אחרון: ${lastSync}` : `Last sync: ${lastSync}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden text-sm">
            {(Object.entries(DATE_LABELS) as [DatePreset, { he: string; en: string }][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setDatePreset(key)}
                className={`px-3 py-1.5 transition-colors ${
                  datePreset === key ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {isHe ? label.he : label.en}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={sync} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {isHe ? "רענן" : "Refresh"}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="py-4 flex items-center gap-2 text-sm text-red-700">
            <XCircle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Health Score */}
      {gaps.length > 0 && (
        <Card>
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {isHe ? "בריאות הקמפיין" : "Campaign Health"}
              </p>
              <p className="text-2xl font-bold">{health.score}%</p>
            </div>
            <Badge
              className={`text-sm px-3 py-1 ${
                health.color === "green"
                  ? "bg-green-100 text-green-700 border-green-200"
                  : health.color === "yellow"
                  ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                  : "bg-red-100 text-red-700 border-red-200"
              }`}
              variant="outline"
            >
              {isHe ? health.label.he : health.label.en}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* KPI Gaps */}
      {gaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isHe ? "KPIs מול יעדים" : "KPIs vs Targets"}
            </CardTitle>
            <CardDescription>
              {isHe ? "השוואה בין ביצועי הקמפיין לתוכנית שנוצרה" : "Comparing campaign performance to your funnel plan"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gaps.map((gap, i) => (
              <GapRow key={i} gap={gap} isHe={isHe} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Guidance */}
      {guidance.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            {isHe ? "פעולות מומלצות לשבוע הקרוב" : "Recommended actions this week"}
          </h4>
          <div className="space-y-3">
            {guidance.map((item, i) => (
              <GuidanceCard key={i} item={item} isHe={isHe} />
            ))}
          </div>
        </div>
      )}

      {/* Raw metrics */}
      {insights && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isHe ? "נתוני גלם" : "Raw Metrics"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              {[
                { label: isHe ? "הוצאה" : "Spend", value: `₪${parseFloat(insights.spend).toLocaleString()}` },
                { label: isHe ? "חשיפות" : "Impressions", value: parseInt(insights.impressions).toLocaleString() },
                { label: isHe ? "קליקים" : "Clicks", value: parseInt(insights.clicks).toLocaleString() },
                { label: "CTR", value: `${parseFloat(insights.ctr).toFixed(2)}%` },
                { label: "CPC", value: `₪${parseFloat(insights.cpc).toFixed(2)}` },
                { label: "CPM", value: `₪${parseFloat(insights.cpm).toFixed(2)}` },
                { label: isHe ? "טווח" : "Reach", value: parseInt(insights.reach).toLocaleString() },
              ].map((m) => (
                <div key={m.label} className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="font-semibold">{m.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MetaMonitor;
