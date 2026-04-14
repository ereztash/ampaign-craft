// ═══════════════════════════════════════════════
// StrategyTab — extracted from ResultsDashboard
//
// Receives the precomputed values from the parent (healthScore,
// hormoziValue, roiEstimate, ...) rather than recomputing them,
// so this component stays pure and cheap to render.
//
// Progressive disclosure rules:
//  - ALWAYS visible: health score, Hormozi value, social proof,
//    ROI estimate, funnel stage cards (the main "what did I get").
//  - DEFAULT COLLAPSED: Israeli toolkit, WhatsApp templates pane,
//    market calendar, retention flywheel, CLG strategy, personalized
//    tips — advanced / reference content that shouldn't overwhelm
//    a first-time viewer.
// ═══════════════════════════════════════════════

import { lazy, Suspense, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { tx } from "@/i18n/tx";
import { ChevronDown, MessageCircle } from "lucide-react";
import type { FunnelResult } from "@/types/funnel";
import type { calculateHealthScore } from "@/engine/healthScoreEngine";
import { getHealthScoreColor } from "@/engine/healthScoreEngine";
import type { calculateValueScore } from "@/engine/hormoziValueEngine";
import type { calculateRoi } from "@/lib/roiCalculator";
import type { getSocialProof } from "@/lib/socialProofData";
import type { getIsraeliToolsSummary } from "@/lib/toolRecommendations";
import type { getEventsForField } from "@/lib/israeliMarketCalendar";
import type { generateRetentionFlywheel } from "@/engine/retentionFlywheelEngine";
import type { generateCLGStrategy } from "@/engine/clgEngine";
import { funnelStageColors, chartColorPalette } from "@/lib/colorSemantics";
import { getToolsForChannel } from "@/lib/toolRecommendations";
import { HormoziValueCard } from "@/components/HormoziValueCard";
import { cn } from "@/lib/utils";

const WhatsAppTemplatesPanel = lazy(() => import("@/components/WhatsAppTemplatesPanel"));

const STAGE_IDS = ["awareness", "engagement", "leads", "conversion", "retention"];

const NEURO_LABELS: Record<
  string,
  { emoji: string; vector: { he: string; en: string }; desc: { he: string; en: string } }
> = {
  awareness: {
    emoji: "●",
    vector: { he: "קורטיזול", en: "Cortisol" },
    desc: { he: "תפוס קשב דרך מתח אסטרטגי", en: "Grab attention through strategic tension" },
  },
  engagement: {
    emoji: "●",
    vector: { he: "אוקסיטוצין", en: "Oxytocin" },
    desc: { he: "בנה אמון דרך חיבור", en: "Build trust through connection" },
  },
  leads: {
    emoji: "●",
    vector: { he: "הזדמנות", en: "Opportunity" },
    desc: { he: "מתח → תגמול: תפוס את הרגע", en: "Tension → reward: seize the moment" },
  },
  conversion: {
    emoji: "●",
    vector: { he: "דופמין", en: "Dopamine" },
    desc: { he: "רגע התגמול: הפוך להחלטה", en: "Reward moment: convert to decision" },
  },
  retention: {
    emoji: "●",
    vector: { he: "אוקסיטוצין", en: "Oxytocin" },
    desc: { he: "אמון מתמשך: הישאר איתנו", en: "Ongoing trust: stay with us" },
  },
};

export interface StrategyTabProps {
  result: FunnelResult;
  language: "he" | "en";
  isHe: boolean;
  t: (key: string) => string;
  healthScore: ReturnType<typeof calculateHealthScore>;
  hormoziValue: ReturnType<typeof calculateValueScore>;
  socialProof: ReturnType<typeof getSocialProof>;
  roiEstimate: ReturnType<typeof calculateRoi>;
  israeliTools: ReturnType<typeof getIsraeliToolsSummary>;
  marketEvents: ReturnType<typeof getEventsForField>;
  flywheel: ReturnType<typeof generateRetentionFlywheel>;
  clgStrategy: ReturnType<typeof generateCLGStrategy>;
  recommendedChannelsLabel: string;
}

const StrategyTab = ({
  result,
  language,
  isHe,
  t,
  healthScore,
  hormoziValue,
  socialProof,
  roiEstimate,
  israeliTools,
  marketEvents,
  flywheel,
  clgStrategy,
  recommendedChannelsLabel,
}: StrategyTabProps) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);

  return (
    <div>
      {/* ─── Always-visible core: health score, Hormozi, social proof, ROI, stages ─── */}

      {/* Marketing Health Score */}
      <Card className="mb-6 border-primary/20">
        <CardContent className="flex items-center gap-6 p-6">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
            <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90" aria-hidden="true">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-muted/30"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={getHealthScoreColor(healthScore.total)}
                strokeWidth="3"
                strokeDasharray={`${healthScore.total}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <span
              className="absolute text-xl font-bold text-foreground"
              aria-label={
                isHe
                  ? `ציון בריאות ${healthScore.total} מתוך 100`
                  : `Health score ${healthScore.total} out of 100`
              }
            >
              {healthScore.total}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">
              {tx({ he: "ציון בריאות שיווקית", en: "Marketing Health Score" }, language)}
            </h3>
            <div className="mt-2 grid gap-1.5">
              {healthScore.breakdown.map((b) => (
                <div key={b.category} className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-muted/30">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${(b.score / b.maxScore) * 100}%`,
                        background: getHealthScoreColor((b.score / b.maxScore) * 100),
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-24 text-end">{b.label[language]}</span>
                  <span className="text-xs font-medium w-8">
                    {b.score}/{b.maxScore}
                  </span>
                </div>
              ))}
              {healthScore.retentionReadiness && (
                <div className="flex items-center gap-2 pt-1 border-t border-muted/20">
                  <div className="h-1.5 flex-1 rounded-full bg-muted/30">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${healthScore.retentionReadiness.score}%`,
                        background: getHealthScoreColor(healthScore.retentionReadiness.score),
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-24 text-end">
                    {tx({ he: "מוכנות שימור", en: "Retention" }, language)}
                  </span>
                  <span className="text-xs font-medium w-8">
                    {healthScore.retentionReadiness.score}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hormozi Value Equation */}
      <div className="mb-6">
        <HormoziValueCard data={hormoziValue} />
      </div>

      {/* Social Proof */}
      <div className="mb-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span className="inline-flex h-2 w-2 rounded-full bg-accent animate-pulse" aria-hidden="true" />
        {isHe
          ? `${socialProof.usersCount.toLocaleString()} עסקים בתחום שלך כבר השתמשו ב-FunnelForge`
          : `${socialProof.usersCount.toLocaleString()} businesses in your field already use FunnelForge`}
        <span className="font-semibold text-accent">{socialProof.topMetricValue}</span>
        <span>{socialProof.topMetric[language]}</span>
      </div>

      {/* ROI Estimate */}
      {roiEstimate.monthlyImpact > 0 && (
        <div className="mb-6 rounded-xl border border-accent/20 bg-accent/5 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            {tx({ he: "אם המשפך הזה ישפר המרות ב-", en: "If this funnel improves conversions by " }, language)}
            <span className="font-bold text-foreground">{roiEstimate.improvementPercent}%</span>
            {tx({ he: " בלבד:", en: " alone:" }, language)}
          </p>
          <p className="mt-1 text-lg font-bold text-accent">{roiEstimate.potentialSaving[language]}</p>
        </div>
      )}

      {/* Funnel stage cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {result.stages.map((stage, i) => {
          const stageId = STAGE_IDS[i] || "engagement";
          const colors = funnelStageColors[stageId];
          return (
            <Card key={stage.id} className={`border-s-4 ${colors?.border || ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-accent-foreground"
                    style={{ background: chartColorPalette[i] }}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{stage.name[language]}</CardTitle>
                    {NEURO_LABELS[stageId] && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs" aria-hidden="true">
                          {NEURO_LABELS[stageId].emoji}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {NEURO_LABELS[stageId].vector[language]}
                        </span>
                        <span className="text-xs text-muted-foreground">—</span>
                        <span className="text-xs text-muted-foreground italic">
                          {NEURO_LABELS[stageId].desc[language]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-muted-foreground">{stage.description[language]}</p>
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-foreground">{recommendedChannelsLabel}:</div>
                  {stage.channels.map((ch, j) => {
                    const tools = getToolsForChannel(ch.channel);
                    return (
                      <div key={j} className="rounded-lg bg-muted/50 p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">
                            {ch.channel === "whatsapp" && (
                              <MessageCircle
                                className="inline h-3.5 w-3.5 me-1 text-green-500"
                                aria-hidden="true"
                              />
                            )}
                            {ch.name[language]}
                          </span>
                          <span className="text-sm text-primary font-semibold">
                            {ch.budgetPercent}%
                          </span>
                        </div>
                        {ch.tips.map((tip, k) => (
                          <p key={k} className="mt-1 text-xs text-muted-foreground">
                            💡 {tip[language]}
                          </p>
                        ))}
                        {tools.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {tools.map((tool, ti) => (
                              <span
                                key={ti}
                                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                              >
                                🇮🇱 {tool.tool}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ─── Progressive disclosure: advanced content collapsed by default ─── */}

      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="mt-6">
        <Card className="border-primary/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  {tx({ he: "🛠️ ערכת כלים ישראלית + תובנות מתקדמות", en: "🛠️ Israeli toolkit + advanced insights" }, language)}
                </span>
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {isHe
                  ? "תבניות WhatsApp, לוח שיווק ישראלי, אסטרטגיית שימור וקהילה"
                  : "WhatsApp templates, Israeli marketing calendar, retention & community strategy"}
              </p>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Israeli Tools */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  🇮🇱 {t("israeliToolsTitle")}
                </h4>
                <p className="text-xs text-muted-foreground mb-3">{t("israeliToolsSubtitle")}</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {israeliTools.map((tool, i) => (
                    <div key={i} className="rounded-xl border p-3">
                      <div className="font-semibold text-foreground">{tool.tool}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{tool.role[language]}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* WhatsApp Templates — lazy loaded because it's heavy */}
              <div className="pt-2 border-t border-muted/30">
                <Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
                  <WhatsAppTemplatesPanel />
                </Suspense>
              </div>

              {/* Israeli Market Calendar */}
              {marketEvents.length > 0 && (
                <div className="pt-2 border-t border-muted/30">
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    📅 {tx({ he: "לוח שיווק ישראלי — אירועים קרובים", en: "Israeli Marketing Calendar — Upcoming Events" }, language)}
                  </h4>
                  <div className="space-y-2">
                    {marketEvents.slice(0, 3).map((event) => (
                      <div key={event.id} className="flex items-start gap-3 rounded-lg border p-2.5">
                        <span className="text-lg" aria-hidden="true">
                          {event.emoji}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{event.name[language]}</div>
                          <p className="text-xs text-muted-foreground">
                            {event.recommendation[language]}
                          </p>
                          {event.budgetMultiplier !== 1.0 && (
                            <Badge
                              variant={event.budgetMultiplier > 1 ? "default" : "outline"}
                              className="mt-1 text-xs"
                            >
                              {tx({ he: "תקציב", en: "Budget" }, language)} ×{event.budgetMultiplier}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Retention Flywheel */}
              <div className="pt-2 border-t border-muted/30">
                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  🔄 {flywheel.typeLabel[language]}
                  <Badge variant="outline" className="text-xs">
                    {tx({ he: `צמצום נטישה ~${flywheel.churnReduction}%`, en: `~${flywheel.churnReduction}% churn reduction` }, language)}
                  </Badge>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {flywheel.steps.map((step, i) => (
                    <div key={i} className="rounded-xl border p-2.5 text-center">
                      <div className="text-lg mb-1" aria-hidden="true">
                        {step.emoji}
                      </div>
                      <div className="text-xs font-medium">{step.name[language]}</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step.description[language]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CLG Strategy (if suitable) */}
              {clgStrategy.suitable && (
                <div className="pt-2 border-t border-muted/30">
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    👥 {tx({ he: "אסטרטגיית קהילה (CLG)", en: "Community-Led Growth (CLG)" }, language)}
                    <Badge className="text-xs">LTV ×{clgStrategy.ltvImpact.multiplier}</Badge>
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">{clgStrategy.reason[language]}</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    {tx({ he: "פלטפורמה מומלצת:", en: "Recommended platform:" }, language)}{" "}
                    <strong>{clgStrategy.platform[language]}</strong>
                  </p>
                  <div className="space-y-1.5">
                    {clgStrategy.roadmap.map((week) => (
                      <div key={week.week} className="flex items-start gap-2 text-xs">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {tx({ he: `שבוע ${week.week}`, en: `Week ${week.week}` }, language)}
                        </Badge>
                        <span className="text-muted-foreground">
                          {week.title[language]}: {week.milestone[language]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Personalized Tips (collapsible) */}
      <Collapsible open={tipsOpen} onOpenChange={setTipsOpen} className="mt-4">
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base">
                {t("personalizedTips")}
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", tipsOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-3">
                {result.overallTips.map((tip, i) => (
                  <div key={i} className="rounded-xl bg-muted/50 p-4 text-foreground">
                    {tip[language]}
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default StrategyTab;
