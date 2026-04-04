import { useState } from "react";
import CopyLabTab from "@/components/CopyLabTab";
import BrandDiagnosticTab from "@/components/BrandDiagnosticTab";
import NeuroStorytellingTab from "@/components/NeuroStorytellingTab";
import MetaConnect from "@/components/MetaConnect";
import MetaMonitor from "@/components/MetaMonitor";
import AdaptiveTabNav from "@/components/AdaptiveTabNav";
import DataAnalysisTab from "@/components/DataAnalysisTab";
import { useMetaAuth } from "@/hooks/useMetaAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { FunnelResult } from "@/types/funnel";
import { getTabConfig } from "@/lib/adaptiveTabRules";
import { funnelStageColors, chartColorPalette } from "@/lib/colorSemantics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Edit, Download, Save, Share2, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

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

  // Adaptive tabs
  const tabs = getTabConfig(result, profile);
  const defaultTab = tabs[0]?.id || "strategy";

  const barData = result.stages.map((stage, i) => ({
    name: stage.name[language],
    budget: stage.budgetPercent,
    fill: chartColorPalette[i % chartColorPalette.length],
  }));

  const pieData = result.stages.flatMap((stage) =>
    stage.channels.map((ch) => ({
      name: ch.name[language],
      value: Math.round((ch.budgetPercent * stage.budgetPercent) / 100),
    }))
  ).reduce<{ name: string; value: number }[]>((acc, item) => {
    const existing = acc.find((a) => a.name === item.name);
    if (existing) existing.value += item.value;
    else acc.push({ ...item });
    return acc;
  }, []);

  const savePlan = () => {
    const plans = JSON.parse(localStorage.getItem("funnelforge-plans") || "[]");
    plans.push({ id: result.id, name: result.funnelName[language], result, savedAt: new Date().toISOString() });
    localStorage.setItem("funnelforge-plans", JSON.stringify(plans));
    toast.success(t("planSaved"));
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
      toast.success(language === "he" ? "הועתק ללוח" : "Copied to clipboard");
    }
  };

  const motionProps = reducedMotion
    ? { initial: undefined, animate: undefined, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

  const stageMotionProps = (delay: number) =>
    reducedMotion
      ? {}
      : { initial: { scaleX: 0 }, animate: { scaleX: 1 }, transition: { delay } };

  return (
    <div className="min-h-screen px-4 pt-24 pb-12">
      <div className="mx-auto max-w-5xl" id="results-content">
        {/* Header */}
        <motion.div {...motionProps} className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-extrabold text-foreground sm:text-4xl">
            {t("resultsTitle")}
          </h1>
          <p className="text-lg text-muted-foreground">{t("resultsSubtitle")}</p>
          <div className="mt-4 inline-block rounded-full bg-primary/10 px-6 py-2">
            <span className="font-bold text-primary">{result.funnelName[language]}</span>
            <span className="mx-3 text-border">|</span>
            <span className="text-muted-foreground">
              ₪{result.totalBudget.min.toLocaleString()} – ₪{result.totalBudget.max.toLocaleString()} {t("perMonth")}
            </span>
          </div>
        </motion.div>

        {/* Funnel Visualization with neuro-vector colors */}
        <motion.div
          {...motionProps}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.2 }}
          className="mb-8"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-2">
                {result.stages.map((stage, i) => {
                  const widthPercent = 100 - i * 15;
                  const stageId = STAGE_IDS[i] || "engagement";
                  const stageColor = funnelStageColors[stageId];
                  return (
                    <motion.div
                      key={stage.id}
                      {...stageMotionProps(0.3 + i * 0.1)}
                      className="relative flex items-center justify-center rounded-lg py-4 text-center text-accent-foreground"
                      style={{
                        width: `${widthPercent}%`,
                        background: chartColorPalette[i % chartColorPalette.length],
                        minHeight: "56px",
                      }}
                    >
                      <div>
                        <div className="text-sm font-bold">{stage.name[language]}</div>
                        <div className="text-xs opacity-80">
                          {NEURO_LABELS[stageId]?.emoji} {stage.budgetPercent}%
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Adaptive Tabs */}
        <Tabs defaultValue={defaultTab} className="mb-8">
          <AdaptiveTabNav tabs={tabs} />

          <TabsContent value="strategy" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              {result.stages.map((stage, i) => {
                const stageId = STAGE_IDS[i] || "engagement";
                const colors = funnelStageColors[stageId];
                return (
                  <Card key={stage.id} className={`border-l-4 ${colors?.border || ""}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-accent-foreground"
                          style={{ background: chartColorPalette[i] }}
                        >
                          {i + 1}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{stage.name[language]}</CardTitle>
                          {NEURO_LABELS[stageId] && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs">{NEURO_LABELS[stageId].emoji}</span>
                              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                {NEURO_LABELS[stageId].vector[language]}
                              </span>
                              <span className="text-[10px] text-muted-foreground">—</span>
                              <span className="text-[10px] text-muted-foreground italic">
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
                        <div className="text-sm font-semibold text-foreground">{t("recommendedChannels")}:</div>
                        {stage.channels.map((ch, j) => (
                          <div key={j} className="rounded-lg bg-muted/50 p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-foreground">{ch.name[language]}</span>
                              <span className="text-sm text-primary font-semibold">{ch.budgetPercent}%</span>
                            </div>
                            {ch.tips.map((tip, k) => (
                              <p key={k} className="mt-1 text-xs text-muted-foreground">💡 {tip[language]}</p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="budget" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("budgetAllocation")} ({isHe ? "לפי שלב" : "by stage"})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
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
                  <CardTitle>{t("budgetAllocation")} ({isHe ? "לפי ערוץ" : "by channel"})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name} ${value}%`}>
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
          </TabsContent>

          <TabsContent value="kpis" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("keyMetrics")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {result.kpis.map((kpi, i) => (
                    <div key={i} className="rounded-xl border p-4">
                      <div className="text-sm text-muted-foreground">{kpi.name[language]}</div>
                      <div className="mt-1 text-2xl font-bold text-primary">{kpi.target}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hooks" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("tabHooks")}</CardTitle>
                <p className="text-sm text-muted-foreground">{t("hooksSubtitle")}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.hookTips.map((hook, i) => (
                    <div key={i} className="rounded-xl border p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                        <span className="font-semibold text-foreground">{hook.lawName[language]}</span>
                      </div>
                      <div className="mb-2 rounded-lg bg-muted/50 p-3">
                        <div className="mb-1 text-xs font-semibold text-muted-foreground">{t("hookFormula")}:</div>
                        <p className="text-sm text-foreground">{hook.formula[language]}</p>
                      </div>
                      <div className="mb-2 rounded-lg bg-primary/5 p-3">
                        <div className="mb-1 text-xs font-semibold text-muted-foreground">{t("hookExample")}:</div>
                        <p className="text-sm text-foreground italic">{hook.example[language]}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">{t("hookChannels")}:</span>
                        {hook.channels.map((ch, j) => (
                          <span key={j} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{ch}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="copylab" className="mt-6">
            <CopyLabTab copyLab={result.copyLab} />
          </TabsContent>

          <TabsContent value="branddna" className="mt-6">
            <BrandDiagnosticTab personalBrand={result.personalBrand} />
          </TabsContent>

          {result.neuroStorytelling && (
            <TabsContent value="neurostory" className="mt-6">
              <NeuroStorytellingTab data={result.neuroStorytelling} />
            </TabsContent>
          )}

          <TabsContent value="monitor" className="mt-6">
            <div className="space-y-6">
              <MetaConnect
                connected={!!auth}
                loading={metaLoading}
                error={metaError}
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                onConnect={connect}
                onDisconnect={disconnect}
                onSelectAccount={(id, name) => {
                  setSelectedAccountId(id);
                  setSelectedAccountName(name);
                }}
              />
              {auth && selectedAccountId && (
                <MetaMonitor
                  result={result}
                  accountId={selectedAccountId}
                  accessToken={auth.accessToken}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="data" className="mt-6">
            <DataAnalysisTab />
          </TabsContent>

          <TabsContent value="tips" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("personalizedTips")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.overallTips.map((tip, i) => (
                    <div key={i} className="rounded-xl bg-muted/50 p-4 text-foreground">
                      {tip[language]}
                    </div>
                  ))}
                </div>
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
    </div>
  );
};

export default ResultsDashboard;
