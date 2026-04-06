import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import AdaptiveTabNav from "@/components/AdaptiveTabNav";

const BrandDiagnosticTab = lazy(() => import("@/components/BrandDiagnosticTab"));
const PlanningTab = lazy(() => import("@/components/PlanningTab"));
const ContentTab = lazy(() => import("@/components/ContentTab"));
const AnalyticsTab = lazy(() => import("@/components/AnalyticsTab"));
const AiCoachChat = lazy(() => import("@/components/AiCoachChat"));
const WhatsAppTemplatesPanel = lazy(() => import("@/components/WhatsAppTemplatesPanel"));
const StylomeExtractor = lazy(() => import("@/components/StylomeExtractor"));
const SalesTab = lazy(() => import("@/components/SalesTab"));
const PricingIntelligenceTab = lazy(() => import("@/components/PricingIntelligenceTab"));
const RetentionGrowthTab = lazy(() => import("@/components/RetentionGrowthTab"));
import { useMetaAuth } from "@/hooks/useMetaAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { FunnelResult } from "@/types/funnel";
import { getTabConfig } from "@/lib/adaptiveTabRules";
import { funnelStageColors, chartColorPalette } from "@/lib/colorSemantics";
import { getIsraeliToolsSummary, getToolsForChannel } from "@/lib/toolRecommendations";
import { getIndustryBenchmarks } from "@/lib/industryBenchmarks";
import { calculateHealthScore, getHealthScoreColor } from "@/engine/healthScoreEngine";
import { getSocialProof } from "@/lib/socialProofData";
import { calculateRoi } from "@/lib/roiCalculator";
import { calculateCostOfInaction } from "@/engine/costOfInactionEngine";
import { getEventsForField } from "@/lib/israeliMarketCalendar";
import { generateCLGStrategy } from "@/engine/clgEngine";
import { generateRetentionFlywheel } from "@/engine/retentionFlywheelEngine";
import { personalizeResult } from "@/engine/funnelEngine";
import { buildUserKnowledgeGraph, StylomeVoice } from "@/engine/userKnowledgeGraph";
import { DifferentiationResult } from "@/types/differentiation";
import { useSavedPlans } from "@/hooks/useSavedPlans";
import { useAchievements } from "@/hooks/useAchievements";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import PaywallModal from "@/components/PaywallModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { motion } from "framer-motion";
import { Edit, Download, Save, Share2, Plus, AlertTriangle, MessageCircle, ChevronDown, Bot } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ResultsDashboardProps {
  result: FunnelResult;
  defaultTab?: string;
  onEdit: () => void;
  onNewPlan: () => void;
}

const STAGE_IDS = ["awareness", "engagement", "leads", "conversion", "retention"];

const NEURO_LABELS: Record<string, { emoji: string; vector: { he: string; en: string }; desc: { he: string; en: string } }> = {
  awareness: { emoji: "●", vector: { he: "קורטיזול", en: "Cortisol" }, desc: { he: "תפוס קשב דרך מתח אסטרטגי", en: "Grab attention through strategic tension" } },
  engagement: { emoji: "●", vector: { he: "אוקסיטוצין", en: "Oxytocin" }, desc: { he: "בנה אמון דרך חיבור", en: "Build trust through connection" } },
  leads: { emoji: "●", vector: { he: "הזדמנות", en: "Opportunity" }, desc: { he: "מתח → תגמול: תפוס את הרגע", en: "Tension → reward: seize the moment" } },
  conversion: { emoji: "●", vector: { he: "דופמין", en: "Dopamine" }, desc: { he: "רגע התגמול: הפוך להחלטה", en: "Reward moment: convert to decision" } },
  retention: { emoji: "●", vector: { he: "אוקסיטוצין", en: "Oxytocin" }, desc: { he: "אמון מתמשך: הישאר איתנו", en: "Ongoing trust: stay with us" } },
};

