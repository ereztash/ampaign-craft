import { useMemo, useState, lazy, Suspense } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { FunnelResult } from "@/types/funnel";
import { generateRetentionStrategy } from "@/engine/retentionGrowthEngine";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { assessChurnRisk } from "@/engine/churnPredictionEngine";
import { ChurnPredictionCard } from "@/components/ChurnPredictionCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { tx } from "@/i18n/tx";
import { Copy, Check, ChevronDown, UserPlus, AlertTriangle, Gift, TrendingUp, Heart, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const ChurnPlaybookTab = lazy(() => import("@/components/ChurnPlaybookTab"));

interface Props { result: FunnelResult }

const RetentionGrowthTab = ({ result }: Props) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const graph = useMemo(() => buildUserKnowledgeGraph(result.formData), [result.formData]);
  const retention = useMemo(() => generateRetentionStrategy(result.formData, graph), [result.formData, graph]);
  const churnRisk = useMemo(() => assessChurnRisk(result.formData), [result.formData]);

  const copyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success(tx({ he: "הועתק!", en: "Copied!" }, language));
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <Tabs defaultValue="retention">
      <TabsList className="h-9 w-max min-w-full justify-start gap-1 bg-muted/50 mb-5">
        <TabsTrigger value="retention" className="text-xs px-3">
          {tx({ he: "שימור לקוחות", en: "Retention" }, language)}
        </TabsTrigger>
        <TabsTrigger value="playbook" className="text-xs px-3 gap-1">
          <ShieldAlert className="h-3 w-3" />
          {tx({ he: "ספר הנטישה", en: "Churn Playbook" }, language)}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="playbook">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <ChurnPlaybookTab result={result} />
        </Suspense>
      </TabsContent>

      <TabsContent value="retention">
    <div className="space-y-6">
      {/* Impact Summary */}
      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="flex flex-col sm:flex-row items-center gap-4 p-4">
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-accent">{retention.projectedImpact.projectedChurnReduction}%</div>
              <div className="text-xs text-muted-foreground">{tx({ he: "צמצום נטישה", en: "Churn Reduction" }, language)}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{retention.projectedImpact.ltvMultiplier}×</div>
              <div className="text-xs text-muted-foreground">LTV</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground flex-1" dir="auto">{retention.projectedImpact.additionalRevenue[language]}</p>
        </CardContent>
      </Card>

      {/* Churn Prediction */}
      <ChurnPredictionCard assessment={churnRisk} />

      {/* Onboarding Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            🚀 {tx({ he: `Onboarding (${retention.onboarding.type})`, en: `Onboarding (${retention.onboarding.type})` }, language)}
            <Badge variant="outline" className="text-xs">Time to Value: {retention.onboarding.timeToValue}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {retention.onboarding.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
              <div className="flex flex-col items-center shrink-0">
                <span className="text-lg">{step.emoji}</span>
                <Badge variant="outline" className="text-xs mt-1">{tx({ he: `יום ${step.day}`, en: `Day ${step.day}` }, language)}</Badge>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{step.name[language]}</span>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">{step.channel}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => copyText(step.template[language], i)} className="h-6 w-6 p-0 min-h-[44px] min-w-[44px]">
                      {copiedIdx === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-line" dir="auto">{step.template[language]}</p>
                <p className="text-xs text-primary mt-1">{tx({ he: "מטרה:", en: "Goal:" }, language)} {step.goal[language]}</p>
              </div>
            </div>
          ))}
          <p className="text-xs text-accent" dir="auto">{tx({ he: "מדד aha:", en: "Aha metric:" }, language)} {retention.onboarding.ahaMetric[language]}</p>
        </CardContent>
      </Card>

      {/* Churn Prevention */}
      <Collapsible>
        <Card className="border-destructive/10">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> {tx({ he: "מניעת נטישה", en: "Churn Prevention" }, language)}</span>
                <ChevronDown className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-2">
              {retention.churnPlaybook.signals.map((signal, i) => (
                <div key={i} className={`rounded-lg border p-2.5 ${signal.risk === "critical" ? "border-destructive/30 bg-destructive/5" : signal.risk === "high" ? "border-amber-500/20" : ""}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" dir="auto">{signal.signal[language]}</span>
                    <Badge variant={signal.risk === "critical" ? "destructive" : "outline"} className="text-xs">{signal.risk}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground" dir="auto">{signal.intervention[language]}</p>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs font-medium mb-2">{tx({ he: "הצעות שימור (Save Offers):", en: "Save Offers:" }, language)}</div>
                {retention.churnPlaybook.saveOffers.map((offer, i) => (
                  <div key={i} className="text-xs text-muted-foreground">• {offer[language]}</div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Referral Blueprint */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            {retention.referralBlueprint.label[language]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground" dir="auto">{retention.referralBlueprint.mechanics[language]}</p>
          <div className="flex items-center gap-2">
            <Badge>{tx({ he: "תגמול:", en: "Reward:" }, language)} {retention.referralBlueprint.reward[language]}</Badge>
            <Badge variant="outline">{retention.referralBlueprint.bestTiming[language]}</Badge>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{tx({ he: "תבנית WhatsApp:", en: "WhatsApp Template:" }, language)}</span>
              <Button size="sm" variant="ghost" onClick={() => copyText(retention.referralBlueprint.template[language], 50)} className="h-6 min-h-[44px] min-w-[44px]">
                {copiedIdx === 50 ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <p className="text-sm whitespace-pre-line" dir="auto">{retention.referralBlueprint.template[language]}</p>
          </div>
        </CardContent>
      </Card>

      {/* Growth Loop */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            {retention.growthLoop.label[language]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3" dir="auto">{retention.growthLoop.description[language]}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {retention.growthLoop.steps.map((step, i) => (
              <div key={i} className="rounded-lg border p-2 text-center text-xs" dir="auto">{step[language]}</div>
            ))}
          </div>
          <p className="text-xs text-primary mt-2">{retention.growthLoop.kFactor}</p>
        </CardContent>
      </Card>

      {/* Loyalty Strategy */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Heart className="h-4 w-4 text-pink-500" />
            {retention.loyaltyStrategy.label[language]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3" dir="auto">{retention.loyaltyStrategy.recommendation[language]}</p>
          {retention.loyaltyStrategy.tiers && (
            <div className="grid grid-cols-3 gap-2">
              {retention.loyaltyStrategy.tiers.map((tier, i) => (
                <div key={i} className="rounded-lg border p-2 text-center">
                  <div className="text-sm font-bold">{tier.name[language]}</div>
                  <div className="text-xs text-muted-foreground">{tier.threshold}</div>
                  <div className="text-xs text-accent mt-1">{tier.benefit[language]}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Retention Triggers */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2"><Gift className="h-4 w-4" /> {tx({ he: "נקודות מגע", en: "Retention Triggers" }, language)}</span>
                <ChevronDown className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-2">
              {retention.triggerMap.map((trigger, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-2.5">
                  <span className="text-lg">{trigger.emoji}</span>
                  <div className="flex-1">
                    <div className="text-xs font-medium">{trigger.trigger[language]}</div>
                    <div className="text-xs text-muted-foreground">{trigger.timing[language]} → {trigger.action[language]}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">{trigger.channel}</Badge>
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
      </TabsContent>
    </Tabs>
  );
};

export default RetentionGrowthTab;
