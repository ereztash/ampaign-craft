import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import AdaptiveTabNav from "@/components/AdaptiveTabNav";

const BrandDiagnosticTab = lazy(() => import("@/components/BrandDiagnosticTab"));
const PlanningTab = lazy(() => import("@/components/PlanningTab"));
const ContentTab = lazy(() => import("@/components/ContentTab"));
const AnalyticsTab = lazy(() => import("@/components/AnalyticsTab"));
const AiCoachChat = lazy(() => import("@/components/AiCoachChat"));
const StylomeExtractor = lazy(() => import("@/components/StylomeExtractor"));
const SalesTab = lazy(() => import("@/components/SalesTab"));
const PricingIntelligenceTab = lazy(() => import("@/components/PricingIntelligenceTab"));
const RetentionGrowthTab = lazy(() => import("@/components/RetentionGrowthTab"));
const StrategyTab = lazy(() => import("@/components/StrategyTab"));
import { useMetaAuth } from "@/hooks/useMetaAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { FunnelResult } from "@/types/funnel";
import { getTabConfig } from "@/lib/adaptiveTabRules";
import { funnelStageColors, chartColorPalette } from "@/lib/colorSemantics";
import { getIsraeliToolsSummary } from "@/lib/toolRecommendations";
import { getIndustryBenchmarks } from "@/lib/industryBenchmarks";
import { calculateHealthScore } from "@/engine/healthScoreEngine";
import { loadChatInsights, loadImportedDataSignals, loadMetaSignals } from "@/engine/userKnowledgeGraph";
import { getSocialProof } from "@/lib/socialProofData";
import { calculateRoi } from "@/lib/roiCalculator";
import { calculateCostOfInaction } from "@/engine/costOfInactionEngine";
import { getEventsForField } from "@/lib/israeliMarketCalendar";
import { generateCLGStrategy } from "@/engine/clgEngine";
import { generateRetentionFlywheel } from "@/engine/retentionFlywheelEngine";
import { personalizeResult } from "@/engine/funnelEngine";
import { buildUserKnowledgeGraph, StylomeVoice } from "@/engine/userKnowledgeGraph";
import { calculateValueScore } from "@/engine/hormoziValueEngine";
import { DifferentiationResult } from "@/types/differentiation";
import { useSavedPlans } from "@/hooks/useSavedPlans";
import { useAchievements } from "@/hooks/useAchievements";
import { useModuleStatus } from "@/hooks/useModuleStatus";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { PeerBenchmark } from "@/components/PeerBenchmark";
import PaywallModal from "@/components/PaywallModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Edit, Download, Save, Share2, Plus, AlertTriangle, Bot, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import BackToHub from "@/components/BackToHub";
import ReflectiveCard from "@/components/reflective/ReflectiveCard";
import { generateReflectiveAction } from "@/engine/optimization/reflectiveAction";

interface ResultsDashboardProps {
  result: FunnelResult;
  defaultTab?: string;
  onEdit: () => void;
  onNewPlan: () => void;
  /** When true, removes top offset meant for legacy fixed Header */
  embeddedInShell?: boolean;
}

const STAGE_IDS = ["awareness", "engagement", "leads", "conversion", "retention"];

const NEURO_LABELS: Record<string, { emoji: string; vector: { he: string; en: string }; desc: { he: string; en: string } }> = {
  awareness: { emoji: "●", vector: { he: "קורטיזול", en: "Cortisol" }, desc: { he: "תפוס קשב דרך מתח אסטרטגי", en: "Grab attention through strategic tension" } },
  engagement: { emoji: "●", vector: { he: "אוקסיטוצין", en: "Oxytocin" }, desc: { he: "בנה אמון דרך חיבור", en: "Build trust through connection" } },
  leads: { emoji: "●", vector: { he: "הזדמנות", en: "Opportunity" }, desc: { he: "מתח → תגמול: תפוס את הרגע", en: "Tension → reward: seize the moment" } },
  conversion: { emoji: "●", vector: { he: "דופמין", en: "Dopamine" }, desc: { he: "רגע התגמול: הפוך להחלטה", en: "Reward moment: convert to decision" } },
  retention: { emoji: "●", vector: { he: "אוקסיטוצין", en: "Oxytocin" }, desc: { he: "אמון מתמשך: הישאר איתנו", en: "Ongoing trust: stay with us" } },
};

