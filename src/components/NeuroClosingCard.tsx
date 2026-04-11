import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Copy, Check, Shield, Zap } from "lucide-react";
import { toast } from "sonner";
import type { NeuroClosingStrategy } from "@/engine/neuroClosingEngine";

interface NeuroClosingCardProps {
  strategy: NeuroClosingStrategy;
}

export function NeuroClosingCard({ strategy }: NeuroClosingCardProps) {
  const { language } = useLanguage();
  const isHe = language === "he";
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [objectionsOpen, setObjectionsOpen] = useState(false);

  const copyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success(isHe ? "הועתק!" : "Copied!");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            {isHe ? "אסטרטגיית סגירה נוירו" : "Neuro-Closing Strategy"}
          </CardTitle>
          <Badge variant="outline" dir="auto">{strategy.closingStyle[language]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Objection Handlers */}
        <Collapsible open={objectionsOpen} onOpenChange={setObjectionsOpen}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md p-2 -mx-2 transition-colors">
              <span className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                {isHe ? "טיפול בהתנגדויות" : "Objection Handlers"}
                <Badge variant="outline" className="text-xs">{strategy.objectionHandlers.length}</Badge>
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${objectionsOpen ? "rotate-180" : ""}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 mt-2">
              {strategy.objectionHandlers.map((handler, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-medium text-destructive" dir="auto">
                      &ldquo;{handler.objection[language]}&rdquo;
                    </p>
                    <Badge variant="outline" className="text-xs shrink-0">{handler.technique}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground" dir="auto">{handler.response[language]}</p>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Price Presentation */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-sm font-medium mb-2" dir="auto">
            {isHe ? "הצגת מחיר" : "Price Presentation"}
          </p>
          <div className="space-y-1.5">
            <p className="text-xs" dir="auto">
              <span className="font-medium">{isHe ? "אסטרטגיה: " : "Strategy: "}</span>
              <span className="text-muted-foreground">{strategy.pricePresentation.strategy[language]}</span>
            </p>
            <p className="text-xs" dir="auto">
              <span className="font-medium">{isHe ? "עוגן: " : "Anchor: "}</span>
              <span className="text-muted-foreground">{strategy.pricePresentation.anchor[language]}</span>
            </p>
            <p className="text-xs" dir="auto">
              <span className="font-medium">{isHe ? "מסגור: " : "Framing: "}</span>
              <span className="text-muted-foreground">{strategy.pricePresentation.framing[language]}</span>
            </p>
          </div>
        </div>

        {/* Follow-Up Sequence */}
        <div>
          <p className="text-sm font-medium mb-2" dir="auto">
            {isHe ? "רצף מעקב" : "Follow-Up Sequence"}
          </p>
          <div className="space-y-2">
            {strategy.followUpSequence.map((step, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border p-2.5">
                <div className="flex flex-col items-center shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {isHe ? `יום ${step.day}` : `Day ${step.day}`}
                  </Badge>
                  <Badge variant="outline" className="text-xs mt-1">{step.channel}</Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" dir="auto">{step.action[language]}</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-line mt-0.5" dir="auto">
                    {step.template[language]}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => copyText(step.template[language], i)} className="h-6 w-6 p-0 min-h-[44px] min-w-[44px] shrink-0">
                  {copiedIdx === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Urgency + Trust in 2 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium mb-1.5" dir="auto">
              {isHe ? "טקטיקות דחיפות" : "Urgency Tactics"}
            </p>
            <ul className="space-y-1">
              {strategy.urgencyTactics.map((tactic, i) => (
                <li key={i} className="text-xs text-muted-foreground" dir="auto">• {tactic[language]}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium mb-1.5" dir="auto">
              {isHe ? "אותות אמון" : "Trust Signals"}
            </p>
            <ul className="space-y-1">
              {strategy.trustSignals.map((signal, i) => (
                <li key={i} className="text-xs text-muted-foreground" dir="auto">• {signal[language]}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
