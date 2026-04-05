import { useState, useEffect, useMemo } from "react";
import BrandDiagnosticTab from "@/components/BrandDiagnosticTab";
import PlanningTab from "@/components/PlanningTab";
import ContentTab from "@/components/ContentTab";
import AnalyticsTab from "@/components/AnalyticsTab";
import AiCoachChat from "@/components/AiCoachChat";
import WhatsAppTemplatesPanel from "@/components/WhatsAppTemplatesPanel";
import StylomeExtractor from "@/components/StylomeExtractor";
import AdaptiveTabNav from "@/components/AdaptiveTabNav";
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
import { useSavedPlans } from "@/hooks/useSavedPlans";
import { useAchievements } from "@/hooks/useAchievements";
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
  onEdit: () => void;
  onNewPlan: () => void;
}

const STAGE_IDS = ["awareness", "engagement", "leads", "conversion", "retention"];

const NEURO_LABELS: Record<string, { emoji: string; vector: { he: string; en: string }; desc: { he: string; en: string } }> = {
  awareness: { emoji: "🔴", vector: { he: "קורטיזול", en: "Cortisol" }, desc: { he: "תפוס קשב דרך מתח אסטרטגי", en: "Grab attention through strategic tension" } },
  engagement: { emoji: "🔵", vector: { he: "אוקסיטוצין", en: "Oxytocin" }, desc: { he: "בנה אמון דרך חיבור", en: "Build trust through connection" } },
  leads: { emoji: "🟠", vector: { he: "הזדמנות", en: "Opportunity" }, desc: { he: "מתח → תגמול: תפוס את הרגע", en: "Tension → reward: seize the moment" } },
  conversion: { emoji: "🟢", vector: { he: "דופמין", en: "Dopamine" }, desc: { he: "רגע התגמול: הפוך להחלטה", en: "Reward moment: convert to decision" } },
  retention: { emoji: "🔵", vector: { he: "אוקסיטוצין", en: "Oxytocin" }, desc: { he: "אמון מתמשך: הישאר איתנו", en: "Ongoing trust: stay with us" } },
};

const ResultsDashboard = ({ result, onEdit, onNewPlan }: ResultsDashboardProps) => {
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
  const defaultTab = tabs[0]?.id || "strategy";
  const tabMap = new Map(tabs.map((t) => [t.id, t]));
  const isSimplified = (id: string) => tabMap.get(id)?.simplifiedMode ?? false;

  // MOAT features (memoized — only recompute when result changes)
  const healthScore = useMemo(() => calculateHealthScore(result), [result]);
  const socialProof = useMemo(() => getSocialProof(result.formData.businessField || "other"), [result.formData.businessField]);
  const roiEstimate = useMemo(() => calculateRoi(result.formData), [result.formData]);
  const { unlock, trackFeature } = useAchievements(language);
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
    <div className="min-h-screen px-4 pt-24 pb-12">
      <div className="mx-auto max-w-5xl" id="results-content">
        {/* Header */}
        <motion.div {...motionProps} className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-extrabold text-foreground sm:text-4xl">{t("resultsTitle")}</h1>
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

        {/* === 6 CONSOLIDATED TABS === */}
        <Tabs defaultValue={defaultTab} className="mb-8" onValueChange={handleTabChange}>
          <AdaptiveTabNav tabs={tabs} />

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
                              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{NEURO_LABELS[stageId].vector[language]}</span>
                              <span className="text-[10px] text-muted-foreground">—</span>
                              <span className="text-[10px] text-muted-foreground italic">{NEURO_LABELS[stageId].desc[language]}</span>
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
                                    <span key={ti} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
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

            {/* Israeli Tools */}
            <Card className="mt-6 border-primary/20">
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

            {/* WhatsApp Templates (if WhatsApp channel is recommended) */}
            {result.stages.some((s) => s.channels.some((c) => c.channel === "whatsapp")) && (
              <WhatsAppTemplatesPanel />
            )}

            {/* Collapsible Tips */}
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
            <ContentTab result={result} isSimplified={isSimplified("content")} />
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
        </Tabs>

        {/* Disclaimer */}
        <div className="mb-8 flex items-start gap-3 rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{t("disclaimer")}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3">
        <Button variant="outline" onClick={onEdit} className="gap-2">
          <Edit className="h-4 w-4" /> {t("editPlan")}
        </Button>
        <Button variant="outline" onClick={exportPdf} className="gap-2">
          <Download className="h-4 w-4" /> {t("exportPdf")}
        </Button>
        <Button variant="outline" onClick={savePlan} className="gap-2">
          <Save className="h-4 w-4" /> {t("savePlan")}
        </Button>
        <Button variant="outline" onClick={sharePlan} className="gap-2">
          <Share2 className="h-4 w-4" /> {t("sharePlan")}
        </Button>
        <Button onClick={onNewPlan} className="gap-2 funnel-gradient border-0 text-accent-foreground">
          <Plus className="h-4 w-4" /> {t("newPlan")}
        </Button>
      </div>

      {/* AI Coach Floating Button + Panel */}
      <div className="fixed bottom-6 right-6 z-40">
        {coachOpen ? (
          <div className="w-[380px] max-h-[550px] animate-in slide-in-from-bottom-4">
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
  );
};

export default ResultsDashboard;
