import { useMemo, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { FunnelResult } from "@/types/funnel";
import { generatePricingIntelligence } from "@/engine/pricingIntelligenceEngine";
import { buildUserKnowledgeGraph } from "@/engine/userKnowledgeGraph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tx } from "@/i18n/tx";
import { Copy, Check, ChevronDown, DollarSign, Layers, Shield, MessageSquare, BarChart3 } from "lucide-react";
import { toast } from "sonner";

interface Props { result: FunnelResult }

const PricingIntelligenceTab = ({ result }: Props) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const graph = useMemo(() => buildUserKnowledgeGraph(result.formData), [result.formData]);
  const pricing = useMemo(() => generatePricingIntelligence(result.formData, graph), [result.formData, graph]);

  const copyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success(tx({ he: "הועתק!", en: "Copied!" }, language));
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Pricing Model */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            {pricing.pricingModel.label[language]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3" dir="auto">{pricing.pricingModel.rationale[language]}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{tx({ he: "מדד ערך:", en: "Value metric:" }, language)} {pricing.pricingModel.valueMetric[language]}</Badge>
            <Badge>₪{pricing.pricingModel.recommendedRange.low}-₪{pricing.pricingModel.recommendedRange.high}</Badge>
            <Badge variant="outline">{tx({ he: "עיגון:", en: "Anchor:" }, language)} ₪{pricing.pricingModel.anchorPrice}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tier Structure */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            {tx({ he: "מבנה Tiers מומלץ", en: "Recommended Tier Structure" }, language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {pricing.tierStructure.tiers.map((tier, i) => (
              <div key={i} className={`rounded-xl border-2 p-4 text-center ${tier.isPrimary ? "border-primary bg-primary/5 relative" : tier.isDecoy ? "border-muted opacity-75" : "border-border"}`}>
                {tier.isPrimary && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs">
                    {tx({ he: "הכי פופולרי", en: "Most Popular" }, language)}
                  </Badge>
                )}
                <div className="text-sm font-medium mb-1">{tier.name[language]}</div>
                <div className="text-2xl font-bold text-foreground">₪{tier.price}</div>
                <div className="text-xs text-muted-foreground mb-2">
                  {tx({ he: "שנתי:", en: "Annual:" }, language)} ₪{tier.annualPrice} ({tier.annualDiscount}% {tx({ he: "הנחה", en: "off" }, language)})
                </div>
                <div className="text-xs text-muted-foreground text-start space-y-1">
                  {tier.features.map((f, j) => (
                    <div key={j}>✓ {f[language]}</div>
                  ))}
                </div>
                <div className="text-xs text-primary mt-2">{tier.targetSegment[language]}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Offer Stack (Hormozi) */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>🎁 {tx({ he: "Offer Stack (Hormozi)", en: "Offer Stack (Hormozi)" }, language)}</span>
                <ChevronDown className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-accent/5 border border-accent/20 p-3">
                <div className="text-xs text-accent font-medium">{tx({ he: "ערך נתפס", en: "Perceived Value" }, language)}: ₪{pricing.offerStack.totalPerceivedValue.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{tx({ he: "מחיר בפועל", en: "Actual Price" }, language)}: ₪{pricing.offerStack.actualPrice.toLocaleString()} ({pricing.offerStack.valueToPrice}×)</div>
              </div>
              {pricing.offerStack.bonuses.map((bonus, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-2.5">
                  <div>
                    <div className="text-xs font-medium">{bonus.name[language]}</div>
                    <div className="text-xs text-muted-foreground">{bonus.description[language]}</div>
                  </div>
                  <Badge variant="outline">₪{bonus.anchoredValue}</Badge>
                </div>
              ))}
              <div className="rounded-lg bg-muted/50 p-3 text-xs">
                <div className="font-medium mb-1">{tx({ he: "משוואת ערך (Hormozi)", en: "Value Equation (Hormozi)" }, language)}</div>
                <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                  <div>Dream Outcome: {pricing.offerStack.valueEquation.dreamOutcome}/10</div>
                  <div>Likelihood: {pricing.offerStack.valueEquation.perceivedLikelihood}/10</div>
                  <div>Time Delay: {pricing.offerStack.valueEquation.timeDelay}/10</div>
                  <div>Effort: {pricing.offerStack.valueEquation.effortSacrifice}/10</div>
                </div>
                <div className="font-bold mt-1">{tx({ he: "ציון", en: "Score" }, language)}: {pricing.offerStack.valueEquation.totalScore}</div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Guarantee */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            {pricing.guarantee.label[language]}
            <Badge variant="outline" className="text-xs">{tx({ he: "אמון:", en: "Trust:" }, language)} {pricing.guarantee.trustScore}/10</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-accent/5 rounded-lg p-3 flex items-start justify-between gap-2">
            <p className="text-sm" dir="auto">{pricing.guarantee.script[language]}</p>
            <Button size="sm" variant="ghost" onClick={() => copyText(pricing.guarantee.script[language], 99)} className="shrink-0">
              {copiedIdx === 99 ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Price Framing Scripts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            {tx({ he: "סקריפטי מסגור מחיר", en: "Price Framing Scripts" }, language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="landing_page">
            <div className="overflow-x-auto -mx-1 px-1">
              <TabsList className="h-8 w-max min-w-full justify-start gap-1 bg-muted/50">
                {pricing.priceFramingScripts.map((s) => (
                  <TabsTrigger key={s.context} value={s.context} className="text-xs px-2">{s.label[language]}</TabsTrigger>
                ))}
              </TabsList>
            </div>
            {pricing.priceFramingScripts.map((script, i) => (
              <TabsContent key={script.context} value={script.context} className="mt-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">{script.principle}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => copyText(script.script[language], i)} className="h-6 min-h-[44px]">
                      {copiedIdx === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-line" dir="auto">{script.script[language]}</p>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Subscription Economics (conditional) */}
      {pricing.subscriptionEconomics && (
        <Card className={`border-${pricing.subscriptionEconomics.health === "healthy" ? "accent" : "destructive"}/20`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {tx({ he: "כלכלת מנוי", en: "Subscription Economics" }, language)}
              <Badge variant={pricing.subscriptionEconomics.health === "healthy" ? "default" : "destructive"} className="text-xs">
                {pricing.subscriptionEconomics.health}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg font-bold">₪{pricing.subscriptionEconomics.projectedLTV.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">LTV</div>
              </div>
              <div>
                <div className="text-lg font-bold">₪{pricing.subscriptionEconomics.recommendedCAC.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">CAC {tx({ he: "מומלץ", en: "Target" }, language)}</div>
              </div>
              <div>
                <div className="text-lg font-bold">{pricing.subscriptionEconomics.ltvCacRatio}:1</div>
                <div className="text-xs text-muted-foreground">LTV:CAC</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2" dir="auto">{pricing.subscriptionEconomics.recommendation[language]}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PricingIntelligenceTab;
