import { useLanguage } from "@/i18n/LanguageContext";
import GlossaryTooltip from "@/components/GlossaryTooltip";
import { IndustryBenchmark } from "@/lib/industryBenchmarks";
import { chartColorPalette } from "@/lib/colorSemantics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tx } from "@/i18n/tx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { InsightActionCard, type ConfidenceLevel } from "@/components/InsightActionCard";
import { getPersistedUserState } from "@/lib/userStateClassifier";

interface PlanningTabProps {
  barData: { name: string; budget: number; fill: string }[];
  pieData: { name: string; value: number }[];
  kpis: { name: { he: string; en: string }; target: string; confidence?: string }[];
  benchmarks: IndustryBenchmark[];
}

const PlanningTab = ({ barData, pieData, kpis, benchmarks }: PlanningTabProps) => {
  const { t, language } = useLanguage();
  const isHe = language === "he";

  const topKpi = kpis[0];
  const topBenchmark = benchmarks[0];
  const marketingConfidence: ConfidenceLevel =
    topKpi?.confidence === "high" ? "stable"
    : topKpi?.confidence === "medium" ? "needs_data"
    : "intake_only";
  const userState = getPersistedUserState();

  return (
    <div className="space-y-6">
      {/* InsightActionCard — Marketing: the weekly move */}
      {topKpi && (
        <InsightActionCard
          module={{ he: "שיווק", en: "Marketing" }}
          answer={{
            he: `השבוע: הגע ל-${topKpi.target} ${topKpi.name.he}`,
            en: `This week: reach ${topKpi.target} ${topKpi.name.en}`,
          }}
          why={topBenchmark
            ? {
                he: `ממוצע בתעשייה: ${topBenchmark.metric.he} = ${topBenchmark.value}. ${topBenchmark.context.he}`,
                en: `Industry benchmark: ${topBenchmark.metric.en} = ${topBenchmark.value}. ${topBenchmark.context.en}`,
              }
            : {
                he: "מבוסס על הנתונים שלך",
                en: "Based on your funnel data",
              }
          }
          confidence={marketingConfidence}
          confidenceReason={{
            he: "מבוסס על הפרמטרים שהגדרת; אין נתונים אמיתיים עדיין",
            en: "Based on your configured parameters; no live analytics yet",
          }}
          useItNarrative={{
            he: `מדוד ${topKpi.name.he} כל שבוע ועדכן את הגרף מטה`,
            en: `Track ${topKpi.name.en} weekly and update the chart below`,
          }}
          useItCopy={[
            {
              label: { he: "יעד השבוע", en: "This week's target" },
              text: {
                he: `${topKpi.name.he}: ${topKpi.target}`,
                en: `${topKpi.name.en}: ${topKpi.target}`,
              },
            },
          ]}
          checkOptions={[
            { label: { he: "מדויק", en: "Accurate" }, action: "accept" },
            { label: { he: "אין לי קהל עדיין", en: "No audience yet" }, action: "reject" },
            { label: { he: "רוצה לראות פירוט", en: "Show breakdown" }, action: "refine" },
          ]}
          userState={userState}
          onCheck={() => undefined}
        />
      )}

    <div className="grid gap-6 md:grid-cols-2">
      {/* Left: Charts */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("budgetAllocation")} ({tx({ he: "לפי שלב", en: "by stage" }, language)})</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Bar dataKey="budget" radius={[8, 8, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("budgetAllocation")} ({tx({ he: "לפי ערוץ", en: "by channel" }, language)})</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name} ${value}%`}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={chartColorPalette[i % chartColorPalette.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Right: KPIs + Benchmarks */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("keyMetrics")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {kpis.map((kpi, i) => {
                // Detect glossary term from KPI name
                const glossaryKey = kpi.name.en.match(/CPC|CPL|CPA|CPM|ROAS|ROI|LTV|NPS|CTR/i)?.[0]?.toLowerCase();
                return (
                <div key={i} className="rounded-xl border p-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-muted-foreground">{kpi.name[language]}</span>
                    {glossaryKey && <GlossaryTooltip termKey={glossaryKey} />}
                    {kpi.confidence && (
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          kpi.confidence === "high" ? "bg-accent" :
                          kpi.confidence === "medium" ? "bg-chart-3" :
                          "bg-destructive/50"
                        }`}
                        title={kpi.confidence === "high" ? (tx({ he: "ביטחון גבוה", en: "High confidence" }, language)) :
                               kpi.confidence === "medium" ? (tx({ he: "ביטחון בינוני", en: "Medium confidence" }, language)) :
                               (tx({ he: "ביטחון נמוך", en: "Low confidence" }, language))}
                      />
                    )}
                  </div>
                  <div className="mt-1 text-xl font-bold text-primary">{kpi.target}</div>
                </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {benchmarks.length > 0 && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                🇮🇱 {t("industryBenchmarkTitle")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{t("industryBenchmarkSubtitle")}</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {benchmarks.map((bm, i) => (
                  <div key={i} className="rounded-xl border border-primary/10 bg-primary/5 p-3">
                    <div className="text-sm font-medium text-foreground">{bm.metric[language]}</div>
                    <div className="mt-1 text-lg font-bold text-primary">{bm.value}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{bm.context[language]}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </div>
  );
};

export default PlanningTab;
