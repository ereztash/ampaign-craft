import { useMemo, useState, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { FunnelResult } from "@/types/funnel";
import { generateSalesPipeline, getSalesTypeLabel, getNeuroClosingFrameworks, detectBuyerPersonality, BUYER_PERSONALITIES } from "@/engine/salesPipelineEngine";
import { buildUserKnowledgeGraph, StylomeVoice } from "@/engine/userKnowledgeGraph";
import { inferDISCProfile } from "@/engine/discProfileEngine";
import { generateClosingStrategy } from "@/engine/neuroClosingEngine";
import { DISCProfileCard } from "@/components/DISCProfileCard";
import { NeuroClosingCard } from "@/components/NeuroClosingCard";
import { DifferentiationResult } from "@/types/differentiation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  TrendingUp, DollarSign, Clock, Target, ChevronDown, Copy, Check,
  Zap, MessageSquare, ArrowRight, Lightbulb, Brain, Users, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Quote } from "@/types/quote";
import QuoteBuilder from "@/components/QuoteBuilder";

interface SalesTabProps {
  result: FunnelResult;
}

const SalesTab = ({ result }: SalesTabProps) => {
  const { t, language } = useLanguage();
  const isHe = language === "he";
  const diffResult = useMemo<DifferentiationResult | null>(() => {
    try { const raw = localStorage.getItem("funnelforge-differentiation-result"); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }, []);
  const stylomeVoice = useMemo<StylomeVoice | null>(() => {
    try { const raw = localStorage.getItem("funnelforge-stylome-voice"); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }, []);
  const graph = useMemo(() => buildUserKnowledgeGraph(result.formData, diffResult, stylomeVoice), [result.formData, diffResult, stylomeVoice]);
  const pipeline = useMemo(() => generateSalesPipeline(result, graph), [result, graph]);
  const closingFrameworks = useMemo(() => getNeuroClosingFrameworks(pipeline.salesType, result.formData.audienceType || "b2c"), [pipeline.salesType, result.formData.audienceType]);
  const buyerPersonality = useMemo(() => detectBuyerPersonality(result.formData.audienceType || "b2c", result.formData.businessField || "other"), [result.formData]);
  const discProfile = useMemo(() => inferDISCProfile(result.formData, graph), [result.formData, graph]);
  const neuroClosing = useMemo(() => generateClosingStrategy(discProfile, result.formData), [discProfile, result.formData]);
  const personalityProfile = BUYER_PERSONALITIES.find((p) => p.id === buyerPersonality)!;
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [quoteView, setQuoteView] = useState(false);

  const handleQuoteComplete = useCallback(async (quote: Quote) => {
    try {
      await (supabase as any).from("quotes").insert({
        data: quote,
        status: quote.status,
        recipient_name: quote.recipient.name,
        recipient_company: quote.recipient.company,
        total: quote.total,
        currency: quote.currency,
        valid_until: quote.validUntil,
      });
    } catch { /* localStorage fallback */ }
    try { localStorage.setItem("funnelforge-last-quote", JSON.stringify(quote)); } catch { /* ignore */ }
    toast.success(isHe ? "הצעת המחיר נשמרה!" : "Quote saved!");
    setQuoteView(false);
  }, [isHe]);

  const copyScript = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success(isHe ? "הועתק!" : "Copied!");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const formatCurrency = (n: number) => `₪${n.toLocaleString()}`;

  const hasDiff = !!diffResult;

  if (quoteView) {
    return (
      <QuoteBuilder
        formData={result.formData}
        graph={graph}
        funnelResult={result}
        onComplete={handleQuoteComplete}
        onBack={() => setQuoteView(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Personalization upgrade CTA */}
      {!hasDiff && (
        <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-3 text-center">
          <p className="text-xs text-muted-foreground" dir="auto">
            {isHe
              ? "💡 השלם את שאלון הבידול כדי לקבל סקריפטים עם שמות מתחרים, מנגנון הבידול שלך, וויתורים מודעים"
              : "💡 Complete the differentiation questionnaire for scripts with competitor names, your mechanism, and tradeoffs"}
            {" → "}
            <a href="/differentiate" className="text-primary font-medium underline">{isHe ? "התחל" : "Start"}</a>
          </p>
        </div>
      )}

      {/* DISC Personality Profile */}
      <DISCProfileCard profile={discProfile} />

      {/* Sales Type Badge */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" className="text-sm px-3 py-1">
          {getSalesTypeLabel(pipeline.salesType)[language]}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {isHe ? "זוהה אוטומטית מנתוני המשפך שלך" : "Auto-detected from your funnel data"}
        </span>
      </div>

      {/* ═══ Section 1: Pipeline Visualization ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            {t("salesPipeline")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pipeline.stages.map((stage, i) => {
              const widthPercent = Math.max(30, 100 - i * 15);
              return (
                <div key={stage.id} className="group">
                  <div
                    className="rounded-xl border p-3 transition-all hover:border-primary/30"
                    style={{ width: `${widthPercent}%`, marginInlineStart: `${(100 - widthPercent) / 2}%` }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <span>{stage.emoji}</span>
                        {stage.name[language]}
                      </span>
                      {stage.conversionRate < 100 && (
                        <Badge variant="outline" className="text-xs">
                          {stage.conversionRate}% → {t("conversionToNext")}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      {stage.actions.map((action, j) => (
                        <div key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-accent" />
                          <span>{action[language]}</span>
                        </div>
                      ))}
                    </div>
                    {stage.avgDaysInStage > 0 && (
                      <div className="mt-1.5 text-xs text-muted-foreground">
                        ~{stage.avgDaysInStage} {t("daysUnit")}
                      </div>
                    )}
                  </div>
                  {i < pipeline.stages.length - 1 && (
                    <div className="text-center text-muted-foreground text-lg">↓</div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ═══ Create Quote CTA ═══ */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2" dir="auto">
                <FileText className="h-4 w-4 text-primary" />
                {isHe ? "הצעת מחיר מובנית" : "Structured Price Quote"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1" dir="auto">
                {isHe
                  ? "צור הצעת מחיר מקצועית מותאמת ללקוח עם תמחור, ערבויות ובונוסים"
                  : "Generate a professional client-adapted quote with pricing, guarantees and bonuses"}
              </p>
            </div>
            <Button onClick={() => setQuoteView(true)} className="gap-2">
              <FileText className="h-4 w-4" />
              {isHe ? "צור הצעה" : "Create Quote"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Section 2: Forecast KPIs ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            {t("salesForecast")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: t("monthlyDeals"), value: pipeline.forecast.monthlyDeals.toString(), icon: Target, color: "text-primary" },
              { label: t("avgDealSize"), value: formatCurrency(pipeline.forecast.avgDealSize), icon: DollarSign, color: "text-accent" },
              { label: t("pipelineValue"), value: formatCurrency(pipeline.forecast.pipelineValue), icon: TrendingUp, color: "text-primary" },
              { label: t("expectedRevenue"), value: formatCurrency(pipeline.forecast.expectedRevenue), icon: DollarSign, color: "text-accent" },
              { label: t("cycleLength"), value: `${pipeline.forecast.cycleLength} ${t("daysUnit")}`, icon: Clock, color: "text-muted-foreground" },
              { label: t("winRate"), value: `${Math.round(pipeline.forecast.winRate * 100)}%`, icon: Target, color: "text-primary" },
            ].map((kpi, i) => (
              <div key={i} className="rounded-xl border p-3 text-center">
                <kpi.icon className={cn("h-4 w-4 mx-auto mb-1", kpi.color)} />
                <div className="text-lg font-bold text-foreground">{kpi.value}</div>
                <div className="text-xs text-muted-foreground">{kpi.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ═══ Group B: Selling Toolkit (collapsible) ═══ */}
      <Collapsible defaultOpen>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>🎯 {isHe ? "ארגז כלי מכירה" : "Selling Toolkit"}</span>
                <ChevronDown className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>

      {/* ═══ Section 3: Objection Scripts ═══ */}
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-destructive" />
            {t("salesObjections")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pipeline.objectionScripts.map((script, i) => (
            <div key={i} className="rounded-xl border p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>{script.emoji}</span>
                  <span className="text-sm font-medium text-destructive">
                    "{script.objection[language]}"
                  </span>
                </div>
                <Button
                  size="sm" variant="ghost"
                  onClick={() => copyScript(script.response[language], i)}
                  className="h-7 min-h-[44px] text-xs gap-1"
                >
                  {copiedIdx === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedIdx === i ? (isHe ? "הועתק" : "Copied") : (isHe ? "העתק" : "Copy")}
                </Button>
              </div>
              <p className="text-sm text-foreground bg-accent/5 rounded-lg p-2.5" dir="auto">
                {script.response[language]}
              </p>
              <div className="mt-1.5">
                <Badge variant="outline" className="text-xs">{script.technique}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ═══ Section 4: Automations ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            {t("salesAutomations")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pipeline.automations.map((auto, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
              <span className="text-lg">{auto.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-0.5">
                  {isHe ? "טריגר:" : "Trigger:"} {auto.trigger[language]}
                </div>
                <div className="text-sm font-medium text-foreground">{auto.action[language]}</div>
                <Badge variant="outline" className="mt-1 text-xs">{auto.tool}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ═══ Group C: Psychology (collapsible) ═══ */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>🧠 {isHe ? "פסיכולוגיית מכירה" : "Sales Psychology"}</span>
                <ChevronDown className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>

      {/* ═══ Section 5: Buyer Personality ═══ */}
      <Card className="border-0 shadow-none border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {isHe ? "פרופיל קונה" : "Buyer Personality"}: {personalityProfile.emoji} {personalityProfile.name[language]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">{personalityProfile.traits[language]}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-lg bg-accent/5 border border-accent/20 p-2.5">
              <div className="text-xs text-accent font-medium mb-1">{isHe ? "✅ איך למכור:" : "✅ How to sell:"}</div>
              <p className="text-xs text-foreground">{personalityProfile.sellTo[language]}</p>
            </div>
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-2.5">
              <div className="text-xs text-destructive font-medium mb-1">{isHe ? "❌ מה להימנע:" : "❌ What to avoid:"}</div>
              <p className="text-xs text-foreground">{personalityProfile.avoid[language]}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Section 6: Neuro-Closing Frameworks ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500" />
            {isHe ? "טכניקות סגירה נוירו-פסיכולוגיות" : "Neuro-Psychological Closing Techniques"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {closingFrameworks.map((fw, i) => (
            <div key={i} className="rounded-xl border p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium flex items-center gap-2">
                  <span>{fw.emoji}</span> {fw.name[language]}
                </span>
                <Badge variant="outline" className="text-xs">{fw.vectorLabel[language]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{fw.psychology[language]}</p>
              <div className="bg-accent/5 rounded-lg p-2.5 mb-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-accent font-medium">{isHe ? "סקריפט:" : "Script:"}</span>
                  <Button size="sm" variant="ghost" onClick={() => copyScript(fw.script[language], 100 + i)} className="h-6 min-h-[44px] text-xs gap-1">
                    {copiedIdx === 100 + i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <p className="text-xs text-foreground" dir="auto">{fw.script[language]}</p>
              </div>
              <p className="text-xs text-muted-foreground">{isHe ? "מתאים ל:" : "Best for:"} {fw.bestFor[language]}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ═══ DISC-Based Neuro-Closing Strategy ═══ */}
      <NeuroClosingCard strategy={neuroClosing} />

      {/* ═══ Section 7: Closing Tips ═══ */}
      <Collapsible open={tipsOpen} onOpenChange={setTipsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/5 transition-colors">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  {t("salesClosingTips")}
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", tipsOpen && "rotate-180")} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-2 pt-0">
              {pipeline.closingTips.map((tip, i) => (
                <div key={i} className="text-sm text-muted-foreground border-b last:border-0 pb-2 last:pb-0" dir="auto">
                  {tip[language]}
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default SalesTab;