const ResultsDashboard = ({ result, defaultTab: routeTab, onEdit, onNewPlan }: ResultsDashboardProps) => {
  const { t, language } = useLanguage();
  const { profile } = useUserProfile();
  const reducedMotion = useReducedMotion();
  const isHe = language === "he";
  const { auth, accounts, loading: metaLoading, error: metaError, connect, disconnect } = useMetaAuth();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccountName, setSelectedAccountName] = useState<string | null>(null);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);

  // Adaptive tabs (6 consolidated tabs)
  const tabs = getTabConfig(result, profile);
  const defaultTab = routeTab || tabs[0]?.id || "strategy";
  const tabMap = new Map(tabs.map((t) => [t.id, t]));
  const isSimplified = (id: string) => tabMap.get(id)?.simplifiedMode ?? false;

  // Load saved differentiation + stylome from localStorage (if available)
  const diffResult = useMemo<DifferentiationResult | null>(() => {
    try {
      const raw = localStorage.getItem("funnelforge-differentiation-result");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);
  const stylomeVoice = useMemo<StylomeVoice | null>(() => {
    try {
      const raw = localStorage.getItem("funnelforge-stylome-voice");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  // Knowledge graph + personalized result
  const graph = useMemo(
    () => buildUserKnowledgeGraph(result.formData, diffResult, stylomeVoice, { visitCount: profile.visitCount, streak: 0, mastery: 0, segment: profile.userSegment }),
    [result.formData, diffResult, stylomeVoice, profile.visitCount, profile.userSegment],
  );
  const personalizedResult = useMemo(() => personalizeResult(result, graph), [result, graph]);

  // MOAT features (memoized — only recompute when result changes)
  const healthScore = useMemo(() => calculateHealthScore(result), [result]);
  const costOfInaction = useMemo(() => calculateCostOfInaction(result), [result]);
  const marketEvents = useMemo(() => getEventsForField(result.formData.businessField || "other"), [result.formData.businessField]);
  const clgStrategy = useMemo(() => generateCLGStrategy(result.formData), [result.formData]);
  const flywheel = useMemo(() => generateRetentionFlywheel(result.formData), [result.formData]);
  const socialProof = useMemo(() => getSocialProof(result.formData.businessField || "other"), [result.formData.businessField]);
  const roiEstimate = useMemo(() => calculateRoi(result.formData), [result.formData]);
  const { unlock, trackFeature } = useAchievements(language);
  const featureGate = useFeatureGate();
  const { savePlan: savePlanToStore, plans: savedPlans } = useSavedPlans();

  // Auto-trigger achievements on mount
  useEffect(() => {
    unlock("first_plan");
    if (language === "he") unlock("hebrew_power");
    if (healthScore.total >= 80) unlock("high_score");
  }, [unlock, language, healthScore.total]);

  // Track feature usage when switching tabs
  const handleTabChange = (tabId: string) => {
    trackFeature(tabId);
  };

  // Data for planning tab (memoized)
  const israeliTools = useMemo(() => getIsraeliToolsSummary(), []);
  const benchmarks = useMemo(() => getIndustryBenchmarks(result.formData.businessField), [result.formData.businessField]);

  const barData = useMemo(() => result.stages.map((stage, i) => ({
    name: stage.name[language],
    budget: stage.budgetPercent,
    fill: chartColorPalette[i % chartColorPalette.length],
  })), [result.stages, language]);

  const pieData = useMemo(() => result.stages.flatMap((stage) =>
    stage.channels.map((ch) => ({
      name: ch.name[language],
      value: Math.round((ch.budgetPercent * stage.budgetPercent) / 100),
    }))
  ).reduce<{ name: string; value: number }[]>((acc, item) => {
    const existing = acc.find((a) => a.name === item.name);
    if (existing) existing.value += item.value;
    else acc.push({ ...item });
    return acc;
  }, []), [result.stages, language]);

  const savePlan = async () => {
    await savePlanToStore(result, result.funnelName[language]);
    toast.success(t("planSaved"));
    trackFeature("plan_saved");
    if (savedPlans.length + 1 >= 5) unlock("five_plans");
  };

  const exportPdf = async () => {
    if (!featureGate.checkAccess("pdfExport", "pro")) return;
    const html2canvas = (await import("html2canvas")).default;
    const jsPDF = (await import("jspdf")).default;
    const el = document.getElementById("results-content");
    if (!el) return;
    const canvas = await html2canvas(el, { scale: 2 });
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 10, imgWidth, imgHeight);
    pdf.save(`${result.funnelName[language]}.pdf`);
  };

  const sharePlan = () => {
    const text = `${result.funnelName[language]}\n${t("estimatedBudget")}: ₪${result.totalBudget.min.toLocaleString()}-₪${result.totalBudget.max.toLocaleString()}${t("perMonth")}`;
    if (navigator.share) {
      navigator.share({ title: result.funnelName[language], text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success(isHe ? "הועתק ללוח" : "Copied to clipboard");
    }
  };

  const motionProps = reducedMotion
    ? { initial: undefined, animate: undefined, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

  const stageMotionProps = (delay: number) =>
    reducedMotion ? {} : { initial: { scaleX: 0 }, animate: { scaleX: 1 }, transition: { delay } };

  return (
    <>
    <div className="min-h-screen px-4 pt-24 pb-12">
      <div className="mx-auto max-w-5xl" id="results-content">
        {/* Header */}
        <motion.div {...motionProps} className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-foreground sm:text-4xl">{t("resultsTitle")}</h1>
          <p className="text-lg text-muted-foreground">{t("resultsSubtitle")}</p>
          <div className="mt-4 inline-block rounded-full bg-primary/10 px-6 py-2">
            <span className="font-bold text-primary">{result.funnelName[language]}</span>
            <span className="mx-3 text-border">|</span>
            <span className="text-muted-foreground">
              ₪{result.totalBudget.min.toLocaleString()} – ₪{result.totalBudget.max.toLocaleString()} {t("perMonth")}
            </span>
          </div>
        </motion.div>

        {/* Funnel Visualization */}
        <motion.div {...motionProps} transition={reducedMotion ? { duration: 0 } : { delay: 0.2 }} className="mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-2">
                {result.stages.map((stage, i) => {
                  const widthPercent = 100 - i * 15;
                  const stageId = STAGE_IDS[i] || "engagement";
                  return (
                    <motion.div
                      key={stage.id}
                      {...stageMotionProps(0.3 + i * 0.1)}
                      className="relative flex items-center justify-center rounded-lg py-4 text-center text-white shadow-sm"
                      style={{
                        width: `${widthPercent}%`,
                        background: funnelStageColors[stageId]?.gradient || chartColorPalette[i % chartColorPalette.length],
                        minHeight: "56px",
                      }}
                    >
                      <div>
                        <div className="text-sm font-bold drop-shadow-sm">{stage.name[language]}</div>
                        <div className="text-xs opacity-90 drop-shadow-sm">
                          {NEURO_LABELS[stageId]?.emoji} {NEURO_LABELS[stageId]?.vector[language]} · {stage.budgetPercent}%
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cost of Inaction Banner */}
        <Card className="mb-6 border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4">
            <span className="text-2xl">🔥</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground" dir="auto">{costOfInaction.lossFramedMessage[language]}</p>
              <p className="text-xs text-muted-foreground mt-0.5" dir="auto">{costOfInaction.comparisonMessage[language]}</p>
            </div>
          </CardContent>
        </Card>

        {/* Differentiation Upgrade CTA (for Path A users) */}
        {!diffResult && (
          <Card className="mb-4 border-dashed border-2 border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex flex-col sm:flex-row items-center gap-3 p-4">
              <span className="text-2xl">🎯</span>
              <div className="flex-1 text-center sm:text-start">
                <p className="text-sm font-medium text-foreground" dir="auto">
                  {isHe ? "רוצה סקריפטים עם שמות המתחרים שלך והבידול האמיתי?" : "Want scripts with your competitor names and real differentiation?"}
                </p>
                <p className="text-xs text-muted-foreground" dir="auto">
                  {isHe ? "10 דקות שישדרגו את כל התוצאות — hooks, קופי, סקריפטי מכירה" : "10 minutes that will upgrade all results — hooks, copy, sales scripts"}
                </p>
              </div>
              <a href="/differentiate" className="shrink-0">
                <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white">
                  {isHe ? "השלם בידול →" : "Complete Differentiation →"}
                </Button>
              </a>
            </CardContent>
          </Card>
        )}

        {/* === CONSOLIDATED TABS === */}
        <Tabs defaultValue={defaultTab} className="mb-8" onValueChange={handleTabChange}>
          <AdaptiveTabNav tabs={tabs} />
          <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading...</div>}>

          {/* Tab 1: Strategy + Tips (collapsible) */}
          <TabsContent value="strategy" className="mt-6">
            {/* Marketing Health Score */}
            <Card className="mb-6 border-primary/20">
              <CardContent className="flex items-center gap-6 p-6">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                  <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
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
                  <span className="absolute text-xl font-bold text-foreground">{healthScore.total}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    {isHe ? "ציון בריאות שיווקית" : "Marketing Health Score"}
                  </h3>
                  <div className="mt-2 grid gap-1.5">
                    {healthScore.breakdown.map((b) => (
                      <div key={b.category} className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-muted/30">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${(b.score / b.maxScore) * 100}%`, background: getHealthScoreColor((b.score / b.maxScore) * 100) }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-24 text-end">{b.label[language]}</span>
                        <span className="text-xs font-medium w-8">{b.score}/{b.maxScore}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Social Proof */}
            <div className="mb-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex h-2 w-2 rounded-full bg-accent animate-pulse" />
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
                  {isHe ? "אם המשפך הזה ישפר המרות ב-" : "If this funnel improves conversions by "}
                  <span className="font-bold text-foreground">{roiEstimate.improvementPercent}%</span>
                  {isHe ? " בלבד:" : " alone:"}
                </p>
                <p className="mt-1 text-lg font-bold text-accent">{roiEstimate.potentialSaving[language]}</p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {result.stages.map((stage, i) => {
                const stageId = STAGE_IDS[i] || "engagement";
                const colors = funnelStageColors[stageId];
                return (
                  <Card key={stage.id} className={`border-l-4 ${colors?.border || ""}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-accent-foreground" style={{ background: chartColorPalette[i] }}>
                          {i + 1}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{stage.name[language]}</CardTitle>
                          {NEURO_LABELS[stageId] && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs">{NEURO_LABELS[stageId].emoji}</span>
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{NEURO_LABELS[stageId].vector[language]}</span>
                              <span className="text-xs text-muted-foreground">—</span>
                              <span className="text-xs text-muted-foreground italic">{NEURO_LABELS[stageId].desc[language]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-3 text-sm text-muted-foreground">{stage.description[language]}</p>
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-foreground">{t("recommendedChannels")}:</div>
                        {stage.channels.map((ch, j) => {
                          const tools = getToolsForChannel(ch.channel);
                          return (
                            <div key={j} className="rounded-lg bg-muted/50 p-3">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-foreground">
                                  {ch.channel === "whatsapp" && <MessageCircle className="inline h-3.5 w-3.5 mr-1 text-green-500" />}
                                  {ch.name[language]}
                                </span>
                                <span className="text-sm text-primary font-semibold">{ch.budgetPercent}%</span>
                              </div>
                              {ch.tips.map((tip, k) => (
                                <p key={k} className="mt-1 text-xs text-muted-foreground">💡 {tip[language]}</p>
                              ))}
                              {tools.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {tools.map((tool, ti) => (
                                    <span key={ti} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
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

            {/* ═══ Section B: Toolkit (collapsible) ═══ */}
            <Collapsible className="mt-6">
              <Card className="border-primary/20">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">🛠️ {isHe ? "ערכת כלים ישראלית" : "Israeli Toolkit"}</span>
                      <ChevronDown className="h-4 w-4 transition-transform" />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>

            {/* Israeli Tools */}
            <Card className="border-0 shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">🇮🇱 {t("israeliToolsTitle")}</CardTitle>
                <p className="text-sm text-muted-foreground">{t("israeliToolsSubtitle")}</p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {israeliTools.map((tool, i) => (
                    <div key={i} className="rounded-xl border p-3">
                      <div className="font-semibold text-foreground">{tool.tool}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{tool.role[language]}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp Templates — always show (WhatsApp = 98% of Israeli market) */}
            <WhatsAppTemplatesPanel />

            {/* Israeli Market Calendar */}
            {marketEvents.length > 0 && (
              <Card className="mt-4 border-amber-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    📅 {isHe ? "לוח שיווק ישראלי — אירועים קרובים" : "Israeli Marketing Calendar — Upcoming Events"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {marketEvents.slice(0, 3).map((event) => (
                    <div key={event.id} className="flex items-start gap-3 rounded-lg border p-2.5">
                      <span className="text-lg">{event.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{event.name[language]}</div>
                        <p className="text-xs text-muted-foreground">{event.recommendation[language]}</p>
                        {event.budgetMultiplier !== 1.0 && (
                          <Badge variant={event.budgetMultiplier > 1 ? "default" : "outline"} className="mt-1 text-xs">
                            {isHe ? "תקציב" : "Budget"} ×{event.budgetMultiplier}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Retention Flywheel */}
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  🔄 {flywheel.typeLabel[language]}
                  <Badge variant="outline" className="text-xs">
                    {isHe ? `צמצום נטישה ~${flywheel.churnReduction}%` : `~${flywheel.churnReduction}% churn reduction`}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {flywheel.steps.map((step, i) => (
                    <div key={i} className="rounded-xl border p-2.5 text-center">
                      <div className="text-lg mb-1">{step.emoji}</div>
                      <div className="text-xs font-medium">{step.name[language]}</div>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.description[language]}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* CLG Strategy (if suitable) */}
            {clgStrategy.suitable && (
              <Card className="mt-4 border-purple-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    👥 {isHe ? "אסטרטגיית קהילה (CLG)" : "Community-Led Growth (CLG)"}
                    <Badge className="text-xs">
                      LTV ×{clgStrategy.ltvImpact.multiplier}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{clgStrategy.reason[language]}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-2">{isHe ? "פלטפורמה מומלצת:" : "Recommended platform:"} <strong>{clgStrategy.platform[language]}</strong></p>
                  <div className="space-y-1.5">
                    {clgStrategy.roadmap.map((week) => (
                      <div key={week.week} className="flex items-start gap-2 text-xs">
                        <Badge variant="outline" className="text-xs shrink-0">{isHe ? `שבוע ${week.week}` : `Week ${week.week}`}</Badge>
                        <span className="text-muted-foreground">{week.title[language]}: {week.milestone[language]}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* ═══ Section C: Tips (collapsible) ═══ */}
            <Collapsible open={tipsOpen} onOpenChange={setTipsOpen} className="mt-6">
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center justify-between">
                      {t("personalizedTips")}
                      <ChevronDown className={cn("h-4 w-4 transition-transform", tipsOpen && "rotate-180")} />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-3">
                      {result.overallTips.map((tip, i) => (
                        <div key={i} className="rounded-xl bg-muted/50 p-4 text-foreground">{tip[language]}</div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </TabsContent>

          {/* Tab 2: Planning (Budget + KPIs) */}
          <TabsContent value="planning" className="mt-6">
            <PlanningTab barData={barData} pieData={pieData} kpis={result.kpis} benchmarks={benchmarks} />
          </TabsContent>

          {/* Tab 3: Content (Hooks + CopyLab + NeuroStory) */}
          <TabsContent value="content" className="mt-6">
            <ContentTab result={personalizedResult} isSimplified={isSimplified("content")} />
          </TabsContent>

          {/* Tab 4: Analytics (Monitor + Data) */}
          <TabsContent value="analytics" className="mt-6">
            <AnalyticsTab
              meta={{
                connected: !!auth,
                loading: metaLoading,
                error: metaError,
                accounts,
                selectedAccountId,
                onConnect: connect,
                onDisconnect: disconnect,
                onSelectAccount: (id, name) => {
                  setSelectedAccountId(id);
                  setSelectedAccountName(name);
                },
              }}
              auth={auth}
              result={result}
              isSimplified={isSimplified("analytics")}
            />
          </TabsContent>

          {/* Tab 5: Brand DNA (conditional) */}
          <TabsContent value="branddna" className="mt-6">
            <BrandDiagnosticTab personalBrand={result.personalBrand} />
          </TabsContent>

          {/* Tab: Sales Pipeline */}
          <TabsContent value="sales" className="mt-6">
            <SalesTab result={result} />
          </TabsContent>

          {/* Tab: Pricing Intelligence */}
          <TabsContent value="pricing" className="mt-6">
            <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading...</div>}>
              <PricingIntelligenceTab result={personalizedResult} />
            </Suspense>
          </TabsContent>

          {/* Tab: Retention & Growth */}
          <TabsContent value="retention" className="mt-6">
            <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading...</div>}>
              <RetentionGrowthTab result={personalizedResult} />
            </Suspense>
          </TabsContent>

          {/* Tab 6: Stylome */}
          <TabsContent value="stylome" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{isSimplified("stylome") ? t("beginnerStylomeTitle") : t("tabStylome")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {isSimplified("stylome") ? t("beginnerStylomeSubtitle") : t("stylomeSubtitle")}
                </p>
              </CardHeader>
              <CardContent>
                <StylomeExtractor />
              </CardContent>
            </Card>
          </TabsContent>
          </Suspense>
        </Tabs>

        {/* Disclaimer */}
        <div className="mb-8 flex items-start gap-3 rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{t("disclaimer")}</p>
        </div>
      </div>

      {/* Sticky Action Bar — always visible */}
      <div className="fixed bottom-0 left-0 right-0 z-40 glass-card border-t" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 px-4 py-2.5">
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
            <Edit className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("editPlan")}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("exportPdf")}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={savePlan} className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("savePlan")}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={sharePlan} className="gap-1.5">
            <Share2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("sharePlan")}</span>
          </Button>
          <Button size="sm" onClick={onNewPlan} className="gap-1.5 funnel-gradient border-0 text-accent-foreground">
            <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("newPlan")}</span>
          </Button>
        </div>
      </div>
      {/* Bottom spacer for sticky bar */}
      <div className="h-16" />

      {/* AI Coach Floating Button + Panel */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
        {coachOpen ? (
          <div className="w-[calc(100vw-2rem)] sm:w-[380px] max-h-[70vh] sm:max-h-[550px] animate-in slide-in-from-bottom-4">
            <div className="flex justify-end mb-1">
              <Button size="sm" variant="ghost" onClick={() => setCoachOpen(false)} className="text-xs">
                {isHe ? "סגור" : "Close"} ✕
              </Button>
            </div>
            <AiCoachChat result={result} healthScore={healthScore.total} />
          </div>
        ) : (
          <Button
            onClick={() => setCoachOpen(true)}
            className="h-14 w-14 rounded-full shadow-lg funnel-gradient border-0 text-accent-foreground hover:opacity-90 transition-opacity"
            title={isHe ? "מאמן שיווק AI" : "AI Marketing Coach"}
          >
            <Bot className="h-6 w-6" />
          </Button>
        )}
      </div>
    </div>
    <PaywallModal open={featureGate.paywallOpen} onOpenChange={featureGate.setPaywallOpen} feature={featureGate.paywallFeature} requiredTier={featureGate.paywallTier} />
    </>
  );
};

export default ResultsDashboard;