const ResultsDashboard = ({ result, defaultTab: routeTab, onEdit, onNewPlan, embeddedInShell }: ResultsDashboardProps) => {
  const { t, language } = useLanguage();
  const { profile } = useUserProfile();
  const reducedMotion = useReducedMotion();
  const isHe = language === "he";
  const { auth, accounts, loading: metaLoading, error: metaError, connect, disconnect } = useMetaAuth();
  const peerModules = useModuleStatus();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccountName, setSelectedAccountName] = useState<string | null>(null);
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

  // Knowledge graph + personalized result (cross-domain inputs included)
  const graph = useMemo(
    () => buildUserKnowledgeGraph(
      result.formData, diffResult, stylomeVoice,
      { visitCount: profile.visitCount, streak: 0, mastery: 0, segment: profile.userSegment },
      undefined, // blackboardCtx
      { chatInsights: loadChatInsights(), importedData: loadImportedDataSignals(), metaSignals: loadMetaSignals() },
    ),
    [result.formData, diffResult, stylomeVoice, profile.visitCount, profile.userSegment],
  );
  const personalizedResult = useMemo(() => personalizeResult(result, graph), [result, graph]);

  // MOAT features (memoized — pass UKG for cross-domain enrichment)
  const healthScore = useMemo(() => calculateHealthScore(result, graph), [result, graph]);
  const costOfInaction = useMemo(() => calculateCostOfInaction(result, graph), [result, graph]);
  const marketEvents = useMemo(() => getEventsForField(result.formData.businessField || "other"), [result.formData.businessField]);
  const clgStrategy = useMemo(() => generateCLGStrategy(result.formData), [result.formData]);
  const flywheel = useMemo(() => generateRetentionFlywheel(result.formData), [result.formData]);
  const socialProof = useMemo(() => getSocialProof(result.formData.businessField || "other"), [result.formData.businessField]);
  const roiEstimate = useMemo(() => calculateRoi(result.formData), [result.formData]);
  const hormoziValue = useMemo(() => calculateValueScore(result.formData, graph), [result.formData, graph]);
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
    <div className={cn("min-h-screen px-4 pb-12", embeddedInShell ? "pt-4" : "pt-24")}>
      <div className="mx-auto max-w-5xl" id="results-content">
        {/* Back to Hub */}
        <BackToHub currentPage={isHe ? "תוצאות שיווק" : "Marketing Results"} />

        {/* Reflective Action Card (feature-flagged, strictly additive) */}
        {(import.meta.env.VITE_REFLECTIVE_ENABLED === "true" || (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("reflective") === "1")) && (
          <div className="mb-6"><ReflectiveCard card={generateReflectiveAction({ funnel: personalizedResult, gaps: [] })} /></div>
        )}

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

        {/* Cold-start onboarding banner */}
        {graph.derived.coldStartMode && (
          <motion.div {...motionProps} className="mb-6 rounded-xl border border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-700/40 dark:bg-emerald-900/20 p-4 text-start space-y-2">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200" dir="auto">
              {isHe ? "נקודת התחלה — כך תשפרו את התוכנית:" : "Starting point — here's how to improve your plan:"}
            </p>
            <ul className="text-xs text-emerald-800 dark:text-emerald-300 space-y-1 list-disc list-inside" dir="auto">
              <li>{isHe ? "חברו מקור נתונים (Meta Ads, CSV) לקבלת תובנות מבוססות מספרים אמיתיים" : "Connect a data source (Meta Ads, CSV) for insights based on real numbers"}</li>
              <li>{isHe ? "הריצו ניתוח סגנון כתיבה כדי שהקופי יתאים לקול שלכם" : "Run a writing style analysis so copy matches your voice"}</li>
              <li>{isHe ? "נסו את המאמן השיווקי — כל שיחה מחדדת את האסטרטגיה" : "Try the AI Coach — every conversation sharpens the strategy"}</li>
            </ul>
          </motion.div>
        )}

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
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <span className="text-2xl" role="img" aria-hidden="true">🔥</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground" dir="auto">{costOfInaction.lossFramedMessage[language]}</p>
                <p className="text-xs text-muted-foreground mt-0.5" dir="auto">{costOfInaction.comparisonMessage[language]}</p>
              </div>
            </div>
            {/* Compounding loss timeline */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="rounded-lg border border-destructive/10 p-2 text-center">
                <div className="text-sm font-bold text-destructive">₪{costOfInaction.compoundingLoss.threeMonth.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{isHe ? "3 חודשים" : "3 months"}</div>
              </div>
              <div className="rounded-lg border border-destructive/10 p-2 text-center">
                <div className="text-sm font-bold text-destructive">₪{costOfInaction.compoundingLoss.sixMonth.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{isHe ? "6 חודשים" : "6 months"}</div>
              </div>
              <div className="rounded-lg border border-destructive/10 p-2 text-center">
                <div className="text-sm font-bold text-destructive">₪{costOfInaction.compoundingLoss.twelveMonth.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{isHe ? "12 חודשים" : "12 months"}</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground" dir="auto">{costOfInaction.competitorGapMessage[language]}</p>
            <p className="text-xs font-semibold text-destructive mt-1" dir="auto">{costOfInaction.urgencyMessage[language]}</p>
          </CardContent>
        </Card>

        {/* Peer Benchmark */}
        <div className="mb-6">
          <PeerBenchmark
            businessField={result.formData.businessField || "other"}
            healthScore={healthScore.total}
            modulesCompleted={peerModules.filter((m) => m.completed).length}
            modulesTotal={peerModules.length}
          />
        </div>

        {/* Differentiation Upgrade CTA (for Path A users) */}
        {!diffResult && (
          <Card className="mb-4 border-dashed border-2 border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex flex-col sm:flex-row items-center gap-3 p-4">
              <span className="text-2xl" role="img" aria-hidden="true">🎯</span>
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
                  {isHe ? "השלם בידול" : "Complete Differentiation"}
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
                </Button>
              </a>
            </CardContent>
          </Card>
        )}

        {/* === CONSOLIDATED TABS === */}
        <Tabs defaultValue={defaultTab} className="mb-8" onValueChange={handleTabChange}>
          <AdaptiveTabNav tabs={tabs} />
          <Suspense
            fallback={
              <div className="mt-6 space-y-4" aria-busy="true" aria-live="polite">
                <Skeleton className="h-28 w-full rounded-xl" />
                <div className="grid gap-4 md:grid-cols-2">
                  <Skeleton className="h-48 rounded-xl" />
                  <Skeleton className="h-48 rounded-xl" />
                </div>
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            }
          >

          {/* Tab 1: Strategy — extracted to StrategyTab.tsx for size and progressive disclosure */}
          <TabsContent value="strategy" className="mt-6">
            <StrategyTab
              result={result}
              language={language}
              isHe={isHe}
              t={t}
              healthScore={healthScore}
              hormoziValue={hormoziValue}
              socialProof={socialProof}
              roiEstimate={roiEstimate}
              israeliTools={israeliTools}
              marketEvents={marketEvents}
              flywheel={flywheel}
              clgStrategy={clgStrategy}
              recommendedChannelsLabel={t("recommendedChannels")}
            />
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
      <div className="fixed bottom-0 inset-x-0 z-40 glass-card border-t" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
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
      <div className="fixed bottom-4 end-4 sm:bottom-6 sm:end-6 z-40">
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
