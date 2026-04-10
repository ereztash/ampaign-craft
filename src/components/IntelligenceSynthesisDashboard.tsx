// ═══════════════════════════════════════════════
// Intelligence Synthesis Dashboard
// The integration point where all Workstream C engines
// converge into a unified behavioral intelligence view.
// ═══════════════════════════════════════════════

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Target, Users, Lightbulb, TrendingUp } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

import type { EPSResult } from "@/engine/emotionalPerformanceEngine";
import type { CrossDomainReport } from "@/engine/crossDomainBenchmarkEngine";
import type { PredictiveContentScore } from "@/engine/predictiveContentScoreEngine";
import type { CohortAssignment } from "@/engine/behavioralCohortEngine";
import { getEPSVerdict } from "@/engine/emotionalPerformanceEngine";
import { getPredictiveContentVerdict } from "@/engine/predictiveContentScoreEngine";

interface IntelligenceSynthesisDashboardProps {
  eps?: EPSResult;
  crossDomain?: CrossDomainReport;
  predictiveScore?: PredictiveContentScore;
  cohort?: CohortAssignment;
}

export function IntelligenceSynthesisDashboard({
  eps,
  crossDomain,
  predictiveScore,
  cohort,
}: IntelligenceSynthesisDashboardProps) {
  const { language } = useLanguage();
  const t = (he: string, en: string) => (language === "he" ? he : en);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          {t("סינתזת מודיעין התנהגותי", "Behavioral Intelligence Synthesis")}
        </CardTitle>
        <CardDescription>
          {t(
            "ארבעה מנועים ב-dashboard אחד — EPS, Cross-Domain, Predictive Score, Behavioral Cohort",
            "Four engines in one dashboard — EPS, Cross-Domain, Predictive Score, Behavioral Cohort",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="eps" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4">
            <TabsTrigger value="eps" className="gap-1 text-xs">
              <Brain className="h-3.5 w-3.5" />
              EPS
            </TabsTrigger>
            <TabsTrigger value="predictive" className="gap-1 text-xs">
              <Target className="h-3.5 w-3.5" />
              {t("ניבוי", "Predictive")}
            </TabsTrigger>
            <TabsTrigger value="cross_domain" className="gap-1 text-xs">
              <Lightbulb className="h-3.5 w-3.5" />
              {t("צולב-תעשייה", "Cross-Domain")}
            </TabsTrigger>
            <TabsTrigger value="cohort" className="gap-1 text-xs">
              <Users className="h-3.5 w-3.5" />
              {t("קוהורט", "Cohort")}
            </TabsTrigger>
          </TabsList>

          {/* EPS TAB */}
          <TabsContent value="eps" className="space-y-4">
            {eps ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {t("ציון ביצועים רגשי", "Emotional Performance Score")}
                    </div>
                    <div className="text-4xl font-bold">{eps.score}</div>
                    <Badge variant="outline" className="mt-1">
                      {getEPSVerdict(eps.score)[language]}
                    </Badge>
                  </div>
                  <div className="h-56 w-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        data={[
                          { emotion: "Cortisol", value: eps.emotionalBalance.cortisol },
                          { emotion: "Oxytocin", value: eps.emotionalBalance.oxytocin },
                          { emotion: "Dopamine", value: eps.emotionalBalance.dopamine },
                        ]}
                      >
                        <PolarGrid />
                        <PolarAngleAxis dataKey="emotion" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Radar dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                        <RechartsTooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricBar label={t("איכות קופי", "Copy Quality")} value={eps.components.copyQuality} />
                  <MetricBar label={t("התאמת מותג", "Brand Align")} value={eps.components.brandAlignment} />
                  <MetricBar label={t("התאמת DISC", "DISC Align")} value={eps.components.discAlignment} />
                  <MetricBar label={t("אותנטיות", "Authenticity")} value={eps.components.stylomeAuthenticity} />
                </div>

                {eps.recommendations.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{t("המלצות", "Recommendations")}</div>
                    <ul className="space-y-1">
                      {eps.recommendations.slice(0, 3).map((r, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <TrendingUp className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          {r[language]}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <EmptyState label={t("אין נתוני EPS", "No EPS data")} />
            )}
          </TabsContent>

          {/* PREDICTIVE TAB */}
          <TabsContent value="predictive" className="space-y-4">
            {predictiveScore ? (
              <>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">
                    {t("ציון ניבוי כולל", "Overall Predictive Score")}
                  </div>
                  <div className="text-4xl font-bold">{predictiveScore.overallScore}</div>
                  <Badge variant="outline" className="mt-1">
                    {getPredictiveContentVerdict(predictiveScore.overallScore)[language]}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {t("מעורבות צפויה", "Predicted engagement")}
                    </div>
                    <Progress value={predictiveScore.engagementPrediction} className="h-2" />
                    <div className="text-sm font-medium mt-1">{predictiveScore.engagementPrediction}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {t("המרה צפויה", "Predicted conversion")}
                    </div>
                    <Progress value={predictiveScore.conversionPrediction} className="h-2" />
                    <div className="text-sm font-medium mt-1">{predictiveScore.conversionPrediction}</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-sm font-medium">{t("התאמת ערוצים", "Channel Fit")}</div>
                  {predictiveScore.channelFit.map((ch) => (
                    <div key={ch.channel} className="flex items-center gap-2">
                      <span className="text-xs w-20 capitalize">{ch.channel}</span>
                      <Progress value={ch.fit} className="h-1.5 flex-1" />
                      <span className="text-xs w-8 text-right">{ch.fit}</span>
                    </div>
                  ))}
                </div>

                {predictiveScore.improvementSuggestions.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{t("הצעות לשיפור", "Improvements")}</div>
                    <ul className="space-y-1">
                      {predictiveScore.improvementSuggestions.slice(0, 3).map((s, i) => (
                        <li key={i} className="text-xs text-muted-foreground">• {s[language]}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <EmptyState label={t("אין ציון ניבוי", "No predictive score")} />
            )}
          </TabsContent>

          {/* CROSS-DOMAIN TAB */}
          <TabsContent value="cross_domain" className="space-y-3">
            {crossDomain && crossDomain.insights.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">{crossDomain.summary[language]}</p>
                <div className="space-y-2">
                  {crossDomain.insights.slice(0, 6).map((insight, i) => (
                    <Card key={i} className="border-l-4 border-l-amber-500/40">
                      <CardContent className="pt-3 pb-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {insight.sourceIndustry} → {insight.targetIndustry}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{insight.expectedLift}</Badge>
                            <Badge variant="outline" className="text-xs">{insight.confidence}%</Badge>
                          </div>
                        </div>
                        <div className="text-sm font-medium">{insight.transferableStrategy[language]}</div>
                        <div className="text-xs text-muted-foreground">{insight.rationale[language]}</div>
                        <div className="flex gap-1 flex-wrap">
                          {insight.applicableChannels.map((ch) => (
                            <Badge key={ch} variant="outline" className="text-[10px] h-4 px-1.5">{ch}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState label={t("אין תובנות צולבות", "No cross-domain insights")} />
            )}
          </TabsContent>

          {/* COHORT TAB */}
          <TabsContent value="cohort" className="space-y-3">
            {cohort ? (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge>{cohort.primaryCohort.name[language]}</Badge>
                      <Badge variant="outline">
                        {cohort.matchConfidence}% {t("ביטחון", "confidence")}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">{cohort.rationale[language]}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {cohort.primaryCohort.characteristics.map((c, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {c.label[language]}: {c.value[language]}
                        </Badge>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <div className="text-xs text-muted-foreground">{t("המרה", "Conversion")}</div>
                        <div className="text-sm font-semibold">{cohort.primaryCohort.avgMetrics.conversionRate}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">LTV</div>
                        <div className="text-sm font-semibold">{cohort.primaryCohort.avgMetrics.ltv}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">{t("נטישה", "Churn")}</div>
                        <div className="text-sm font-semibold">{cohort.primaryCohort.avgMetrics.churnRate}</div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-sm font-medium">{t("אסטרטגיות מובילות", "Top strategies")}</div>
                      {cohort.primaryCohort.topPerformingStrategies.map((s, i) => (
                        <div key={i} className="text-xs border-l-2 border-primary/30 pl-2">
                          <div className="font-medium">{s.title[language]}</div>
                          <div className="text-muted-foreground">{s.description[language]}</div>
                          <Badge variant="secondary" className="text-[10px] mt-1">{s.expectedLift}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {cohort.secondaryCohort && (
                  <div className="text-xs text-muted-foreground">
                    {t("קוהורט משני:", "Secondary cohort:")}{" "}
                    <Badge variant="outline">{cohort.secondaryCohort.name[language]}</Badge>
                  </div>
                )}
              </>
            ) : (
              <EmptyState label={t("לא הוקצה קוהורט", "No cohort assigned")} />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <Progress value={value} className="h-1.5" />
      <div className="text-xs font-medium mt-0.5">{value}</div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-10 text-center text-sm text-muted-foreground">{label}</div>
  );
}

export default IntelligenceSynthesisDashboard;
