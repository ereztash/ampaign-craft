import { useMemo, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { FunnelResult } from "@/types/funnel";
import { generateSalesPipeline, getSalesTypeLabel, SalesPipelineResult } from "@/engine/salesPipelineEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  TrendingUp, DollarSign, Clock, Target, ChevronDown, Copy, Check,
  Zap, MessageSquare, ArrowRight, Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SalesTabProps {
  result: FunnelResult;
}

const SalesTab = ({ result }: SalesTabProps) => {
  const { t, language } = useLanguage();
  const isHe = language === "he";
  const pipeline = useMemo(() => generateSalesPipeline(result), [result]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [tipsOpen, setTipsOpen] = useState(false);

  const copyScript = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success(isHe ? "הועתק!" : "Copied!");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const formatCurrency = (n: number) => `₪${n.toLocaleString()}`;

  return (
    <div className="space-y-6">
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
                        <Badge variant="outline" className="text-[10px]">
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
                      <div className="mt-1.5 text-[10px] text-muted-foreground/60">
                        ~{stage.avgDaysInStage} {t("daysUnit")}
                      </div>
                    )}
                  </div>
                  {i < pipeline.stages.length - 1 && (
                    <div className="text-center text-muted-foreground/30 text-lg">↓</div>
                  )}
                </div>
              );
            })}
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
                <div className="text-[10px] text-muted-foreground">{kpi.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ═══ Section 3: Objection Scripts ═══ */}
      <Card>
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
                  className="h-7 text-xs gap-1"
                >
                  {copiedIdx === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedIdx === i ? (isHe ? "הועתק" : "Copied") : (isHe ? "העתק" : "Copy")}
                </Button>
              </div>
              <p className="text-sm text-foreground bg-accent/5 rounded-lg p-2.5" dir="auto">
                {script.response[language]}
              </p>
              <div className="mt-1.5">
                <Badge variant="outline" className="text-[10px]">{script.technique}</Badge>
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
                <Badge variant="outline" className="mt-1 text-[10px]">{auto.tool}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ═══ Section 5: Closing Tips ═══ */}
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
    </div>
  );
};

export default SalesTab;
