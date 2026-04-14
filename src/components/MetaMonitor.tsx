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
import { getKpiStatusColor } from "@/lib/colorSemantics";
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";

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
  const colors = getKpiStatusColor(status);
  if (status === "good") return <CheckCircle2 className={`h-4 w-4 ${colors.text}`} />;
  if (status === "warning") return <AlertTriangle className={`h-4 w-4 ${colors.text}`} />;
  return <XCircle className={`h-4 w-4 ${colors.text}`} />;
};

const GapRow = ({ gap, isHe }: { gap: KpiGap; isHe: boolean }) => {
  const isOver = gap.gapPercent > 0;
  const TrendIcon = isOver ? TrendingUp : gap.gapPercent < 0 ? TrendingDown : Minus;
  const statusColors = getKpiStatusColor(gap.status);
  const color = statusColors.text;

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2">
        <StatusIcon status={gap.status} />
        <span className="text-sm font-medium">{tx(gap.kpiName, language)}</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">
          {tx({ he: "יעד", en: "Target" }, language)}: {gap.targetMin}-{gap.targetMax}{gap.unit}
        </span>
        <span className={`font-semibold ${color} flex items-center gap-1`}>
          <TrendIcon className="h-3 w-3" />
          {gap.actual.toFixed(2)}{gap.unit}
        </span>
        <Badge
          variant="outline"
          className={`text-xs ${statusColors.border} ${statusColors.text}`}
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
  const priorityStatus = item.priority === "high" ? "critical" as const : item.priority === "medium" ? "warning" as const : "good" as const;
  const priorityColors = getKpiStatusColor(priorityStatus);
  const borderColor = priorityColors.border;
  const bgColor = priorityColors.bg;
  const badgeClass = `${priorityColors.bg} ${priorityColors.text}`;

  return (
    <Card className={`${borderColor} ${bgColor}`}>
      <CardHeader className="pb-2 cursor-pointer" role="button" tabIndex={0} onClick={() => setExpanded(!expanded)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(!expanded); } }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
                {item.priority === "high" ? (tx({ he: "דחוף", en: "Urgent" }, language)) : item.priority === "medium" ? (tx({ he: "חשוב", en: "Important" }, language)) : (tx({ he: "שפר", en: "Improve" }, language))}
              </span>
              <span className="text-sm font-medium">{tx(item.area, language)}</span>
            </div>
            <p className="text-sm text-muted-foreground">{tx(item.issue, language)}</p>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            {tx({ he: "פעולות לשבוע הקרוב", en: "Actions for this week" }, language)}
          </p>
          <ol className="space-y-2">
            {item.actions.map((action, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="font-bold text-primary shrink-0">{i + 1}.</span>
                <span>{tx(action, language)}</span>
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
        setError(tx({ he: "אין נתונים לתקופה זו. בדוק שהקמפיינים פעילים.", en: "No data for this period. Check that campaigns are active." }, language));
        return;
      }
      setInsights(data);
      const computedGaps = computeGaps(result, data);
      setGaps(computedGaps);
      setGuidance(generateGuidance(computedGaps, result));
      setLastSync(new Date().toLocaleTimeString(tx({ he: "he-IL", en: "en-US" }, language)));
    } catch (err) {
      setError(tx({ he: "שגיאה בטעינת נתונים מ-Meta. בדוק שהחשבון פעיל.", en: "Error loading data from Meta." }, language));
    } finally {
      setLoading(false);
    }
  }, [accountId, accessToken, datePreset, result, language]);

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
            {tx({ he: "ניטור ביצועים", en: "Performance Monitor" }, language)}
          </h3>
          {lastSync && (
            <p className="text-xs text-muted-foreground">
              {tx({ he: `עדכון אחרון: ${lastSync}`, en: `Last sync: ${lastSync}` }, language)}
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
                {tx(label, language)}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={sync} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {tx({ he: "רענן", en: "Refresh" }, language)}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-4 flex items-center gap-2 text-sm text-destructive">
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
                {tx({ he: "בריאות הקמפיין", en: "Campaign Health" }, language)}
              </p>
              <p className="text-2xl font-bold">{health.score}%</p>
            </div>
            <Badge
              className={`text-sm px-3 py-1 ${
                health.color === "green"
                  ? getKpiStatusColor("good").bg + " " + getKpiStatusColor("good").text + " " + getKpiStatusColor("good").border
                  : health.color === "yellow"
                  ? getKpiStatusColor("warning").bg + " " + getKpiStatusColor("warning").text + " " + getKpiStatusColor("warning").border
                  : getKpiStatusColor("critical").bg + " " + getKpiStatusColor("critical").text + " " + getKpiStatusColor("critical").border
              }`}
              variant="outline"
            >
              {tx(health.label, language)}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* KPI Gaps */}
      {gaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {tx({ he: "KPIs מול יעדים", en: "KPIs vs Targets" }, language)}
            </CardTitle>
            <CardDescription>
              {tx({ he: "השוואה בין ביצועי הקמפיין לתוכנית שנוצרה", en: "Comparing campaign performance to your funnel plan" }, language)}
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
            {tx({ he: "פעולות מומלצות לשבוע הקרוב", en: "Recommended actions this week" }, language)}
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
            <CardTitle className="text-base">{tx({ he: "נתוני גלם", en: "Raw Metrics" }, language)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              {[
                { label: tx({ he: "הוצאה", en: "Spend" }, language), value: `₪${parseFloat(insights.spend).toLocaleString()}` },
                { label: tx({ he: "חשיפות", en: "Impressions" }, language), value: parseInt(insights.impressions).toLocaleString() },
                { label: tx({ he: "קליקים", en: "Clicks" }, language), value: parseInt(insights.clicks).toLocaleString() },
                { label: "CTR", value: `${parseFloat(insights.ctr).toFixed(2)}%` },
                { label: "CPC", value: `₪${parseFloat(insights.cpc).toFixed(2)}` },
                { label: "CPM", value: `₪${parseFloat(insights.cpm).toFixed(2)}` },
                { label: tx({ he: "טווח", en: "Reach" }, language), value: parseInt(insights.reach).toLocaleString() },
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
